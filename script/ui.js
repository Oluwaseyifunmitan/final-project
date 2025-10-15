/**
 * @file Handles all User Interface (UI) related operations, including DOM manipulation.
 */

import { getOpenLibraryCover } from "./api.js";

/**
 * Centralized object for all DOM elements used by the application.
 * @type {Object}
 */
export const DOM = {
  searchForm: document.getElementById("search-form"),
  searchInput: document.getElementById("search-input"),
  searchResultsDiv: document.getElementById("search-results"),
  loadingSpinner: document.getElementById("loading-spinner"),
  initialSearchMessage: document.querySelector(
    "#search-section .initial-message"
  ),

  currentlyReadingList: document.getElementById("currently-reading-list"),
  wantToReadList: document.getElementById("want-to-read-list"),
  readBooksList: document.getElementById("read-books-list"),

  recommendationsList: document.getElementById("recommendations-list"),
  generateRecommendationsBtn: document.getElementById(
    "generate-recommendations-btn"
  ),
  initialRecommendationsMessage: document.querySelector(
    "#recommendations-section .initial-message"
  ),

  // Bootstrap modal instance
  bookDetailsModal: new bootstrap.Modal(
    document.getElementById("bookDetailsModal"),
    { backdrop: "static", keyboard: false }
  ),
  modalBody: document.getElementById("modal-body"),
  modalTitle: document.getElementById("bookDetailsModalLabel"),
  modalActionsContainer: document.getElementById("modal-actions"),
};

/**
 * Shows or hides the loading spinner in the search results area.
 * @param {boolean} show - True to show, false to hide.
 */
export const showLoadingSpinner = (show) => {
  if (show) {
    DOM.loadingSpinner.classList.remove("d-none");
    DOM.loadingSpinner.classList.add("d-flex"); // Bootstrap flex for spinner
    DOM.searchResultsDiv.classList.add("d-none"); // Hide previous results
    if (DOM.initialSearchMessage) {
      DOM.initialSearchMessage.classList.add("d-none"); // Hide initial message during loading
    }
  } else {
    DOM.loadingSpinner.classList.remove("d-flex");
    DOM.loadingSpinner.classList.add("d-none");
    // Do not show searchResultsDiv here, it will be handled by displaySearchResults
    // if there are results, or showInitialSearchMessage if no results/error.
  }
};

/**
 * Creates a single book card element for display.
 * This card has a flip effect for search results to reveal action buttons.
 * @param {Object} book - The book data object from Google Books API.
 * @param {boolean} inUserList - True if the book is in one of the user's lists.
 * @param {string|null} listName - The name of the list if in a user list (e.g., 'currentlyReading').
 * @param {Function} onAddToList - Callback for add-to-list actions (from search results).
 * @param {Function} onViewDetails - Callback for view-details action.
 * @returns {HTMLElement} The created book card element (a Bootstrap column div).
 */
