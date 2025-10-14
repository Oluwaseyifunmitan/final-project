/**
 * @file Manages the application's data state, including user books and local storage interactions.
 */

/**
 * Enum for local storage keys.
 * @readonly
 * @enum {string}
 */
const STORAGE_KEYS = {
  USER_BOOKS: "userBooks",
  LAST_SEARCH_QUERY: "lastSearchQuery",
  LAST_SEARCH_RESULTS: "lastSearchResults",
  RECOMMENDATIONS_CACHE: "recommendationsCache",
};

/**
 * Global state object for user's books.
 * @type {Object}
 * @property {Array<Object>} currentlyReading - Books the user is currently reading.
 * @property {Array<Object>} wantToRead - Books the user wants to read.
 * @property {Array<Object>} readBooks - Books the user has finished reading.
 */
export let userBooks = {
  currentlyReading: [],
  wantToRead: [],
  readBooks: [],
};

/**
 * Cache for the last performed search results.
 * @type {Array<Object>}
 */
export let lastSearchResults = [];

/**
 * Cache for generated recommendations.
 * @type {Array<Object>}
 */
export let recommendationsCache = [];

/**
 * Saves data to local storage.
 * @param {string} key - The key under which to store the data.
 * @param {any} data - The data to store.
 */
const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving to local storage for key "${key}":`, e);
  }
};

/**
 * Retrieves data from local storage.
 * @param {string} key - The key of the data to retrieve.
 * @returns {any|null} The retrieved data, or null if not found or an error occurred.
 */
export const getFromLocalStorage = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error(`Error retrieving from local storage for key "${key}":`, e);
    return null;
  }
};

/**
 * Loads the application state from local storage into memory.
 */
export const loadAppState = () => {
  const storedBooks = getFromLocalStorage(STORAGE_KEYS.USER_BOOKS);
  if (storedBooks && typeof storedBooks === "object") {
    userBooks = {
      currentlyReading: storedBooks.currentlyReading || [],
      wantToRead: storedBooks.wantToRead || [],
      readBooks: storedBooks.readBooks || [],
    };
  }

  lastSearchResults = getFromLocalStorage(STORAGE_KEYS.LAST_SEARCH_RESULTS) || [];
  recommendationsCache = getFromLocalStorage(STORAGE_KEYS.RECOMMENDATIONS_CACHE) || [];
};

/**
 * Saves the current user's book lists to local storage.
 */
export const saveUserBooks = () => {
  saveToLocalStorage(STORAGE_KEYS.USER_BOOKS, userBooks);
};

/**
 * Saves the last search query to local storage.
 * @param {string} query - The last search query.
 */
export const saveLastSearchQuery = (query) => {
  if (typeof query === "string") {
    saveToLocalStorage(STORAGE_KEYS.LAST_SEARCH_QUERY, query);
  }
};

/**
 * Saves the last search results to local storage.
 * @param {Array<Object>} results - The array of book objects from the last search.
 */
export const saveLastSearchResults = (results) => {
  if (Array.isArray(results)) {
    lastSearchResults = results;
    saveToLocalStorage(STORAGE_KEYS.LAST_SEARCH_RESULTS, results);
  }
};

/**
 * Saves the generated recommendations to local storage.
 * @param {Array<Object>} recommendations - The array of recommended book objects.
 */
export const saveRecommendationsCache = (recommendations) => {
  if (Array.isArray(recommendations)) {
    recommendationsCache = recommendations;
    saveToLocalStorage(STORAGE_KEYS.RECOMMENDATIONS_CACHE, recommendations);
  }
};

/**
 * Adds a book to a specified user list.
 * @param {Object} book - The book object to add.
 * @param {string} listName - The name of the list ('currentlyReading', 'wantToRead', 'readBooks').
 * @returns {boolean} True if the book was added, false if it was already in a list.
 */
export const addBookToList = (book, listName) => {
  if (!book?.id || !userBooks[listName]) return false;

  const isAlreadyInAnyList = Object.values(userBooks).some((list) =>
    list.some((existingBook) => existingBook.id === book.id)
  );

  if (isAlreadyInAnyList) return false;

  userBooks[listName].push(book);
  saveUserBooks();
  return true;
};

/**
 * Removes a book from a specified user list.
 * @param {string} bookId - The ID of the book to remove.
 * @param {string} listName - The name of the list to remove from.
 * @returns {boolean} True if the book was removed, false otherwise.
 */
export const removeBookFromList = (bookId, listName) => {
  if (!bookId || !userBooks[listName]) return false;

  const initialLength = userBooks[listName].length;
  userBooks[listName] = userBooks[listName].filter((book) => book.id !== bookId);

  if (userBooks[listName].length < initialLength) {
    saveUserBooks();
    return true;
  }
  return false;
};

/**
 * Moves a book from its current list to a new list.
 * @param {string} bookId - The ID of the book to move.
 * @param {string|null} fromListName - The current list name.
 * @param {string} toListName - The target list name.
 * @returns {boolean} True if the book was moved, false otherwise.
 */
export const moveBookToList = (bookId, fromListName, toListName) => {
  if (!bookId || !userBooks[toListName]) return false;

  let bookToMove = null;

  if (fromListName && userBooks[fromListName]) {
    const index = userBooks[fromListName].findIndex((book) => book.id === bookId);
    if (index > -1) bookToMove = userBooks[fromListName].splice(index, 1)[0];
  } else {
    bookToMove =
      lastSearchResults.find((book) => book.id === bookId) ||
      recommendationsCache.find((book) => book.id === bookId) ||
      null;
  }

  if (!bookToMove) {
    console.warn(`Book with ID ${bookId} not found in any known list or cache.`);
    return false;
  }

  const isInTargetList = userBooks[toListName].some((book) => book.id === bookId);
  if (isInTargetList) {
    saveUserBooks();
    return true;
  }

  userBooks[toListName].push(bookToMove);
  saveUserBooks();
  return true;
};

/**
 * Retrieves a book object by ID.
 * @param {string} bookId - The ID of the book to find.
 * @returns {Object|null} The found book or null.
 */
export const getBookById = (bookId) => {
  if (!bookId) return null;

  for (const listName in userBooks) {
    const book = userBooks[listName].find((b) => b.id === bookId);
    if (book) return book;
  }

  return (
    lastSearchResults.find((b) => b.id === bookId) ||
    recommendationsCache.find((b) => b.id === bookId) ||
    null
  );
};

/**
 * Gets the list name a book currently belongs to.
 * @param {string} bookId - The ID of the book.
 * @returns {string|null} The list name or null.
 */
export const getBookListStatus = (bookId) => {
  for (const listName in userBooks) {
    if (userBooks[listName].some((b) => b.id === bookId)) {
      return listName;
    }
  }
  return null;
};

/**
 * Returns all book IDs currently stored in any of the user's lists.
 * @returns {Array<string>} Array of unique book IDs.
 */
export const getAllUserBookIds = () => {
  const allIds = new Set();
  Object.values(userBooks).forEach((list) => {
    list.forEach((book) => allIds.add(book.id));
  });
  return [...allIds];
};
