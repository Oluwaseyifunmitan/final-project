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
  // 1. Load application state from local storage
  data.loadAppState();

  // 2. Render initial UI based on loaded data
  ui.updateAllUserListsUI(data.userBooks, handleViewDetails);

  // Set search input value if a query was saved
  const lastSearchQuery = data.getFromLocalStorage("lastSearchQuery"); // Access directly as it's not exposed by data.js
  if (lastSearchQuery) {
    ui.DOM.searchInput.value = lastSearchQuery;
  }

  // Display search results if cached, otherwise show initial message
  if (data.lastSearchResults.length > 0) {
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

  // Display recommendations if cached, otherwise show initial message
  if (data.recommendationsCache.length > 0) {
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

  // 3. Set up Event Listeners
  setupEventListeners();
};

/**
 * Sets up all global event listeners for UI interactions.
 */
const setupEventListeners = () => {
  ui.DOM.searchForm.addEventListener("submit", handleSearchSubmit);
  ui.DOM.generateRecommendationsBtn.addEventListener(
    "click",
    handleGenerateRecommendations
  );

  // Bootstrap modal events (these are handled by Bootstrap's JS directly,
  // but we might want custom logic on hide/show if needed)
  document
    .getElementById("bookDetailsModal")
    .addEventListener("hidden.bs.modal", () => {
      // Logic to run after modal is completely hidden
      console.log("Book details modal closed.");
      // Re-render lists and search results to reflect any changes made in modal
      ui.updateAllUserListsUI(data.userBooks, handleViewDetails);
      ui.displaySearchResults(
        data.lastSearchResults,
        data.getAllUserBookIds(),
        handleAddToList,
        handleViewDetails
      );
      // If a book was added/moved to 'readBooks', recommendations might need updating
      // This is handled by handleMoveToList/handleAddToList if a book goes into 'readBooks'
    });
};

/**
 * Handles the search form submission.
 * @param {Event} e - The submit event object.
 */
const handleSearchSubmit = async (e) => {
  e.preventDefault();
  const query = ui.DOM.searchInput.value.trim();
  if (query) {
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
    } catch (error) {
      console.error("Search failed:", error);
      ui.DOM.searchResultsDiv.innerHTML = `<p class="alert alert-danger text-center w-100" role="alert">Error searching for books. Please try again later.</p>`;
    } finally {
      ui.showLoadingSpinner(false);
    }
  } else {
    ui.DOM.searchResultsDiv.innerHTML = `<p class="initial-message text-muted text-center w-100 p-3">Please enter a book title or author to search.</p>`;
    ui.showInitialSearchMessage(true);
  }
};

/**
 * Handles the event for adding a book to a user list.
 * This function is passed as a callback to `createBookCard` and `displayRecommendations`.
 * @param {Object} book - The book object to add.
 * @param {string} listName - The name of the target list.
 */
const handleAddToList = (book, listName) => {
  const wasAdded = data.addBookToList(book, listName);
  if (!wasAdded) {
    alert("This book is already in one of your lists!");
  } else {
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
  }
};

/**
 * Handles the event for viewing book details in the modal.
 * This function is passed as a callback to `createBookCard` and `renderUserList`.
 * @param {string} bookId - The ID of the book to display details for.
 */
const handleViewDetails = async (bookId) => {
  ui.DOM.modalBody.innerHTML = `<p class="text-center text-muted"><div class="spinner-border text-primary spinner-border-sm me-2" role="status"></div>Loading book details...</p>`;
  ui.DOM.bookDetailsModal.show(); // Show modal immediately with loading message

  try {
    const book = await api.fetchBookDetails(bookId);
    if (book) {
      const currentListName = data.getBookListStatus(bookId);
      ui.showBookDetailsModal(
        book,
        currentListName,
        handleMoveToList,
        handleRemoveFromList
      );
    } else {
      ui.DOM.modalBody.innerHTML = `<p class="alert alert-danger text-center w-100" role="alert">Could not load book details.</p>`;
    }
  } catch (error) {
    console.error("Failed to fetch book details:", error);
    ui.DOM.modalBody.innerHTML = `<p class="alert alert-danger text-center w-100" role="alert">Error loading book details. Please check your connection.</p>`;
  }
};

/**
 * Handles moving a book between lists from the details modal.
 * @param {string} bookId - The ID of the book to move.
 * @param {string|null} fromListName - The name of the list the book is currently in (null if new).
 * @param {string} toListName - The name of the target list.
 */
const handleMoveToList = (bookId, fromListName, toListName) => {
  const moved = data.moveBookToList(bookId, fromListName, toListName);
  if (moved) {
    ui.updateAllUserListsUI(data.userBooks, handleViewDetails);
    ui.displaySearchResults(
      data.lastSearchResults,
      data.getAllUserBookIds(),
      handleAddToList,
      handleViewDetails
    );
    if (toListName === "readBooks" || fromListName === "readBooks") {
      recommendations.generateRecommendations(); // Re-generate if 'read' list changed
    }
  } else {
    alert("Failed to move book. It might already be in the target list.");
  }
};

/**
 * Handles removing a book from a list from the details modal.
 * @param {string} bookId - The ID of the book to remove.
 * @param {string} listName - The name of the list to remove from.
 */
const handleRemoveFromList = (bookId, listName) => {
  const removed = data.removeBookFromList(bookId, listName);
  if (removed) {
    ui.updateAllUserListsUI(data.userBooks, handleViewDetails);
    ui.displaySearchResults(
      data.lastSearchResults,
      data.getAllUserBookIds(),
      handleAddToList,
      handleViewDetails
    );
    if (listName === "readBooks") {
      recommendations.generateRecommendations(); // Re-generate if 'read' list changed
    }
  } else {
    alert("Failed to remove book.");
  }
};

/**
 * Handles the request to generate new recommendations.
 */
const handleGenerateRecommendations = () => {
  recommendations.generateRecommendations();
};

// Initialize the application when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", initializeApp);
