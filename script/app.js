/**
 * @file Main application logic for the Advanced Book Tracker.
 * Orchestrates interactions between UI, data, API, and recommendation modules.
 */

import * as api from "./api.js";
import * as ui from "./ui.js";
import * as data from "./data.js";
import * as recommendations from "./recommendations.js";

/**
 * Initializes the application by loading state, rendering UI, and setting up event listeners.
 */
const initializeApp = () => {
  try {
    // 1️⃣ Load application state from local storage
    data.loadAppState();

    // 2️⃣ Render initial UI based on loaded data
    ui.updateAllUserListsUI(data.userBooks, handleViewDetails);

    // Restore last search query if saved
    const lastSearchQuery = data.getFromLocalStorage("lastSearchQuery");
    if (lastSearchQuery && ui.DOM.searchInput) {
      ui.DOM.searchInput.value = lastSearchQuery;
    }

    // Display cached search results or initial placeholder
    if (
      Array.isArray(data.lastSearchResults) &&
      data.lastSearchResults.length > 0
    ) {
      ui.displaySearchResults(
        data.lastSearchResults,
        data.getAllUserBookIds(),
        handleAddToList,
        handleViewDetails
      );
      ui.showInitialSearchMessage(false);
    } else {
      ui.showInitialSearchMessage(true);
    }

    // Display cached recommendations or initial placeholder
    if (
      Array.isArray(data.recommendationsCache) &&
      data.recommendationsCache.length > 0
    ) {
      ui.displayRecommendations(
        data.recommendationsCache,
        data.getAllUserBookIds(),
        handleAddToList,
        handleViewDetails
      );
      ui.showInitialRecommendationsMessage(false);
    } else {
      ui.showInitialRecommendationsMessage(true);
    }

    // 3️⃣ Set up global event listeners
    setupEventListeners();
  } catch (err) {
    console.error("Initialization failed:", err);
    alert("Something went wrong while loading the app. Please refresh.");
  }
};

/**
 * Sets up all global event listeners for UI interactions.
 */
const setupEventListeners = () => {
  if (ui.DOM.searchForm) {
    ui.DOM.searchForm.addEventListener("submit", handleSearchSubmit);
  }

  if (ui.DOM.generateRecommendationsBtn) {
    ui.DOM.generateRecommendationsBtn.addEventListener(
      "click",
      handleGenerateRecommendations
    );
  }

  const modalElement = document.getElementById("bookDetailsModal");
  if (modalElement) {
    modalElement.addEventListener("hidden.bs.modal", () => {
      console.log("Book details modal closed.");
      ui.updateAllUserListsUI(data.userBooks, handleViewDetails);
      ui.displaySearchResults(
        data.lastSearchResults,
        data.getAllUserBookIds(),
        handleAddToList,
        handleViewDetails
      );
    });
  }
};

/**
 * Handles the search form submission.
 * @param {Event} e - The submit event object.
 */
const handleSearchSubmit = async (e) => {
  e.preventDefault();

  const query = ui.DOM.searchInput?.value.trim();
  if (!query) {
    ui.DOM.searchResultsDiv.innerHTML = `
      <p class="initial-message text-muted text-center w-100 p-3">
        Please enter a book title or author to search.
      </p>`;
    ui.showInitialSearchMessage(true);
    return;
  }

  ui.showLoadingSpinner(true);
  try {
    const books = await api.fetchBooks(query);
    data.saveLastSearchResults(books);
    data.saveLastSearchQuery(query);

    ui.displaySearchResults(
      books,
      data.getAllUserBookIds(),
      handleAddToList,
      handleViewDetails
    );
    ui.showInitialSearchMessage(false);
  } catch (error) {
    console.error("Search failed:", error);
    ui.DOM.searchResultsDiv.innerHTML = `
      <p class="alert alert-danger text-center w-100" role="alert">
        Error searching for books. Please try again later.
      </p>`;
  } finally {
    ui.showLoadingSpinner(false);
  }
};

/**
 * Handles the event for adding a book to a user list.
 * @param {Object} book - The book object to add.
 * @param {string} listName - The name of the target list.
 */
const handleAddToList = (book, listName) => {
  if (!book || !listName) return;

  const wasAdded = data.addBookToList(book, listName);
  if (!wasAdded) {
    alert("This book is already in one of your lists!");
    return;
  }

  ui.updateAllUserListsUI(data.userBooks, handleViewDetails);
  ui.displaySearchResults(
    data.lastSearchResults,
    data.getAllUserBookIds(),
    handleAddToList,
    handleViewDetails
  );

  if (listName === "readBooks") {
    recommendations.generateRecommendations();
  }
};

/**
 * Handles the event for viewing book details in the modal.
 * @param {string} bookId - The ID of the book to display details for.
 */
const handleViewDetails = async (bookId) => {
  if (!bookId) return;

  ui.DOM.modalBody.innerHTML = `
    <p class="text-center text-muted">
      <div class="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
      Loading book details...
    </p>`;
  ui.DOM.bookDetailsModal.show();

  try {
    const book = await api.fetchBookDetails(bookId);
    if (!book) {
      ui.DOM.modalBody.innerHTML = `
        <p class="alert alert-danger text-center w-100" role="alert">
          Could not load book details.
        </p>`;
      return;
    }

    const currentListName = data.getBookListStatus(bookId);
    ui.showBookDetailsModal(
      book,
      currentListName,
      handleMoveToList,
      handleRemoveFromList
    );
  } catch (error) {
    console.error("Failed to fetch book details:", error);
    ui.DOM.modalBody.innerHTML = `
      <p class="alert alert-danger text-center w-100" role="alert">
        Error loading book details. Please check your connection.
      </p>`;
  }
};

/**
 * Handles moving a book between lists.
 */
const handleMoveToList = (bookId, fromListName, toListName) => {
  const moved = data.moveBookToList(bookId, fromListName, toListName);
  if (!moved) {
    alert("Failed to move book. It might already be in the target list.");
    return;
  }

  ui.updateAllUserListsUI(data.userBooks, handleViewDetails);
  ui.displaySearchResults(
    data.lastSearchResults,
    data.getAllUserBookIds(),
    handleAddToList,
    handleViewDetails
  );

  if (toListName === "readBooks" || fromListName === "readBooks") {
    recommendations.generateRecommendations();
  }
};

/**
 * Handles removing a book from a list.
 */
const handleRemoveFromList = (bookId, listName) => {
  const removed = data.removeBookFromList(bookId, listName);
  if (!removed) {
    alert("Failed to remove book.");
    return;
  }

  ui.updateAllUserListsUI(data.userBooks, handleViewDetails);
  ui.displaySearchResults(
    data.lastSearchResults,
    data.getAllUserBookIds(),
    handleAddToList,
    handleViewDetails
  );

  if (listName === "readBooks") {
    recommendations.generateRecommendations();
  }
};

/**
 * Handles generating new recommendations manually.
 */
const handleGenerateRecommendations = () => {
  recommendations.generateRecommendations();
};

// Initialize the app
document.addEventListener("DOMContentLoaded", initializeApp);