export const createBookCard = (
  book,
  inUserList = false,
  listName = null,
  onAddToList = () => {},
  onViewDetails = () => {}
) => {
  const bookId = book.id;
  const title = book.volumeInfo.title || "No Title";
  const author = book.volumeInfo.authors
    ? book.volumeInfo.authors.join(", ")
    : "Unknown Author";
  //   const googleThumbnail = book.volumeInfo.imageLinks?.thumbnail;
  //   const openLibraryCover = getOpenLibraryCover(book.volumeInfo, "M"); // Use Open Library as fallback

  //   // Prioritize Google Books thumbnail, then Open Library, then placeholder
  //   const thumbnail =
  //     googleThumbnail ||
  //     openLibraryCover ||
  //     "https://via.placeholder.com/128x192?text=No+Cover";

  // Cover handling with HTTPS enforcement and fallback
  let googleThumbnail = null;
  if (book.volumeInfo.imageLinks) {
    googleThumbnail =
      book.volumeInfo.imageLinks.thumbnail ||
      book.volumeInfo.imageLinks.smallThumbnail;
  }
  const secureThumbnail = googleThumbnail
    ? googleThumbnail.replace("http://", "https://")
    : null;
  const openLibraryCover = getOpenLibraryCover(book.volumeInfo, "M");
  const thumbnail =
    secureThumbnail ||
    openLibraryCover ||
    "https://via.placeholder.com/128x192?text=No+Cover";

  const col = document.createElement("div");
  col.classList.add("col"); // Bootstrap grid column for responsiveness
  col.setAttribute("role", "listitem"); // Accessibility for lists

  // Book Item Container for Card Flip (visual wrapper)
  const bookCardContainer = document.createElement("div");
  bookCardContainer.classList.add("book-card-container"); // Custom CSS for perspective

  const bookItem = document.createElement("div");
  bookItem.classList.add("book-item", "card", "h-100"); // Bootstrap card styling
  bookItem.dataset.bookId = bookId;
  bookItem.dataset.title = title; // For easier debugging/access

  if (inUserList) {
    bookItem.classList.add("in-list");
  }

  // Front Face of the Card
  const bookFront = document.createElement("div");
  bookFront.classList.add(
    "book-face",
    "book-front",
    "card-body",
    "d-flex",
    "flex-column",
    "align-items-center",
    "justify-content-between",
    "text-center" // Added for consistent text alignment
  );
  bookFront.innerHTML = `
        <img src="${thumbnail}" alt="Cover for ${title}" class="book-cover-thumbnail img-fluid mb-2">
        <div class="w-100">
            <p class="book-title card-text fw-bold text-truncate mb-1" title="${title}">${title}</p>
            <p class="book-author card-text text-muted text-truncate" title="${author}">${author}</p>
            ${
              inUserList && listName
                ? `<span class="book-status badge bg-secondary mt-2">${
                    listName.charAt(0).toUpperCase() + listName.slice(1)
                  }</span>`
                : ""
            }
        </div>
    `;

  // Back Face of the Card (only for search results and recommendations)
  if (!inUserList) {
    const bookBack = document.createElement("div");
    bookBack.classList.add(
      "book-face",
      "book-back",
      "d-flex",
      "flex-column",
      "justify-content-center",
      "gap-2",
      "p-3" // Added padding for better button spacing
    );
    bookBack.innerHTML = `
            <p class="text-center fw-bold mb-3">Add to your lists!</p>
            <button class="btn btn-success btn-sm" data-action="add-currently-reading" aria-label="Add ${title} to currently reading">Currently Reading</button>
            <button class="btn btn-info btn-sm text-white" data-action="add-want-to-read" aria-label="Add ${title} to want to read">Want to Read</button>
            <button class="btn btn-primary btn-sm" data-action="add-read" aria-label="Add ${title} to read books">Read</button>
            <button class="btn btn-outline-secondary btn-sm mt-3" data-action="view-details" aria-label="View details for ${title}">Details</button>
        `;
    bookItem.appendChild(bookBack);

    // Event listeners for the back face buttons
    // Use event delegation for buttons on the back of the card
    bookBack.addEventListener("click", (e) => {
      const button = e.target.closest("button");
      if (button) {
        e.stopPropagation(); // Prevent card flip when clicking button
        const action = button.dataset.action;
        if (action && action.startsWith("add-")) {
          const list = action.replace("add-", "");
          onAddToList(book, list); // Use callback from app.js
          bookItem.classList.remove("flipped"); // Flip back after action
        } else if (action === "view-details") {
          onViewDetails(bookId); // Use callback from app.js
        }
      }
    });

    // Toggle flip on front face click
    bookFront.addEventListener("click", () => {
      bookItem.classList.toggle("flipped");
    });
  } else {
    // For books in user lists, clicking the card directly shows details
    bookItem.addEventListener("click", () => onViewDetails(bookId));
  }

  bookItem.prepend(bookFront); // Add front face first
  bookCardContainer.appendChild(bookItem);
  col.appendChild(bookCardContainer);

  return col;
};

