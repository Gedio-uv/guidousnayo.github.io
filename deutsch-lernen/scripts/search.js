/**
 * search.js — AI API integration for German word lookup
 * Auto-detects Groq (gsk_...) vs Gemini (AIza.../AQ. ...) from key prefix.
 */

/* ══════════════════════════════════════════════════
   PROVIDER DETECTION
══════════════════════════════════════════════════ */

function detectProvider(apiKey) {
  if (!apiKey) return null;
  if (apiKey.startsWith('gsk_')) return 'groq';
  return 'gemini'; // AIza..., AQ. ..., or any other format
}

/* ══════════════════════════════════════════════════
   GROQ API  (OpenAI-compatible, free, fast)
══════════════════════════════════════════════════ */

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// ── Cloudflare Worker proxy (holds the key securely as a secret) ──
const WORKER_URL = 'https://deutsch-lernen-api.guido-usnayo-v.workers.dev/api/chat';

async function callGroq(apiKey, promptText) {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:           GROQ_MODEL,
      messages:        [{ role: 'user', content: promptText }],
      temperature:     0.3,
      max_tokens:      1024,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) throw new Error('INVALID_KEY');
    if (response.status === 429) throw new Error('RATE_LIMIT');
    throw new Error(err.error?.message || `GROQ_HTTP_${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || null;
}

/**
 * Call our Cloudflare Worker proxy — no key needed in the browser.
 */
async function callProxy(promptText) {
  const response = await fetch(WORKER_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:           GROQ_MODEL,
      messages:        [{ role: 'user', content: promptText }],
      temperature:     0.3,
      max_tokens:      1024,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('INVALID_KEY');
    if (response.status === 429) throw new Error('RATE_LIMIT');
    throw new Error(err.error?.message || `PROXY_HTTP_${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || null;
}

/* ══════════════════════════════════════════════════
   GEMINI API
══════════════════════════════════════════════════ */

const GEMINI_ENDPOINTS = [
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent',
  'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent',
];

async function callGemini(apiKey, promptText) {
  const body = {
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
  };

  let lastMsg = 'GEMINI_ERROR';

  for (const url of GEMINI_ENDPOINTS) {
    let response;
    try {
      response = await fetch(`${url}?key=${apiKey}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
    } catch (netErr) {
      lastMsg = netErr.message;
      continue;
    }

    if (response.ok) {
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    }

    if (response.status === 401 || response.status === 403) throw new Error('INVALID_KEY');
    if (response.status === 429) throw new Error('RATE_LIMIT');

    const errBody = await response.json().catch(() => ({}));
    lastMsg = errBody.error?.message || `HTTP_${response.status}`;
  }

  throw new Error(lastMsg);
}

/* ══════════════════════════════════════════════════
   UNIFIED CALL
   Priority:
     1. No key / empty key → use Worker proxy (key lives in Cloudflare)
     2. Groq key (gsk_...)  → call Groq directly with user's key
     3. Gemini key (AIza...) → call Gemini directly
══════════════════════════════════════════════════ */

async function callAI(apiKey, promptText) {
  // No personal key — use the Worker proxy (Groq key stored securely)
  if (!apiKey || apiKey.trim() === '') {
    return callProxy(promptText);
  }

  const provider = detectProvider(apiKey);
  if (!provider) return callProxy(promptText); // unrecognised key — fall back to proxy

  const rawText = provider === 'groq'
    ? await callGroq(apiKey, promptText)
    : await callGemini(apiKey, promptText);

  if (!rawText) throw new Error('EMPTY_RESPONSE');
  return rawText;
}

function parseJSON(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/```(?:json)?\s*([\s\S]+?)```/);
    if (match) return JSON.parse(match[1]);
    // Try to find JSON object or array inside raw text
    const objMatch = raw.match(/\{[\s\S]*\}/);
    if (objMatch) return JSON.parse(objMatch[0]);
    throw new Error('PARSE_ERROR');
  }
}

/* ══════════════════════════════════════════════════
   PUBLIC API
══════════════════════════════════════════════════ */

/**
 * Look up a German word or native-language word.
 *
 * @param {string} word
 * @param {string} nativeLang        - 'es', 'en', etc.
 * @param {string} nativeLangName    - 'Spanish', 'English', etc.
 * @param {string} apiKey            - Groq (gsk_...) or Gemini key
 * @returns {Promise<WordResult>}
 */
export async function lookupWord(word, nativeLang, nativeLangName, apiKey) {
  if (!apiKey) throw new Error('NO_API_KEY');

  const prompt = buildWordPrompt(word.trim(), nativeLangName);
  const rawText = await callAI(apiKey, prompt);
  const result  = parseJSON(rawText);

  validateResult(result);
  return result;
}

/**
 * Generate flashcard deck for a category.
 *
 * @param {string} category
 * @param {string} nativeLangName
 * @param {string} apiKey
 * @returns {Promise<FlashCard[]>}
 */
export async function generateFlashcards(category, nativeLangName, apiKey) {
  if (!apiKey) throw new Error('NO_API_KEY');

  const catMap = {
    animals:   'animals',
    food:      'food and drinks',
    colors:    'colors and adjectives',
    nature:    'nature and environment',
    household: 'household objects',
    body:      'body parts',
    transport: 'transportation and vehicles',
    emotions:  'emotions and feelings',
    travel:    'travel and tourism',
    work:      'work and professions',
  };

  const catName = catMap[category] || category;
  const prompt  = buildFlashcardPrompt(catName, nativeLangName);
  const rawText = await callAI(apiKey, prompt);
  const result  = parseJSON(rawText);

  // Groq with json_object might wrap array → unwrap
  const cards = Array.isArray(result)
    ? result
    : result.cards || result.flashcards || Object.values(result)[0];

  if (!Array.isArray(cards)) throw new Error('PARSE_ERROR');
  return cards;
}

/* ══════════════════════════════════════════════════
   PROMPTS
══════════════════════════════════════════════════ */

function buildWordPrompt(word, nativeLangName) {
  return `You are a German dictionary assistant. Analyze the word or phrase: "${word}"

Determine if it is German or ${nativeLangName}. Return ONLY a valid JSON object (no markdown, no explanation):

{
  "word": "German word (base form)",
  "article": "der/die/das for nouns, - for others",
  "plural": "plural form for nouns, - for others",
  "ipa": "/IPA transcription/",
  "partOfSpeech": "noun/verb/adjective/adverb/preposition/conjunction",
  "nativeTranslation": "translation in ${nativeLangName}",
  "synonyms": ["German synonym 1", "German synonym 2", "German synonym 3"],
  "examples": [
    { "german": "Natural German sentence using the word", "native": "Translation in ${nativeLangName}" },
    { "german": "Another German sentence", "native": "Translation" },
    { "german": "A third German sentence", "native": "Translation" }
  ],
  "grammarNotes": "Brief grammar note in ${nativeLangName}",
  "imageQuery": "1-3 word English query for image search (simple nouns only)"
}

Rules:
- If input is ${nativeLangName}, translate to German first
- If input is German, keep as-is
- Synonyms must be German words
- Examples must be natural everyday sentences
- Return ONLY the JSON object`;
}

function buildFlashcardPrompt(catName, nativeLangName) {
  return `Generate exactly 10 German vocabulary flashcards for the category: "${catName}".

Return ONLY a valid JSON object with a "cards" array (no markdown):

{
  "cards": [
    {
      "word": "German noun/word",
      "article": "der/die/das or - for non-nouns",
      "plural": "plural form or -",
      "nativeTranslation": "translation in ${nativeLangName}",
      "imageQuery": "simple English noun for image search (1-2 words)"
    }
  ]
}

Rules:
- Use common learnable words for the category
- Nouns must have correct article (der/die/das)
- Verbs/adjectives use article "-"
- imageQuery must be simple English nouns
- Vary difficulty from basic to intermediate
- Return ONLY the JSON object with the cards array`;
}

function validateResult(result) {
  const required = ['word', 'nativeTranslation', 'examples'];
  for (const key of required) {
    if (!result[key]) throw new Error(`Missing field: ${key}`);
  }
}

/**
 * @typedef {Object} WordResult
 * @property {string} word
 * @property {string} article
 * @property {string} plural
 * @property {string} ipa
 * @property {string} partOfSpeech
 * @property {string} nativeTranslation
 * @property {string[]} synonyms
 * @property {Array<{german: string, native: string}>} examples
 * @property {string} grammarNotes
 * @property {string} imageQuery
 */

/**
 * @typedef {Object} FlashCard
 * @property {string} word
 * @property {string} article
 * @property {string} plural
 * @property {string} nativeTranslation
 * @property {string} imageQuery
 */
