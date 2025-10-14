/**
 * @file Handles all external API interactions for fetching book data.
 * Uses Google Books API for search and details, and Open Library for cover images.
 */

// ⚠️ REPLACE WITH YOUR ACTUAL GOOGLE BOOKS API KEY BEFORE DEPLOYMENT
const GOOGLE_BOOKS_API_KEY = "AIzaSyAM0pGZ84wLosqjS0WhwwrRrVPW_cMeQ_Y";

/**
 * Fetches books from the Google Books API based on a search query.
 * @param {string} query - The search term (e.g., title, author, ISBN).
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of book items.
 * @throws {Error} If the API request fails.
 */
export const fetchBooks = async (query) => {
  if (!query || typeof query !== "string") {
    throw new Error("Invalid search query provided.");
  }

  try {
    const endpoint = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      query
    )}&maxResults=40&key=${GOOGLE_BOOKS_API_KEY}`;

    const response = await fetch(endpoint);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Google Books API search failed: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch (error) {
    console.error(
      "Error fetching books from Google Books API (search):",
      error
    );
    throw error;
  }
};

/**
 * Fetches detailed information for a single book from the Google Books API.
 * @param {string} bookId - The unique ID of the book provided by Google Books.
 * @returns {Promise<Object|null>} A promise that resolves to the book details object, or null if not found.
 * @throws {Error} If the API request fails.
 */
export const fetchBookDetails = async (bookId) => {
  if (!bookId || typeof bookId !== "string") {
    throw new Error("Invalid book ID provided.");
  }

  try {
    const endpoint = `https://www.googleapis.com/books/v1/volumes/${bookId}?key=${GOOGLE_BOOKS_API_KEY}`;
    const response = await fetch(endpoint);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Google Books API details failed: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();
    return data && data.volumeInfo ? data : null;
  } catch (error) {
    console.error(
      "Error fetching book details from Google Books API (details):",
      error
    );
    throw error;
  }
};

/**
 * Generates an Open Library cover image URL for a given book.
 * Attempts to find an ISBN or OCLC identifier in the book data.
 * @param {Object} volumeInfo - The volumeInfo object from a Google Books API response.
 * @param {string} [size='M'] - The desired cover size ('S', 'M', or 'L').
 * @returns {string|null} The URL to the Open Library cover image, or null if no identifier is found.
 */
export const getOpenLibraryCover = (volumeInfo, size = "M") => {
  if (!volumeInfo || !Array.isArray(volumeInfo.industryIdentifiers)) {
    return null;
  }

  let isbn13 = null;
  let isbn10 = null;
  let oclc = null;

  for (const id of volumeInfo.industryIdentifiers) {
    if (id.type === "ISBN_13") isbn13 = id.identifier;
    else if (id.type === "ISBN_10") isbn10 = id.identifier;
    else if (id.type === "OTHER" && id.identifier?.startsWith("OCLC"))
      oclc = id.identifier.replace("OCLC:", "");
  }

  // Priority: ISBN_13 → ISBN_10 → OCLC
  if (isbn13)
    return `https://covers.openlibrary.org/b/isbn/${isbn13}-${size}.jpg`;
  if (isbn10)
    return `https://covers.openlibrary.org/b/isbn/${isbn10}-${size}.jpg`;
  if (oclc) return `https://covers.openlibrary.org/b/oclc/${oclc}-${size}.jpg`;

  return null;
};