/**
 * Displays search results in the dedicated search results div.
 * @param {Array<Object>} books - An array of book data to display.
 * @param {Array<string>} userBookIds - An array of IDs of books already in user lists.
 * @param {Function} onAddToList - Callback for adding a book to a list.
 * @param {Function} onViewDetails - Callback for viewing book details.
 */
export const displaySearchResults = (
  books,
  userBookIds,
  onAddToList,
  onViewDetails
) => {
  DOM.searchResultsDiv.innerHTML = "";
  DOM.searchResultsDiv.classList.remove("d-none"); // Ensure results div is visible
  if (DOM.initialSearchMessage) {
    DOM.initialSearchMessage.classList.add("d-none"); // Hide initial message
  }

  const filteredBooks = books.filter(
    (book) => book && book.id && !userBookIds.includes(book.id)
  );

  if (filteredBooks.length === 0) {
    const message =
      books.length === 0
        ? "No books found. Try a different search term."
        : "All found books are already in your lists!";
    DOM.searchResultsDiv.innerHTML = `<p class="initial-message text-muted text-center w-100 p-3">${message}</p>`;
    return;
  }

  filteredBooks.forEach((book) => {
    DOM.searchResultsDiv.appendChild(
      createBookCard(book, false, null, onAddToList, onViewDetails)
    );
  });
};

/**
 * Renders a specific user book list (Currently Reading, Want to Read, Read Books).
 * @param {HTMLElement} listElement - The parent DOM element (e.g., `currentlyReadingList`).
 * @param {Array<Object>} books - The array of book data for this list.
 * @param {string} listName - The name of the list (e.g., 'currentlyReading').
 * @param {Function} onViewDetails - Callback for viewing book details.
 */
export const renderUserList = (listElement, books, listName, onViewDetails) => {
  listElement.innerHTML = ""; // Clear existing content
  listElement.classList.remove("d-none"); // Ensure the list element is visible

  if (books.length === 0) {
    listElement.innerHTML = `<p class="text-muted text-center w-100 initial-message p-3">No books here yet. Add some!</p>`;
    return;
  }

  books.forEach((book) => {
    // For user lists, books are marked as 'inUserList = true' and the listName is provided
    listElement.appendChild(
      createBookCard(book, true, listName, null, onViewDetails)
    );
  });
};

/**
 * Populates and displays the book details modal.
 * @param {Object} book - The book data object.
 * @param {string|null} currentListName - The name of the list the book is currently in (if any).
 * @param {Function} onMoveToList - Callback for moving the book to a different list.
 * @param {Function} onRemoveFromList - Callback for removing the book from a list.
 */
