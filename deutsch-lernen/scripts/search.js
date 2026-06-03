/**
 * search.js — Gemini API integration for German word lookup
 * Handles word detection, translation, synonyms, examples, and grammar.
 */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Look up a word using Gemini.
 * Auto-detects if the input is German or native language.
 *
 * @param {string} word - The word to look up
 * @param {string} nativeLang - Native language code (e.g. 'es', 'en')
 * @param {string} nativeLangName - Full name of native language (e.g. 'Spanish')
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<WordResult>}
 */
export async function lookupWord(word, nativeLang, nativeLangName, apiKey) {
  if (!apiKey) throw new Error('NO_API_KEY');

  const prompt = buildPrompt(word.trim(), nativeLang, nativeLangName);

  const response = await fetch(`${GEMINI_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 400) throw new Error('INVALID_KEY');
    if (response.status === 429) throw new Error('RATE_LIMIT');
    throw new Error(err.error?.message || 'GEMINI_ERROR');
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) throw new Error('EMPTY_RESPONSE');

  try {
    const result = JSON.parse(rawText);
    validateResult(result);
    return result;
  } catch (e) {
    // Try to extract JSON from markdown code block
    const match = rawText.match(/```(?:json)?\s*([\s\S]+?)```/);
    if (match) {
      const result = JSON.parse(match[1]);
      validateResult(result);
      return result;
    }
    throw new Error('PARSE_ERROR');
  }
}

/**
 * Generate a set of vocabulary flashcards for a given category.
 *
 * @param {string} category - e.g. 'animals', 'food'
 * @param {string} nativeLangName - Native language full name
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<FlashCard[]>}
 */
export async function generateFlashcards(category, nativeLangName, apiKey) {
  if (!apiKey) throw new Error('NO_API_KEY');

  const categoryNames = {
    animals: 'animals',
    food: 'food and drinks',
    colors: 'colors and adjectives',
    nature: 'nature and environment',
    household: 'household objects',
    body: 'body parts',
    transport: 'transportation and vehicles',
    emotions: 'emotions and feelings',
    travel: 'travel and tourism',
    work: 'work and professions',
  };

  const catName = categoryNames[category] || category;

  const prompt = `Generate exactly 10 German vocabulary flashcards for the category: "${catName}".

Return ONLY a valid JSON array (no markdown, no explanation) in this exact format:
[
  {
    "word": "German noun/word",
    "article": "der/die/das or - for non-nouns",
    "plural": "plural form or -",
    "nativeTranslation": "translation in ${nativeLangName}",
    "imageQuery": "simple English noun for image search (1-2 words)"
  }
]

Rules:
- Use common, learnable words appropriate for the category
- For nouns, always include the correct article (der/die/das)
- For verbs/adjectives, use article "-"
- The imageQuery must be a simple English noun or concept
- Vary difficulty from basic to intermediate
- Return ONLY the JSON array, nothing else`;

  const response = await fetch(`${GEMINI_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 400) throw new Error('INVALID_KEY');
    throw new Error(err.error?.message || 'GEMINI_ERROR');
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) throw new Error('EMPTY_RESPONSE');

  try {
    const result = JSON.parse(rawText);
    if (!Array.isArray(result)) throw new Error('Not an array');
    return result;
  } catch (e) {
    const match = rawText.match(/```(?:json)?\s*([\s\S]+?)```/);
    if (match) return JSON.parse(match[1]);
    throw new Error('PARSE_ERROR');
  }
}

/* ── Private helpers ── */

function buildPrompt(word, nativeLang, nativeLangName) {
  return `You are a German dictionary assistant. Analyze the word or phrase: "${word}"

Determine if it is German or ${nativeLangName}. Then return ONLY valid JSON (no markdown, no explanation) in this exact format:

{
  "word": "German word (base form)",
  "article": "der/die/das for nouns, - for others",
  "plural": "plural form for nouns, - for others",
  "ipa": "/IPA transcription/",
  "partOfSpeech": "noun/verb/adjective/adverb/preposition/conjunction",
  "nativeTranslation": "translation in ${nativeLangName}",
  "synonyms": ["German synonym 1", "German synonym 2", "German synonym 3"],
  "examples": [
    {
      "german": "A natural German sentence using the word",
      "native": "Translation of the sentence in ${nativeLangName}"
    },
    {
      "german": "Another German sentence",
      "native": "Translation"
    },
    {
      "german": "A third German sentence",
      "native": "Translation"
    }
  ],
  "grammarNotes": "Brief grammar note in ${nativeLangName} (gender rules, irregular forms, etc.)",
  "imageQuery": "1-3 word English query for finding a representative photo of this concept"
}

Rules:
- If the input is ${nativeLangName}, translate to German
- If the input is German, use it as-is
- Keep synonyms as German words
- Examples must be natural, everyday sentences
- imageQuery must be simple English nouns/concepts suitable for image search
- Return ONLY the JSON object, nothing else`;
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
