# Tolk — Project Context for Antigravity Agents

## What is Tolk
Tolk is a language learning web app focused on German, designed for mobile-first, engaging vocabulary and grammar practice through mini-games.

## Stack
- **Vanilla JS with ES Modules** — NO React, NO Vue, NO npm dependencies
- **CSS** — Multiple files in `/styles/` folder, all imported in `index.html`
- **AI:** Groq (Llama 3.3) via Cloudflare Worker proxy at `/api/chat`
- **Optional AI:** User's own Gemini API key (stored in localStorage)
- **Images:** Unsplash API + Pollinations AI fallback
- **Speech:** Web Speech API (built-in browser)
- **Deploy:** GitHub Pages (static files only)

## File Structure
```
/
├── index.html              ← Main HTML (Tolk structure, bottom nav)
├── scripts/
│   ├── app.js              ← Main orchestrator (state, routing, events)
│   ├── progress.js         ← State persistence (tolk:progress JSON schema)
│   ├── search.js           ← Word lookup via Groq/Gemini
│   ├── flashcards.js       ← Flashcard logic
│   ├── games.js            ← Games Hub orchestrator + Mini-games
│   ├── grammar.js          ← Grammar view renderer
│   ├── images.js           ← Unsplash + AI image fetching
│   ├── speech.js           ← Web Speech API wrapper
│   ├── settings.js         ← Local device settings persistence
│   └── i18n.js             ← Translations system
├── styles/
│   ├── main.css            ← Design tokens, layout, global components
│   ├── search.css          ← Search view styles
│   ├── games.css           ← Games Hub, Quiz, and Flashcards styles
│   ├── settings.css        ← Profile / Settings styles
│   └── extras.css          ← History + Grammar view styles
└── worker/
    └── index.js            ← Cloudflare Worker (Groq API proxy)
```

## Design System (from main.css)
- Background: `#08080E` (--c-bg)
- Surface: `rgba(255,255,255,0.055)` (--c-surface)
- Gold accent: `#FFCB47` (--c-gold)
- Red accent: `#E63946` (--c-red)
- Text: `#F2F2F5` (--c-text)
- Fonts: Outfit (headings) + Inter (body) from Google Fonts
- Border radius: --r-xs(6) --r-sm(10) --r-md(16) --r-lg(24)
- Dark theme, mobile-first, glassmorphism surfaces

## Global State (progress.js)
State is saved via unified `tolk:progress` JSON schema:
```json
{
  "schemaVersion": 1,
  "level": "initial",
  "uiLanguage": "en",
  "searchHistory": [],
  "wordsSearchedCount": 0,
  "gamesPlayed": 0,
  "flashcardsCompleted": 0,
  "streak": 0,
  "lastActiveDate": "2024-03-01",
  "quizScores": {}
}
```

## Navigation Views (Bottom Nav)
1. `search` — word lookup (with nested history modal)
2. `games`  — games hub (Flashcards, Quiz, Was ist das, Correct, Hangman)
3. `grammar` — grammar reference
4. `profile` — user stats and app settings

## Verb Conjugation
When a user searches for a verb, `app.js` renders a dynamic conjugation table in the Grammar tab.
- **Beginner Level (`initial`)**: fetches 5 core tenses.
- **Advanced Level (`advanced`)**: fetches 9 tenses.
- The UI includes a horizontally scrollable tense selector (`.tense-selector`) and a 2-column person/form table.

## Games Hub (NEW)
`scripts/games.js` coordinates mini-games:
- Reads vocabulary from user's `searchHistory`.
- Uses `callAI` from `search.js` for dynamic sentence generation.
- Uses `fetchImage` from `images.js` for visual games.

## Rules for Agents
1. NEVER add npm packages or external dependencies.
2. NEVER use React, Vue, or any framework.
3. ALL new CSS goes in existing /styles/ files.
4. Follow existing naming conventions: BEM-like classes, camelCase JS.
5. All user-facing text must be translatable via `i18n.js`.
6. **Responsive Layout**: Mobile-first design. 
   - Uses `--bp-tablet` (768px) and `--bp-laptop` (1024px).
   - Global layout is capped at `--max-w-wide` (1040px) to prevent over-stretching on large monitors.
   - Specific wide views (Search two-pane, Conjugation grid, Games grid) utilize this extra width via CSS Grid.
7. Dark theme only — background always near #08080E.

## Key URLs
- Live app: https://gedio-uv.github.io/deutsch-lernen/
- GitHub: https://github.com/Gedio-uv/gedio-uv.github.io/tree/main/deutsch-lernen
- Cloudflare Worker proxies Groq requests (key stored as env secret)
