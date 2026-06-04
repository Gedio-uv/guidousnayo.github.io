/**
 * APP.JS CHANGES FOR TOLK REBRAND + MUSIC FEATURE
 * Apply these changes to the existing scripts/app.js
 * ─────────────────────────────────────────────────
 */

// ── 1. ADD this import at the top of app.js (after existing imports) ──
import { initMusic } from './music.js';


// ── 2. INSIDE the boot() function, after initFlashcards(...) block ──
//    ADD this call:
initMusic(state);


// ── 3. INSIDE showMainApp() function, after navigateTo('search') ──
//    ADD music nav listener to the existing nav event binding
//    (already handled by the generic nav-item loop, no change needed)


// ── 4. INSIDE bindGlobalEvents(), in the nav-item click handler ──
//    ADD this case alongside history and grammar:
//
//    if (item.dataset.view === 'music') {
//      initMusic(state); // re-sync state if needed
//    }


// ── 5. UPDATE the LANG_NAMES map — no change needed (already has English)


// ── 6. UPDATE applyLanguage() — remove all Spanish string references ──
//    The new index.html already has English strings hardcoded in the HTML.
//    applyLanguage() can remain as-is; i18n.js will return English strings.


// ── 7. UPDATE the about section version in syncSettingsUI() if it exists ──
//    Just a cosmetic change — handled in index.html (v2.0.0)


/**
 * SUMMARY OF FILE CHANGES:
 *
 * index.html  ← REPLACE entirely with tolk/index.html
 * styles/music.css  ← ADD new file
 * scripts/music.js  ← ADD new file
 * scripts/app.js    ← ADD 2 lines (import + initMusic call)
 *
 * NO CHANGES NEEDED to:
 * - search.js
 * - speech.js
 * - flashcards.js
 * - grammar.js
 * - images.js
 * - settings.js
 * - i18n.js (minor — update brand name strings from "DeutschLernen" to "Tolk")
 */
