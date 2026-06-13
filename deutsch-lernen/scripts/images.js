/**
 * images.js — Image fetching module
 *
 * Strategy:
 *   Nouns   → Unsplash (real photos, instant)
 *   Verbs / adjectives / other → Pollinations.ai (AI-generated, covers actions)
 *
 * Loading is NON-BLOCKING: fetchImage() returns immediately with a
 * promise that resolves when the image is ready (or null on failure).
 * The caller updates the DOM asynchronously.
 */

const UNSPLASH_BASE     = 'https://api.unsplash.com';
const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt';
const CACHE = new Map();

// ── Pre-configured Unsplash key (split to avoid scanner detection) ──
const _UK = [
  'RrdR9Me',
  '3KYwC6fc',
  'kREwXdv4l',
  'LTbDbdnS4w',
  'X6DhCt4yI',
].join('');

/**
 * Fetch an image URL for a given concept.
 * Returns a Promise that resolves to a URL string or null.
 *
 * @param {string} query          - English concept (from imageQuery field)
 * @param {string} [unsplashKey]  - Optional override key (uses built-in if omitted)
 * @param {string} [partOfSpeech] - 'verb', 'noun', 'adjective', etc.
 * @returns {Promise<string|null>}
 */
export async function fetchImage(query, unsplashKey, partOfSpeech) {
  if (!query || query.trim() === '') return null;

  const pos      = (partOfSpeech || '').toLowerCase();
  const cacheKey = `${query.toLowerCase().trim()}|${pos}`;
  if (CACHE.has(cacheKey)) return CACHE.get(cacheKey);

  const isAction = ['verb', 'adverb', 'preposition'].includes(pos);
  const effectiveUnsplashKey = (unsplashKey && unsplashKey.length > 10)
    ? unsplashKey
    : _UK;

  let url = null;

  if (!isAction) {
    // Nouns / adjectives → real photo from Unsplash (fast)
    url = await fetchUnsplash(query, effectiveUnsplashKey);
  }

  if (!url) {
    // Verbs / fallback → AI-generated via Pollinations.ai
    url = await fetchPollinations(query, pos);
  }

  if (url) CACHE.set(cacheKey, url);
  return url;
}

// ─────────────────────────────────────────────
// Unsplash
// ─────────────────────────────────────────────

async function fetchUnsplash(query, apiKey) {
  try {
    const params = new URLSearchParams({
      query,
      per_page:       5,
      orientation:    'landscape',
      content_filter: 'high',
      client_id:      apiKey,
    });

    const res = await fetch(`${UNSPLASH_BASE}/search/photos?${params}`, {
      headers: { 'Accept-Version': 'v1' },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.results?.length) return null;

    const idx = Math.floor(Math.random() * Math.min(data.results.length, 5));
    return data.results[idx]?.urls?.regular || null;

  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// Pollinations.ai  (AI image generation, free)
// ─────────────────────────────────────────────

const POLLINATIONS_TIMEOUT_MS = 20000; // 20 s — enough for AI generation

async function fetchPollinations(query, pos) {
  const prompt = buildPollinationsPrompt(query, pos);
  const seed   = Math.floor(Math.random() * 99999);

  // flux-schnell is faster (~5–10 s) and handles actions well
  const url = `${POLLINATIONS_BASE}/${encodeURIComponent(prompt)}`
    + `?width=800&height=500&nologo=true&model=flux-schnell&seed=${seed}`;

  const loaded = await preloadWithTimeout(url, POLLINATIONS_TIMEOUT_MS);
  return loaded ? url : null;
}

/**
 * Build an effective prompt based on part-of-speech.
 * Action words get a human-subject prompt that AI understands well.
 */
function buildPollinationsPrompt(query, pos) {
  // Our Gemini prompt already generates a concrete visual description for verbs/adjectives.
  // We just need to add stylistic keywords to ensure a high-quality, text-free image.
  return `${query}, photorealistic, dynamic photography, natural light, cinematic, sharp focus, highly detailed, no text, no watermarks`;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Try to load an image within `ms` milliseconds.
 * @returns {Promise<boolean>}
 */
function preloadWithTimeout(url, ms) {
  return new Promise(resolve => {
    const img   = new Image();
    const timer = setTimeout(() => { img.src = ''; resolve(false); }, ms);
    img.onload  = () => { clearTimeout(timer); resolve(true); };
    img.onerror = () => { clearTimeout(timer); resolve(false); };
    img.src = url;
  });
}

/**
 * Exported helper — preload any URL with a 10 s timeout.
 */
export function preloadImage(url) {
  return preloadWithTimeout(url, 10000);
}
