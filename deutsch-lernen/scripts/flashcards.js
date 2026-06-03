/**
 * flashcards.js — Flashcard game logic
 * Manages the card deck, flip animation, swipe gestures, and navigation.
 */

import { generateFlashcards } from './search.js';
import { fetchImage, preloadImage } from './images.js';
import { speak } from './speech.js';

// ── State ──
let cards      = [];
let currentIdx = 0;
let isFlipped  = false;
let isAnimating = false;

// ── Touch state ──
let touchStartX = 0;
let touchStartY = 0;
const SWIPE_THRESHOLD = 50;

// ── DOM refs (set in init) ──
let elCard, elCardImage, elCardArticle, elCardWord, elCardNative,
    elCounter, elProgressFill, elHintText, elListenBtn, elListenLabel,
    elFlipBtn, elFlipLabel, elPrevBtn, elNextBtn,
    elSwipeHint, elGameArea, elCompleteArea, elLoadingArea,
    elErrorArea, elErrorText, elRetryBtn, elCardViewport,
    elStartArea, elLoadBtn;

// Language refs (set by app.js)
let lang = 'es';
let nativeLangName = 'Spanish';
let geminiKey  = '';
let unsplashKey = '';

const LANG_NAMES = {
  es: 'Spanish', en: 'English', pt: 'Portuguese',
  fr: 'French',  it: 'Italian', de: 'German',
};

/**
 * Initialize the flashcard module.
 * Called once by app.js after DOM is ready.
 */
export function initFlashcards(refs) {
  ({
    elCard, elCardImage, elCardArticle, elCardWord, elCardNative,
    elCounter, elProgressFill, elHintText, elListenBtn, elListenLabel,
    elFlipBtn, elFlipLabel, elPrevBtn, elNextBtn,
    elSwipeHint, elGameArea, elCompleteArea, elLoadingArea,
    elErrorArea, elErrorText, elRetryBtn, elCardViewport,
    elStartArea, elLoadBtn,
  } = refs);

  bindEvents();
}

/**
 * Update language / API keys (called when settings change).
 */
export function updateFlashcardConfig(config) {
  lang         = config.lang || 'es';
  nativeLangName = LANG_NAMES[lang] || 'English';
  geminiKey    = config.geminiKey  || '';
  unsplashKey  = config.unsplashKey || '';
}

/**
 * Load cards for a given category.
 */
export async function loadCards(category) {
  showState('loading');
  cards      = [];
  currentIdx = 0;
  isFlipped  = false;

  try {
    const rawCards = await generateFlashcards(category, nativeLangName, geminiKey);

    // Fetch images for all cards in parallel (with fallback)
    const withImages = await Promise.all(
      rawCards.map(async card => {
        const imageUrl = unsplashKey
          ? await fetchImage(card.imageQuery || card.word, unsplashKey).catch(() => null)
          : null;
        return { ...card, imageUrl };
      })
    );

    cards = withImages;

    if (cards.length === 0) throw new Error('NO_CARDS');

    showCard(0, 'from-right');
    showState('game');

  } catch (err) {
    console.error('Flashcard load error:', err);
    showState('error');
    if (elErrorText) {
      if (err.message === 'NO_API_KEY') {
        elErrorText.textContent = 'Gemini API Key no configurada. Ve a Ajustes.';
      } else if (err.message === 'INVALID_KEY') {
        elErrorText.textContent = 'API Key inválida. Verifica en Ajustes.';
      } else {
        elErrorText.textContent = 'Error al cargar tarjetas. Intenta de nuevo.';
      }
    }
  }
}

/* ── Private: render a card ── */
function showCard(idx, direction = 'from-right') {
  if (!cards[idx]) return;

  const card = cards[idx];
  currentIdx = idx;
  isFlipped  = false;

  // Reset flip immediately
  elCard.classList.remove('flipped');

  // Update content
  const articleText = card.article && card.article !== '-' ? card.article : '';
  elCardArticle.textContent = articleText;
  elCardWord.textContent    = card.word;
  elCardNative.textContent  = card.nativeTranslation || '';

  // Update image
  if (card.imageUrl) {
    elCardImage.src = card.imageUrl;
    elCardImage.alt = card.word;
  } else {
    elCardImage.src = '';
    elCardImage.alt = '';
  }

  // Update progress
  const progress = Math.round(((idx + 1) / cards.length) * 100);
  elCounter.textContent = `${idx + 1} / ${cards.length}`;
  elProgressFill.style.width = `${progress}%`;
  if (elProgressFill.parentElement) {
    elProgressFill.parentElement.setAttribute('aria-valuenow', progress);
  }

  // Animate in
  elCard.classList.remove('swipe-left', 'swipe-right', 'enter-from-right', 'enter-from-left');

  requestAnimationFrame(() => {
    const enterClass = direction === 'from-right' ? 'enter-from-right' : 'enter-from-left';
    elCard.classList.add(enterClass);
    elCard.addEventListener('animationend', () => {
      elCard.classList.remove(enterClass);
      isAnimating = false;
    }, { once: true });
  });
}

