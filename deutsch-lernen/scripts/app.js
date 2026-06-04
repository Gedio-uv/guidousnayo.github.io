/**
 * app.js — Main application orchestrator
 * Handles routing, state, UI updates, and module coordination.
 */

import { detectNativeLanguage, t, getTranslations } from './i18n.js';
import { loadSettings, saveDifficulty, saveApiKeys, saveSpeechRate, saveNativeLang, isInitialized } from './settings.js';
import { lookupWord } from './search.js';
import { fetchImage } from './images.js';
import { speak, setSpeechRate, initSpeech } from './speech.js';
import { initFlashcards, updateFlashcardConfig, loadCards } from './flashcards.js';
import { renderGrammarView } from './grammar.js';
import { initMusic } from './music.js';

// ── Global State ──
const state = {
  difficulty:  'initial',
  nativeLang:  'es',
  geminiKey:   '',
  unsplashKey: '',
  speechRate:  0.9,
  currentView: 'search',
  lastResult:  null,
};

// ── History ──
const HISTORY_KEY = 'dl_history';
const HISTORY_MAX = 30;

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}

function saveToHistory(result) {
  const history = getHistory().filter(h => h.word !== result.word);
  history.unshift({
    word:            result.word,
    article:         result.article || '',
    nativeTranslation: result.nativeTranslation || '',
    partOfSpeech:    result.partOfSpeech || '',
    timestamp:       Date.now(),
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, HISTORY_MAX)));
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

function renderHistory() {
  const history     = getHistory();
  const listEl      = $('history-list');
  const emptyEl     = $('history-empty');
  if (!listEl || !emptyEl) return;

  if (history.length === 0) {
    emptyEl.style.display = '';
    listEl.innerHTML = '';
    return;
  }
  emptyEl.style.display = 'none';

  listEl.innerHTML = history.map(item => {
    const articleHtml = item.article && item.article !== '-'
      ? `<span class="history-item__article">${item.article}</span>`
      : '';
    const wordDisplay = item.article && item.word.toLowerCase().startsWith(item.article.toLowerCase() + ' ')
      ? item.word.slice(item.article.length).trim()
      : item.word;
    const timeStr = timeAgo(item.timestamp);

    return `<li class="history-item" tabindex="0" role="button" data-word="${escapeAttr(item.word)}" aria-label="Search ${item.word} again">
      <div class="history-item__icon">${articleHtml || '—'}</div>
      <div class="history-item__body">
        <div class="history-item__word">${articleHtml}<span>${escapeHtml(wordDisplay)}</span></div>
        <div class="history-item__translation">${escapeHtml(item.nativeTranslation)}</div>
      </div>
      <span class="history-item__time">${timeStr}</span>
      <svg class="history-item__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </li>`;
  }).join('');

  listEl.querySelectorAll('.history-item').forEach(item => {
    const searchWord = () => {
      const word = item.dataset.word;
      const searchInput = $('search-input');
      if (searchInput) searchInput.value = word;
      navigateTo('search');
      doSearch(word);
    };
    item.addEventListener('click', searchWord);
    item.addEventListener('keydown', e => { if (e.key === 'Enter') searchWord(); });
  });
}

