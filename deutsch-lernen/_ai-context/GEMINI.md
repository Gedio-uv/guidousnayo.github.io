# Tolk — Project Context for Antigravity Agents

## What is Tolk
Tolk is a language learning web app (formerly DeutschLernen) focused on German.
It is being rebranded and expanded with a Music feature that lets users learn German through songs.

## Stack
- **Vanilla JS with ES Modules** — NO React, NO Vue, NO npm dependencies
- **CSS** — Multiple files in /styles/ folder, all imported in index.html
- **AI:** Groq (Llama 3.3) via Cloudflare Worker proxy at /api/chat
- **Optional AI:** User's own Gemini API key (stored in localStorage)
- **Images:** Unsplash API + Pollinations AI fallback
- **Speech:** Web Speech API (built-in browser)
- **Deploy:** GitHub Pages (static files only)

## File Structure
```
/
├── index.html              ← Main HTML (REBRANDED to Tolk)
├── scripts/
│   ├── app.js              ← Main orchestrator (state, routing, events)
│   ├── music.js            ← NEW: Music feature module
│   ├── search.js           ← Word lookup via Groq/Gemini
│   ├── flashcards.js       ← Flashcard game
│   ├── grammar.js          ← Grammar view renderer
│   ├── images.js           ← Unsplash + AI image fetching
│   ├── speech.js           ← Web Speech API wrapper
│   ├── settings.js         ← localStorage persistence
│   └── i18n.js             ← Translations system
├── styles/
│   ├── main.css            ← Design tokens, layout, global components
│   ├── music.css           ← NEW: Music feature styles
│   ├── search.css          ← Search view styles
│   ├── cards.css           ← Flashcard styles
│   ├── settings.css        ← Settings view styles
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

## Global State (app.js)
```js
const state = {
  difficulty:  'initial',   // 'initial' | 'advanced'
  nativeLang:  'en',        // detected browser language
  geminiKey:   '',          // optional user API key
  unsplashKey: '',          // optional user API key
  speechRate:  0.9,
  currentView: 'search',
  lastResult:  null,
};
```

## Navigation Views
- `search` — word lookup
- `music`   — NEW: song catalog + karaoke player
- `cards`   — flashcard game
- `grammar` — grammar reference
- `history` — search history
- `settings` — app settings

## Music Feature (NEW)
The music module (scripts/music.js) is self-contained:
- `initMusic(state)` — call once from boot() in app.js
- Renders catalog grid from SONGS_CATALOG array
- Opens full-screen player on song tap
- Toggle: Original / German / Both (bilingual karaoke)
- Clickable German words → popup with definition (uses lookupWord())
- Vocabulary quiz generated from song's word list
- Pronunciation mode: reads full German lyrics via speak()

## Integration Points
- music.js imports `lookupWord` from search.js
- music.js imports `speak` from speech.js
- app.js adds: `import { initMusic } from './music.js'`
- app.js calls: `initMusic(state)` inside boot()

## Rules for Agents
1. NEVER add npm packages or external dependencies
2. NEVER use React, Vue, or any framework
3. ALL new CSS goes in a new file in /styles/ — never inline styles
4. Follow existing naming conventions: BEM-like classes, camelCase JS
5. All user-facing text must be in English
6. Mobile-first: test at 390px width
7. Dark theme only — background always near #08080E
8. Reuse existing modules (lookupWord, speak, etc.) — don't duplicate

## Phase Roadmap
- **Phase 1 (current):** Tolk rebrand + Music feature (catalog + karaoke + quiz)
- **Phase 2:** Placement Test on onboarding (8-10 German questions, AI scoring)
- **Phase 3:** BYOS (Bring Your Own Song) via YouTube/Spotify link
- **Phase 4:** AI voice dubbing (Rask/Wavel API)

## Key URLs
- Live app: https://gedio-uv.github.io/deutsch-lernen/
- GitHub: https://github.com/Gedio-uv/gedio-uv.github.io/tree/main/deutsch-lernen
- Cloudflare Worker proxies Groq requests (key stored as env secret)
