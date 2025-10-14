/**
 * @file Handles generating personalized book recommendations
 * based on user's reading history (genres, authors, and keywords).
 */

import { fetchBooks } from "./api.js";
import {
  userBooks,
  saveRecommendationsCache,
  getAllUserBookIds,
} from "./data.js";
import { displayRecommendations, DOM } from "./ui.js";

/**
 * Generates personalized book recommendations based on the genres, authors,
 * and title/description keywords of the user's read books.
 * Pulls data from the Google Books API.
 */
export const generateRecommendations = async () => {
  // Defensive DOM checks
  if (!DOM?.recommendationsList) return;

  // Clear existing recommendations immediately
  DOM.recommendationsList.innerHTML = "";
  if (DOM.initialRecommendationsMessage) {
    DOM.initialRecommendationsMessage.classList.add("d-none");
  }

  // Show a recommendation-specific loading spinner
  const spinnerHtml = `
    <div class="d-flex justify-content-center align-items-center py-4 flex-column text-center">
      <div class="spinner-border text-primary mb-3" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="text-muted mb-0">Generating recommendations based on your reading history...</p>
    </div>`;
  DOM.recommendationsList.innerHTML = spinnerHtml;

  // Containers for inferred preferences
  const readGenres = new Set();
  const readAuthors = new Set();
  const readKeywords = new Set();

  // Extract reading patterns from user's read books
  userBooks.readBooks.forEach((book) => {
    const info = book.volumeInfo || {};

    // Genres
    if (Array.isArray(info.categories)) {
      info.categories.forEach((cat) => readGenres.add(cat));
    }

    // Authors
    if (Array.isArray(info.authors)) {
      info.authors.forEach((auth) => readAuthors.add(auth));
    }

    // Extract meaningful keywords from title + description
    const processText = (text) => {
      if (!text) return;
      text
        .toLowerCase()
        .split(/\W+/)
        .filter(
          (word) =>
            word.length > 3 &&
            ![
              "the",
              "and",
              "for",
              "with",
              "from",
              "book",
              "story",
              "this",
              "that",
              "your",
              "have",
              "been",
              "will",
              "they",
              "their",
              "into",
              "some",
              "each",
              "such",
              "many",
              "more",
              "than",
              "then",
              "also",
              "just",
              "about",
              "when",
              "what",
              "where",
              "which",
              "why",
              "how",
              "there",
              "them",
              "these",
              "those",
              "our",
              "out",
              "you",
              "one",
              "two",
              "three",
              "said",
            ].includes(word)
        )
        .forEach((word) => readKeywords.add(word));
    };

    processText(info.title);
    processText(info.description);
  });

  let recommendedBooks = [];
  const searchPromises = [];

  // Build search requests — prioritizing genres and authors
  const topGenres = Array.from(readGenres).slice(0, 3);
  const topAuthors = Array.from(readAuthors).slice(0, 2);
  const topKeywords = Array.from(readKeywords).slice(0, 3);

  if (topGenres.length > 0) {
    topGenres.forEach((genre) =>
      searchPromises.push(fetchBooks(`subject:${genre}`).catch(() => []))
    );
  }

  if (topAuthors.length > 0) {
    topAuthors.forEach((author) =>
      searchPromises.push(fetchBooks(`inauthor:${author}`).catch(() => []))
    );
  }

  // Add broader keyword search to increase diversity
  if (topKeywords.length > 0) {
    searchPromises.push(fetchBooks(topKeywords.join(" ")).catch(() => []));
  }

  // If user has no read books or no info, fallback to general suggestion
  if (searchPromises.length === 0) {
    searchPromises.push(fetchBooks("bestsellers fiction").catch(() => []));
  }

  try {
    // Await all parallel API requests
    const resultsArrays = await Promise.all(searchPromises);

    // Flatten and combine
    resultsArrays.forEach((resultSet) => {
      if (Array.isArray(resultSet)) {
        recommendedBooks.push(...resultSet);
      }
    });

    // Filter duplicates and user-owned books
    const uniqueBooks = [];
    const seenBookIds = new Set();
    const userBookIds = getAllUserBookIds();

    recommendedBooks.forEach((book) => {
      const id = book?.id;
      const info = book?.volumeInfo;
      if (
        id &&
        info &&
        !seenBookIds.has(id) &&
        !userBookIds.includes(id) &&
        (info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail)
      ) {
        uniqueBooks.push(book);
        seenBookIds.add(id);
      }
    });

    // Sort results — prioritize higher-rated and more-reviewed titles
    const finalRecommendations = uniqueBooks
      .sort((a, b) => {
        const ratingA = a.volumeInfo.averageRating || 0;
        const ratingB = b.volumeInfo.averageRating || 0;
        const countA = a.volumeInfo.ratingsCount || 0;
        const countB = b.volumeInfo.ratingsCount || 0;
        if (ratingB !== ratingA) return ratingB - ratingA;
        return countB - countA;
      })
      .slice(0, 10); // Keep top 10

    // Cache + display
    saveRecommendationsCache(finalRecommendations);
    displayRecommendations(finalRecommendations);

    // Provide subtle UI feedback
    if (finalRecommendations.length === 0) {
      DOM.recommendationsList.innerHTML = `
        <p class="text-center text-muted py-4">
          No suitable recommendations found. Try reading more books to improve suggestions!
        </p>`;
    }
  } catch (error) {
    console.error("Error generating recommendations:", error);
    DOM.recommendationsList.innerHTML = `
      <p class="alert alert-danger text-center w-100" role="alert">
        Failed to generate recommendations. Please try again later.
      </p>`;
  }
};