function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const min  = Math.floor(diff / 60000);
  const hr   = Math.floor(diff / 3600000);
  const day  = Math.floor(diff / 86400000);
  if (min < 1)   return 'ahora';
  if (min < 60)  return `${min}m`;
  if (hr  < 24)  return `${hr}h`;
  return `${day}d`;
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escapeAttr(str) {
  return String(str).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── Language name map (for Gemini prompts) ──
const LANG_NAMES = {
  es: 'Spanish', en: 'English', pt: 'Portuguese',
  fr: 'French',  it: 'Italian', de: 'German',
};

// ── DOM shortcuts ──
const $ = id => document.getElementById(id);

/* ════════════════════════════════════════════
   BOOT
════════════════════════════════════════════ */
async function boot() {
  // Load saved settings
  const saved = loadSettings();

  // Detect native language
  state.nativeLang = saved.nativeLang || detectNativeLanguage();
  saveNativeLang(state.nativeLang);

  state.geminiKey   = saved.geminiKey  || '';
  state.unsplashKey = saved.unsplashKey || '';
  state.speechRate  = saved.speechRate || 0.9;

  // Initialize speech
  await initSpeech();
  setSpeechRate(state.speechRate);

  // Initialize flashcard module
  initFlashcards({
    elCard:         $('flip-card'),
    elCardImage:    $('card-image'),
    elCardArticle:  $('card-article'),
    elCardWord:     $('card-word'),
    elCardNative:   $('card-native'),
    elCounter:      $('cards-counter'),
    elProgressFill: $('cards-progress-fill'),
    elHintText:     $('card-hint-text'),
    elListenBtn:    $('card-listen'),
    elListenLabel:  $('card-listen-label'),
    elFlipBtn:      $('card-flip-btn'),
    elFlipLabel:    $('card-flip-label'),
    elPrevBtn:      $('card-prev'),
    elNextBtn:      $('card-next'),
    elSwipeHint:    $('swipe-hint'),
    elGameArea:     $('cards-game'),
    elCompleteArea: $('cards-complete'),
    elLoadingArea:  $('cards-loading'),
    elErrorArea:    $('cards-error'),
    elErrorText:    $('cards-error-text'),
    elRetryBtn:     $('cards-retry-btn'),
    elCardViewport: $('card-viewport'),
    elStartArea:    $('cards-start'),
  });

  // Initialize music module
  initMusic(state);

  if (isInitialized()) {
    // Returning user: go straight to main app
    state.difficulty = saved.difficulty;
    const uiLang = state.difficulty === 'advanced' ? 'de' : state.nativeLang;
    applyLanguage(uiLang);
    showMainApp();
  } else {
    // First time: show onboarding
    applyOnboardingLanguage(state.nativeLang);
    showOnboarding();
  }

  bindGlobalEvents();
}

/* ════════════════════════════════════════════
   LANGUAGE APPLICATION
════════════════════════════════════════════ */

/**
 * Apply UI language strings to all DOM elements.
 * @param {string} uiLang - language to use for UI ('es', 'en', 'de', etc.)
 */
function applyLanguage(uiLang) {
  const trans = getTranslations(uiLang);

  // Onboarding
  setText('onboarding-subtitle',    trans.onboardingSubtitle);
  setText('level-initial-title',    trans.levelInitialTitle);
  setText('level-initial-desc',     trans.levelInitialDesc);
  setText('level-advanced-title',   trans.levelAdvancedTitle);
  setText('level-advanced-desc',    trans.levelAdvancedDesc);
  setText('level-unsure-title',     trans.levelUnsureTitle || "I'm not sure");
  setText('level-unsure-desc',      trans.levelUnsureDesc || "Short test to find your level");
  setText('onboarding-note',        trans.onboardingNote);

  // Nav
  setText('nav-search-label',       trans.navSearch);
  setText('nav-cards-label',        trans.navCards);
  setText('nav-history-label',      trans.navHistory);
  setText('nav-grammar-label',      trans.navGrammar);
  setText('nav-settings-label',     trans.navSettings);

  // Search
  setAttr('search-input', 'placeholder', trans.searchPlaceholder);
  setText('search-empty-text',      trans.searchEmptyText);
  setText('search-empty-hint',      trans.searchEmptyHint);
  setText('search-loading-text',    trans.searchLoading);
  setText('search-error-title',     trans.searchErrorTitle);
  setText('search-error-text',      trans.searchErrorText);
  setText('go-settings-label',      trans.goSettings);
  setText('synonyms-label',         trans.synonymsLabel);
  setText('tab-examples-label',     trans.tabExamples);
  setText('tab-grammar-label',      trans.tabGrammar);

  // Cards
  setText('cards-title',            trans.cardsTitle);
  setText('cards-loading-text',     trans.cardsLoadingText);
  setText('cards-error-text',       trans.cardsErrorText);
  setText('cards-retry-label',      trans.cardsRetry);
  setText('cards-start-text',       trans.cardsStartText);
  setText('cards-load-label',       trans.cardsLoad);
  setText('card-hint-text',         trans.cardHint);
  setText('card-listen-label',      trans.cardListen);
  setText('swipe-hint-text',        trans.swipeHint);
  setText('card-flip-label',        trans.cardFlip);
  setText('cards-complete-title',   trans.cardsComplete);
  setText('cards-complete-text',    trans.cardsCompleteText);
  setText('cards-again-label',      trans.cardsAgain);

  // Settings
  setText('settings-title',         trans.settingsTitle);
  setText('settings-level-title',   trans.settingsLevelTitle);
  setText('settings-api-title',     trans.settingsAPITitle);
  setText('settings-api-desc',      trans.settingsAPIDesc);
  setText('settings-speech-title',  trans.settingsSpeechTitle);
  setText('gemini-key-label',       trans.geminiKeyLabel);
  setText('gemini-link-text',       trans.geminiLinkText);
  setText('unsplash-key-label',     trans.unsplashKeyLabel);
  setText('unsplash-link-text',     trans.unsplashLinkText);
  setText('save-keys-label',        trans.saveKeys);
  setText('save-feedback-text',     trans.savedFeedback);
  setText('speech-rate-label',      trans.speechRateLabel);
  setText('settings-about-desc',    trans.aboutDesc);
  setText('toggle-initial-label',   trans.toggleInitial);
  setText('toggle-advanced-label',  trans.toggleAdvanced);
}

function applyOnboardingLanguage(nativeLang) {
  // On onboarding, show text in native language
  // but keep German-sounding name
  applyLanguage(nativeLang);
}

/* ════════════════════════════════════════════
   SCREEN MANAGEMENT
════════════════════════════════════════════ */

function showOnboarding() {
  $('onboarding').classList.remove('hidden');
  $('main-app').classList.add('hidden');
}

function showMainApp() {
  $('onboarding').classList.add('hidden');
  $('main-app').classList.remove('hidden');

  // Sync settings UI
  syncSettingsUI();

  // Update flashcard config
  updateFlashcardConfig({
    lang:        state.difficulty === 'advanced' ? 'de' : state.nativeLang,
    geminiKey:   state.geminiKey,
    unsplashKey: state.unsplashKey,
  });

  // Navigate to search by default
  navigateTo('search');
}

/* ════════════════════════════════════════════
   ROUTING
════════════════════════════════════════════ */

function navigateTo(viewName) {
  if (state.currentView === viewName) return;
  state.currentView = viewName;

  // Update views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = $(`view-${viewName}`);
  if (target) {
    // Small delay for entering animation direction
    requestAnimationFrame(() => target.classList.add('active'));
  }

  // Update nav
  document.querySelectorAll('.nav-item').forEach(item => {
    const active = item.dataset.view === viewName;
    item.classList.toggle('active', active);
    item.setAttribute('aria-current', active ? 'page' : 'false');
  });
}

/* ════════════════════════════════════════════
   SEARCH LOGIC
════════════════════════════════════════════ */

function showSearchState(state) {
  const states = {
    empty:   $('search-empty'),
    loading: $('search-loading'),
    result:  $('search-result'),
    error:   $('search-error'),
  };
  Object.entries(states).forEach(([key, el]) => {
    if (el) el.classList.toggle('hidden', key !== state);
  });
}

async function doSearch(query) {
  if (!query.trim()) return;

  showSearchState('loading');

  try {
    const uiLang = state.difficulty === 'advanced' ? 'de' : state.nativeLang;
    const nativeLangName = LANG_NAMES[state.nativeLang] || 'English';

    const result = await lookupWord(query, state.nativeLang, nativeLangName, state.geminiKey);
    state.lastResult = result;

    // Render result immediately (placeholder shows while image loads)
    renderResult(result, null, uiLang);
    showSearchState('result');
    saveToHistory(result);

    // Load image in background — update DOM when ready
    if (result.imageQuery) {
      // Show verb-specific hint in placeholder
      const isVerb = ['verb','adverb','preposition'].includes((result.partOfSpeech||'').toLowerCase());
      const placeholderLabel = $('result-image-placeholder-label');
      if (placeholderLabel) {
        placeholderLabel.textContent = isVerb ? '🎨 Generating image…' : '🖼️ Loading…';
      }

      fetchImage(
        result.imageQuery,
        null,                        // use built-in Unsplash key from images.js
        result.partOfSpeech || null
      ).then(imageUrl => {
        if (!imageUrl) return;
        const imgEl      = $('result-image');
        const placeholder = $('result-image-placeholder');
        if (!imgEl || !placeholder) return;
        imgEl.src = imageUrl;
        imgEl.alt = result.word;
        imgEl.style.opacity = '0';
        imgEl.style.transition = '';
        imgEl.classList.remove('hidden');
        imgEl.onload = () => {
          placeholder.classList.add('hidden');
          requestAnimationFrame(() => {
            imgEl.style.transition = 'opacity 0.5s ease';
            imgEl.style.opacity = '1';
          });
        };
        imgEl.onerror = () => {
          imgEl.classList.add('hidden');
          placeholder.classList.remove('hidden');
        };
      }).catch(() => {});
    }

  } catch (err) {
    console.error('Search error:', err);
    showSearchState('error');
    const errEl = $('search-error-text');
    if (errEl) {
      if (err.message === 'NO_API_KEY' || err.message === 'INVALID_KEY') {
        errEl.textContent = 'API Key inválida o no configurada. Ve a Ajustes.';
      } else if (err.message === 'RATE_LIMIT') {
        errEl.textContent = 'Límite de uso alcanzado. Espera un momento.';
      } else {
        errEl.textContent = `Error: ${err.message}. Verifica tu conexión y API Key.`;
      }
    }
  }
}

function renderResult(result, imageUrl, uiLang) {
  const trans = getTranslations(uiLang);

  // Image — keep placeholder visible while image loads (especially for Pollinations AI)
  const imgEl      = $('result-image');
  const placeholder = $('result-image-placeholder');

  // Reset state
  imgEl.style.opacity  = '0';
  imgEl.style.transition = '';
  imgEl.classList.add('hidden');    // start hidden; reveal on successful load
  placeholder.classList.remove('hidden'); // always show placeholder first

  if (imageUrl) {
    imgEl.src = imageUrl;
    imgEl.alt = result.word;

    imgEl.onload = () => {
      imgEl.classList.remove('hidden');
      placeholder.classList.add('hidden');
      requestAnimationFrame(() => {
        imgEl.style.transition = 'opacity 0.5s ease';
        imgEl.style.opacity = '1';
      });
    };

    imgEl.onerror = () => {
      imgEl.classList.add('hidden');
      placeholder.classList.remove('hidden');
    };
  }

  // Article + word + plural
  const article = result.article && result.article !== '-' ? result.article : '';
  setText('result-article', article);
  setText('result-word',    result.word || '');
  const plural = result.plural && result.plural !== '-' ? `(${result.plural})` : '';
  setText('result-plural', plural);

  // Part of speech badge
  const posEl = $('result-pos');
  if (posEl) {
    posEl.textContent = result.partOfSpeech || '';
    posEl.style.display = result.partOfSpeech ? '' : 'none';
  }

  // IPA
  setText('result-ipa', result.ipa || '');

  // Translation
  setText('result-translation', result.nativeTranslation || '');

  // Synonyms
  const synonymsEl = $('result-synonyms');
  if (synonymsEl) {
    synonymsEl.innerHTML = '';
    (result.synonyms || []).forEach(syn => {
      const chip = document.createElement('span');
      chip.className = 'synonym-chip';
      chip.textContent = syn;
      chip.setAttribute('role', 'listitem');
      chip.setAttribute('tabindex', '0');
      chip.addEventListener('click', () => {
        $('search-input').value = syn;
        doSearch(syn);
      });
      chip.addEventListener('keydown', e => {
        if (e.key === 'Enter') { $('search-input').value = syn; doSearch(syn); }
      });
      synonymsEl.appendChild(chip);
    });
  }

  // Examples
  const examplesList = $('examples-list');
  if (examplesList) {
    examplesList.innerHTML = '';
    (result.examples || []).forEach(ex => {
      const li = document.createElement('li');
      li.className = 'example-item';

      const deEl = document.createElement('p');
      deEl.className = 'example-item__de';
      deEl.textContent = ex.german;

      li.appendChild(deEl);

      // Show translation only in initial mode
      if (state.difficulty === 'initial' && ex.native) {
        const nEl = document.createElement('p');
        nEl.className = 'example-item__native';
        nEl.textContent = ex.native;
        li.appendChild(nEl);
      }

      examplesList.appendChild(li);
    });
  }

  // Grammar tab
  const grammarEl = $('grammar-info');
  if (grammarEl) {
    grammarEl.innerHTML = '';
    const rows = [
      { label: trans.grammarType,   value: result.partOfSpeech },
      { label: trans.grammarGender, value: article || '-' },
      { label: trans.grammarPlural, value: result.plural || '-' },
      { label: trans.grammarIPA,    value: result.ipa || '-' },
    ];
    if (result.grammarNotes) {
      rows.push({ label: 'Nota', value: result.grammarNotes });
    }
    rows.forEach(({ label, value }) => {
      if (!value || value === '-' || value === '') return;
      const row = document.createElement('div');
      row.className = 'grammar-row';
      row.innerHTML = `<span class="grammar-row__label">${label}</span><span class="grammar-row__value">${value}</span>`;
      grammarEl.appendChild(row);
    });
  }

  // Listen button
  const listenBtn = $('result-listen');
  if (listenBtn) {
    listenBtn.onclick = () => {
      const text = article ? `${article} ${result.word}` : result.word;
      speak(text, listenBtn);
    };
  }
}

/* ════════════════════════════════════════════
   SETTINGS SYNC
════════════════════════════════════════════ */

function syncSettingsUI() {
  // API keys
  const geminiInput   = $('gemini-key');
  const unsplashInput = $('unsplash-key');
  if (geminiInput)   geminiInput.value   = state.geminiKey   || '';
  if (unsplashInput) unsplashInput.value = state.unsplashKey || '';

  // Speech rate
  const rateInput = $('speech-rate');
  if (rateInput) {
    rateInput.value = state.speechRate;
    $('speech-rate-value').textContent = `${state.speechRate}×`;
  }

  // Level toggle
  const toggleInitial  = $('toggle-initial');
  const toggleAdvanced = $('toggle-advanced');
  if (toggleInitial && toggleAdvanced) {
    const isAdvanced = state.difficulty === 'advanced';
    toggleInitial.classList.toggle('active', !isAdvanced);
    toggleAdvanced.classList.toggle('active', isAdvanced);
    toggleInitial.setAttribute('aria-pressed', String(!isAdvanced));
    toggleAdvanced.setAttribute('aria-pressed', String(isAdvanced));
  }
}

/* ════════════════════════════════════════════
   EVENT BINDING
════════════════════════════════════════════ */

function bindGlobalEvents() {

  // ── Onboarding level selection ──
  document.querySelectorAll('.level-card').forEach(card => {
    card.addEventListener('click', () => {
      const level = card.dataset.level;
      if (!level) {
        runPlacementTest();
        return;
      }
      state.difficulty = level;
      saveDifficulty(level);

      const uiLang = level === 'advanced' ? 'de' : state.nativeLang;
      applyLanguage(uiLang);
      showMainApp();
    });
  });

  // ── Navigation ──
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.view));
  });

  // ── Search ──
  const searchInput  = $('search-input');
  const searchSubmit = $('search-submit');
  const searchClear  = $('search-clear');

  searchInput?.addEventListener('input', () => {
    const hasVal = searchInput.value.trim().length > 0;
    searchClear?.classList.toggle('hidden', !hasVal);
  });

  searchInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doSearch(searchInput.value);
    }
  });

  searchSubmit?.addEventListener('click', () => doSearch(searchInput?.value || ''));

  searchClear?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    searchClear.classList.add('hidden');
    showSearchState('empty');
    searchInput?.focus();
  });

  // Search suggestions
  document.querySelectorAll('.search-suggestion').forEach(el => {
    el.addEventListener('click', () => {
      if (searchInput) searchInput.value = el.dataset.word;
      searchClear?.classList.remove('hidden');
      doSearch(el.dataset.word);
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        if (searchInput) searchInput.value = el.dataset.word;
        doSearch(el.dataset.word);
      }
    });
  });

  // Go to settings from search error
  $('search-error-settings')?.addEventListener('click', () => navigateTo('settings'));

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const panel = document.getElementById(`tab-panel-${btn.dataset.tab}`);
      if (panel) panel.classList.add('active');
    });
  });

  // ── Settings: Level toggle ──
  document.querySelectorAll('.level-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const level = btn.dataset.level;
      state.difficulty = level;
      saveDifficulty(level);

      document.querySelectorAll('.level-toggle-btn').forEach(b => {
        const active = b.dataset.level === level;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      });

      const uiLang = level === 'advanced' ? 'de' : state.nativeLang;
      applyLanguage(uiLang);

      // Update flashcard config
      updateFlashcardConfig({
        lang:        uiLang,
        geminiKey:   state.geminiKey,
        unsplashKey: state.unsplashKey,
      });
    });
  });

  // ── Settings: Show/hide API keys ──
  document.querySelectorAll('.settings-eye-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = $(btn.dataset.target);
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.querySelector('.eye-open').classList.toggle('hidden', !isPassword);
      btn.querySelector('.eye-closed').classList.toggle('hidden', isPassword);
    });
  });

  // ── Settings: Save API keys ──
  $('save-keys')?.addEventListener('click', () => {
    const geminiKey   = $('gemini-key')?.value   || '';
    const unsplashKey = $('unsplash-key')?.value || '';

    saveApiKeys(geminiKey, unsplashKey);
    state.geminiKey   = geminiKey;
    state.unsplashKey = unsplashKey;

    // Update flashcard config
    updateFlashcardConfig({
      lang:        state.difficulty === 'advanced' ? 'de' : state.nativeLang,
      geminiKey:   state.geminiKey,
      unsplashKey: state.unsplashKey,
    });

    // Show success feedback
    const feedback = $('save-feedback');
    if (feedback) {
      feedback.classList.remove('hidden');
      setTimeout(() => feedback.classList.add('hidden'), 3000);
    }
  });

  // ── Settings: Speech rate ──
  const speechRateInput = $('speech-rate');
  speechRateInput?.addEventListener('input', () => {
    const rate = parseFloat(speechRateInput.value);
    state.speechRate = rate;
    setSpeechRate(rate);
    saveSpeechRate(rate);
    const display = $('speech-rate-value');
    if (display) display.textContent = `${rate}×`;
  });

  // ── History clear ──
  $('history-clear-btn')?.addEventListener('click', () => {
    clearHistory();
    renderHistory();
  });

  // Grammar sub-tabs are bound dynamically by renderGrammarView() in grammar.js

  // ── Render history or grammar when navigating to those views ──
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (item.dataset.view === 'history') renderHistory();
      if (item.dataset.view === 'grammar') {
        const uiLang = state.difficulty === 'advanced' ? 'de' : state.nativeLang;
        renderGrammarView(uiLang);
      }
    });
  });

  // ── Settings: Level buttons also in onboarding ──
  // (handled above via .level-card delegation)
}