export const showBookDetailsModal = (
  book,
  currentListName,
  onMoveToList,
  onRemoveFromList
) => {
  DOM.modalTitle.textContent = book.volumeInfo.title || "Book Details";
  const author = book.volumeInfo.authors
    ? book.volumeInfo.authors.join(", ")
    : "Unknown Author";
  const publishedDate = book.volumeInfo.publishedDate || "N/A";
  const publisher = book.volumeInfo.publisher || "N/A";
  const description =
    book.volumeInfo.description || "No description available.";
  const pageCount = book.volumeInfo.pageCount
    ? `${book.volumeInfo.pageCount} pages`
    : "N/A";
  const categories = book.volumeInfo.categories
    ? book.volumeInfo.categories.join(", ")
    : "N/A";
  const averageRating = book.volumeInfo.averageRating
    ? `${book.volumeInfo.averageRating} / 5`
    : "N/A";
  const ratingsCount = book.volumeInfo.ratingsCount
    ? `(${book.volumeInfo.ratingsCount} ratings)`
    : "";
  const googleBooksLink = book.volumeInfo.infoLink || "#";
  const previewLink = book.volumeInfo.previewLink || "#";

  const googleCover =
    book.volumeInfo.imageLinks?.large || book.volumeInfo.imageLinks?.thumbnail;
  const openLibraryCover = getOpenLibraryCover(book.volumeInfo, "L"); // Large cover for modal

  const coverImage =
    googleCover ||
    openLibraryCover ||
    "https://via.placeholder.com/200x300?text=No+Cover";

  // Corrected and completed industryIdentifiers processing
  const industryIdentifiers = book.volumeInfo.industryIdentifiers
    ? book.volumeInfo.industryIdentifiers
        .map((id) => `${id.type}: ${id.identifier}`)
        .join("<br>")
    : "N/A";

  DOM.modalBody.innerHTML = `
        <div class="row align-items-start">
            <div class="col-md-4 text-center mb-3 mb-md-0">
                <img src="${coverImage}" alt="Cover for ${
    book.volumeInfo.title
  }" class="cover-image img-fluid rounded mb-3">
                <p class="text-muted small mb-2">${averageRating} ${ratingsCount}</p>
                <div class="d-flex flex-column gap-2">
                    <a href="${googleBooksLink}" target="_blank" class="btn btn-outline-secondary btn-sm" rel="noopener noreferrer">View on Google Books</a>
                    ${
                      previewLink && previewLink !== "#"
                        ? `<a href="${previewLink}" target="_blank" class="btn btn-outline-info btn-sm" rel="noopener noreferrer">Preview Book</a>`
                        : ""
                    }
                </div>
            </div>
            <div class="col-md-8 details-text">
                <h3 class="mb-2">${book.volumeInfo.title || "No Title"}</h3>
                <p class="lead text-muted mb-3">${author}</p>
                <hr>
                <p><strong>Publisher:</strong> ${publisher}</p>
                <p><strong>Published Date:</strong> ${publishedDate}</p>
                <p><strong>Pages:</strong> ${pageCount}</p>
                <p><strong>Categories:</strong> ${categories}</p>
                <p><strong>Identifiers:</strong><br>${industryIdentifiers}</p>
                <div class="description">${description}</div>
            </div>
        </div>
    `;

  // Clear previous actions
  DOM.modalActionsContainer.innerHTML = "";

  const lists = [
    {
      name: "currentlyReading",
      label: "Currently Reading",
      btnClass: "btn-success",
    },
    {
      name: "wantToRead",
      label: "Want to Read",
      btnClass: "btn-info text-white", // This was the problematic string
    },
    { name: "readBooks", label: "Read Books", btnClass: "btn-primary" },
  ];

  if (!currentListName) {
    // Book is not in any list, provide 'Add to' options
    lists.forEach((list) => {
      const button = document.createElement("button");
      button.classList.add("btn", ...list.btnClass.split(" "), "me-2", "mb-2"); // FIX IS HERE
      button.textContent = `Add to ${list.label}`;
      button.addEventListener("click", () => {
        onMoveToList(book.id, null, list.name); // fromListName is null
        DOM.bookDetailsModal.hide(); // Hide modal after action
      });
      DOM.modalActionsContainer.appendChild(button);
    });
  } else {
    // Book is already in a list, provide 'Move to' options
    lists.forEach((list) => {
      if (list.name !== currentListName) {
        const button = document.createElement("button");
        button.classList.add(
          "btn",
          ...list.btnClass.split(" "),
          "me-2",
          "mb-2"
        ); // FIX IS HERE
        button.textContent = `Move to ${list.label}`;
        button.addEventListener("click", () => {
          onMoveToList(book.id, currentListName, list.name);
          DOM.bookDetailsModal.hide(); // Hide modal after action
        });
        DOM.modalActionsContainer.appendChild(button);
      }
    });

    // Add "Remove from list" button if the book is in a list
    const removeButton = document.createElement("button");
    removeButton.classList.add("btn", "btn-danger", "mb-2");
    removeButton.textContent = `Remove from ${
      currentListName.charAt(0).toUpperCase() +
      currentListName.slice(1).replace("Books", " Books")
    }`; // Correct 'readBooks' to 'Read Books'
    removeButton.addEventListener("click", () => {
      onRemoveFromList(book.id, currentListName);
      DOM.bookDetailsModal.hide(); // Hide modal after action
    });
    DOM.modalActionsContainer.appendChild(removeButton);
  }

  DOM.bookDetailsModal.show();
};

