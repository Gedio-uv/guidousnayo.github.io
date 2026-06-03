/**
 * images.js — Unsplash API integration
 * Fetches contextual images for German words.
 */

const UNSPLASH_BASE = 'https://api.unsplash.com';
const CACHE = new Map(); // Simple in-memory cache

/**
 * Fetch a contextual image URL from Unsplash for a given query.
 * @param {string} query - English search term (e.g. "dog", "house")
 * @param {string} apiKey - Unsplash Access Key
 * @returns {Promise<string|null>} - Image URL or null on failure
 */
export async function fetchImage(query, apiKey) {
  if (!apiKey) return null;
  if (!query || query.trim() === '') return null;

  // Cache check
  const cacheKey = query.toLowerCase().trim();
  if (CACHE.has(cacheKey)) return CACHE.get(cacheKey);

  try {
    const params = new URLSearchParams({
      query: query,
      per_page: 5,
      orientation: 'landscape',
      content_filter: 'high',
      client_id: apiKey,
    });

    const response = await fetch(`${UNSPLASH_BASE}/search/photos?${params}`, {
      headers: { 'Accept-Version': 'v1' },
    });

    if (!response.ok) {
      console.warn('Unsplash API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) return null;

    // Pick a random result from the top 5 for variety
    const idx = Math.floor(Math.random() * Math.min(data.results.length, 5));
    const photo = data.results[idx];
    const url = photo.urls?.regular || photo.urls?.small || null;

    if (url) CACHE.set(cacheKey, url);
    return url;

  } catch (err) {
    console.warn('Unsplash fetch failed:', err);
    return null;
  }
}

/**
 * Preload an image URL (returns a promise that resolves when the image loads).
 * @param {string} url
 * @returns {Promise<boolean>}
 */
export function preloadImage(url) {
  return new Promise(resolve => {
    if (!url) { resolve(false); return; }
    const img = new Image();
    img.onload  = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}