/* ════════════════════════════════════════════
   PLACEMENT TEST
════════════════════════════════════════════ */

const PLACEMENT_QUESTIONS = [
  { q: "Ich gehe ___ Schule.", opts: ["in", "zur", "der", "auf"], ans: "zur" },
  { q: "Er gibt ___ Frau ein Buch.", opts: ["der", "die", "dem", "das"], ans: "der" },
  { q: "Ich sehe ___ Mann.", opts: ["den", "dem", "der", "das"], ans: "den" },
  { q: "Das ist ___ Auto meines Vaters.", opts: ["das", "dem", "des", "die"], ans: "das" },
  { q: "Was ist der Plural von 'das Kind'?", opts: ["die Kinder", "die Kindes", "die Kinden", "der Kind"], ans: "die Kinder" }
];

function runPlacementTest() {
  const modal = $('placement-test');
  modal.classList.remove('hidden');

  let currentQ = 0;
  let score = 0;

  const renderQuestion = () => {
    if (currentQ >= PLACEMENT_QUESTIONS.length) {
      showResult();
      return;
    }

    const q = PLACEMENT_QUESTIONS[currentQ];
    $('placement-counter').textContent = `${currentQ + 1} / ${PLACEMENT_QUESTIONS.length}`;
    $('placement-progress-fill').style.width = `${((currentQ) / PLACEMENT_QUESTIONS.length) * 100}%`;
    
    $('placement-question').textContent = q.q;
    
    const shuffled = [...q.opts].sort(() => Math.random() - 0.5);
    
    $('placement-options').innerHTML = shuffled.map(opt => `
      <button class="placement-option" data-val="${opt}">${opt}</button>
    `).join('');

    document.querySelectorAll('.placement-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.val === q.ans) score++;
        currentQ++;
        renderQuestion();
      });
    });
  };

  const showResult = () => {
    $('placement-progress-fill').style.width = '100%';
    $('placement-question-wrap').classList.add('hidden');
    $('placement-result').classList.remove('hidden');

    const isAdvanced = score >= 3;
    const finalLevel = isAdvanced ? 'advanced' : 'initial';
    
    $('placement-result-icon').textContent = isAdvanced ? '🚀' : '🌱';
    $('placement-result-title').textContent = isAdvanced ? 'Advanced' : 'Beginner';
    $('placement-result-desc').textContent = isAdvanced 
      ? `You scored ${score}/5. You're ready for the full German interface!` 
      : `You scored ${score}/5. We'll start with the interface in your language.`;

    $('placement-confirm').onclick = () => {
      modal.classList.add('hidden');
      $('placement-question-wrap').classList.remove('hidden');
      $('placement-result').classList.add('hidden');

      state.difficulty = finalLevel;
      saveDifficulty(finalLevel);
      const uiLang = finalLevel === 'advanced' ? 'de' : state.nativeLang;
      applyLanguage(uiLang);
      showMainApp();
    };
  };

  $('placement-back').onclick = () => {
    modal.classList.add('hidden');
  };

  renderQuestion();
}

/* ════════════════════════════════════════════
   UTILS
════════════════════════════════════════════ */

function setText(id, text) {
  const el = $(id);
  if (el && text !== undefined) el.textContent = text;
}

function setAttr(id, attr, value) {
  const el = $(id);
  if (el) el.setAttribute(attr, value);
}

/* ════════════════════════════════════════════
   START
════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', boot);