/* ── Private: flip card ── */
function flipCard() {
  if (isAnimating) return;
  isFlipped = !isFlipped;
  elCard.classList.toggle('flipped', isFlipped);

  if (isFlipped) {
    // Auto-pronounce on flip
    const text = elCardArticle.textContent
      ? `${elCardArticle.textContent} ${elCardWord.textContent}`
      : elCardWord.textContent;
    speak(text);
  }
}

/* ── Private: navigate ── */
function goNext() {
  if (isAnimating) return;
  if (currentIdx >= cards.length - 1) {
    showState('complete');
    return;
  }
  animateOut('left', () => showCard(currentIdx + 1, 'from-right'));
}

function goPrev() {
  if (isAnimating || currentIdx <= 0) return;
  animateOut('right', () => showCard(currentIdx - 1, 'from-left'));
}

function animateOut(direction, callback) {
  isAnimating = true;
  const animClass = direction === 'left' ? 'swipe-left' : 'swipe-right';
  elCard.classList.add(animClass);
  elCard.addEventListener('animationend', () => {
    elCard.classList.remove(animClass);
    callback();
  }, { once: true });
}

/* ── Private: show/hide UI states ── */
function showState(state) {
  const states = {
    start:    elStartArea,
    loading:  elLoadingArea,
    error:    elErrorArea,
    game:     elGameArea,
    complete: elCompleteArea,
  };
  Object.entries(states).forEach(([key, el]) => {
    if (!el) return;
    el.classList.toggle('hidden', key !== state);
  });
}

/* ── Private: bind events ── */
function bindEvents() {
  // Load button (start)
  elLoadBtn?.addEventListener('click', () => {
    const category = document.getElementById('cards-category')?.value || 'animals';
    loadCards(category);
  });

  // Refresh button in header
  document.getElementById('cards-refresh')?.addEventListener('click', () => {
    const category = document.getElementById('cards-category')?.value || 'animals';
    loadCards(category);
  });

  // Flip on viewport click
  elCardViewport?.addEventListener('click', (e) => {
    if (e.target.closest('#card-listen')) return; // don't flip when clicking listen btn
    flipCard();
  });

  // Flip button
  elFlipBtn?.addEventListener('click', flipCard);

  // Listen button (back)
  elListenBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const text = elCardArticle.textContent
      ? `${elCardArticle.textContent} ${elCardWord.textContent}`
      : elCardWord.textContent;
    speak(text, elListenBtn);
  });

  // Prev / Next buttons
  elPrevBtn?.addEventListener('click', goPrev);
  elNextBtn?.addEventListener('click', goNext);

  // Retry button
  elRetryBtn?.addEventListener('click', () => {
    const category = document.getElementById('cards-category')?.value || 'animals';
    loadCards(category);
  });

  // Play again button
  document.getElementById('cards-again-btn')?.addEventListener('click', () => {
    currentIdx = 0;
    isFlipped  = false;
    showCard(0, 'from-right');
    showState('game');
  });

  // Keyboard navigation
  document.addEventListener('keydown', handleKeydown);

  // Touch / swipe
  elCardViewport?.addEventListener('touchstart', handleTouchStart, { passive: true });
  elCardViewport?.addEventListener('touchend',   handleTouchEnd,   { passive: true });

  // Keyboard on viewport
  elCardViewport?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      flipCard();
    }
  });
}

function handleKeydown(e) {
  // Only when cards view is active
  const cardsView = document.getElementById('view-cards');
  if (!cardsView?.classList.contains('active')) return;
  if (document.getElementById('cards-game')?.classList.contains('hidden')) return;

  switch (e.key) {
    case 'ArrowRight': case 'l': goNext(); break;
    case 'ArrowLeft':  case 'h': goPrev(); break;
    case 'ArrowUp':   case ' ':
      e.preventDefault();
      flipCard();
      break;
  }
}

function handleTouchStart(e) {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
}

function handleTouchEnd(e) {
  const dx = e.changedTouches[0].screenX - touchStartX;
  const dy = e.changedTouches[0].screenY - touchStartY;

  // Only horizontal swipes (not vertical scrolls)
  if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx)) return;

  if (dx < 0) {
    goNext(); // Swipe left → next
  } else {
    goPrev(); // Swipe right → prev
  }
}