/**
 * Displays recommendations in the dedicated recommendations div.
 * @param {Array<Object>} recommendedBooks - An array of recommended book data.
 * @param {Array<string>} userBookIds - An array of IDs of books already in user lists.
 * @param {Function} onAddToList - Callback for adding a book to a list.
 * @param {Function} onViewDetails - Callback for viewing book details.
 */
export const displayRecommendations = (
  recommendedBooks,
  userBookIds,
  onAddToList,
  onViewDetails
) => {
  DOM.recommendationsList.innerHTML = "";
  DOM.recommendationsList.classList.remove("d-none"); // Ensure recommendations list is visible

  if (DOM.initialRecommendationsMessage) {
    DOM.initialRecommendationsMessage.classList.add("d-none");
  }

  const filteredRecommendations = recommendedBooks.filter(
    (book) => book && book.id && !userBookIds.includes(book.id)
  );

  if (filteredRecommendations.length === 0) {
    const message =
      recommendedBooks.length === 0
        ? "No recommendations found. Read more books to get better suggestions!"
        : "All recommended books are already in your lists!";
    DOM.recommendationsList.innerHTML = `<p class="initial-message text-muted text-center w-100 p-3">${message}</p>`;
    return;
  }

  filteredRecommendations.forEach((book) => {
    // Recommendations are displayed like search results, with action buttons
    DOM.recommendationsList.appendChild(
      createBookCard(book, false, null, onAddToList, onViewDetails)
    );
  });
};

/**
 * Shows or hides the initial message in the search section.
 * @param {boolean} show - True to show, false to hide.
 */
export const showInitialSearchMessage = (show) => {
  if (DOM.initialSearchMessage) {
    if (show) {
      DOM.initialSearchMessage.classList.remove("d-none");
      DOM.initialSearchMessage.classList.add("d-block");
      DOM.searchResultsDiv.classList.add("d-none"); // Ensure search results are hidden
    } else {
      DOM.initialSearchMessage.classList.remove("d-block");
      DOM.initialSearchMessage.classList.add("d-none");
    }
  }
};

/**
 * Shows or hides the initial message in the recommendations section.
 * @param {boolean} show - True to show, false to hide.
 */
export const showInitialRecommendationsMessage = (show) => {
  if (DOM.initialRecommendationsMessage) {
    if (show) {
      DOM.initialRecommendationsMessage.classList.remove("d-none");
      DOM.initialRecommendationsMessage.classList.add("d-block");
      DOM.recommendationsList.classList.add("d-none"); // Ensure recommendations are hidden
    } else {
      DOM.initialRecommendationsMessage.classList.remove("d-block");
      DOM.initialRecommendationsMessage.classList.add("d-none");
    }
  }
};

/**
 * Updates all user lists in the UI.
 * @param {Object} userBooksData - The user's entire book collection, categorized by list.
 * @param {Function} onViewDetails - Callback for viewing book details.
 */
export const updateAllUserListsUI = (userBooksData, onViewDetails) => {
  renderUserList(
    DOM.currentlyReadingList,
    userBooksData.currentlyReading || [], // Ensure it's an array
    "currentlyReading",
    onViewDetails
  );
  renderUserList(
    DOM.wantToReadList,
    userBooksData.wantToRead || [], // Ensure it's an array
    "wantToRead",
    onViewDetails
  );
  renderUserList(
    DOM.readBooksList,
    userBooksData.readBooks || [], // Ensure it's an array
    "readBooks",
    onViewDetails
  );
};
