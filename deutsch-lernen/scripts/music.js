/**
 * music.js — Tolk Music Feature
 * Catalog browsing, karaoke view, word lookup, vocabulary quiz.
 * Integrates with existing lookupWord() and speak() modules.
 */

import { lookupWord } from './search.js';
import { speak } from './speech.js';

// ── State ──
let currentSong   = null;
let currentMode   = 'original'; // 'original' | 'german' | 'bilingual'
let catalog       = [];
let filteredCatalog = [];
let activeLevel   = 'all';
let quizActive    = false;
let quizWords     = [];
let quizIndex     = 0;
let appState      = null; // injected from app.js

// ── DOM shortcuts ──
const $ = id => document.getElementById(id);

// ── Song catalog data (curated) ──
// In production this would be fetched from data/songs.json
const SONGS_CATALOG = [
  {
    id: 'nena-99',
    title: '99 Luftballons',
    artist: 'Nena',
    level: 'A2',
    genre: 'Pop',
    year: 1983,
    cover: '🎈',
    color: '#E63946',
    lyrics: {
      original: [
        { line: 'Hast du etwas Zeit für mich', timestamp: 0 },
        { line: 'Dann singe ich ein Lied für dich', timestamp: 4 },
        { line: 'Von 99 Luftballons', timestamp: 8 },
        { line: 'Auf ihrem Weg zum Horizont', timestamp: 12 },
        { line: 'Denkst du vielleicht grad an mich', timestamp: 16 },
        { line: 'Dann singe ich ein Lied für dich', timestamp: 20 },
        { line: 'Von 99 Luftballons', timestamp: 24 },
        { line: 'Und dass so etwas von so etwas kommt', timestamp: 28 },
      ],
      german: [
        { line: 'Hast du etwas Zeit für mich', timestamp: 0 },
        { line: 'Dann singe ich ein Lied für dich', timestamp: 4 },
        { line: 'Von 99 Luftballons', timestamp: 8 },
        { line: 'Auf ihrem Weg zum Horizont', timestamp: 12 },
        { line: 'Denkst du vielleicht grad an mich', timestamp: 16 },
        { line: 'Dann singe ich ein Lied für dich', timestamp: 20 },
        { line: 'Von 99 Luftballons', timestamp: 24 },
        { line: 'Und dass so etwas von so etwas kommt', timestamp: 28 },
      ],
    },
    vocabulary: ['Luftballon', 'Horizont', 'singen', 'Zeit', 'Lied'],
  },
  {
    id: 'rammstein-sonne',
    title: 'Sonne',
    artist: 'Rammstein',
    level: 'B1',
    genre: 'Rock',
    year: 2001,
    cover: '☀️',
    color: '#FFCB47',
    lyrics: {
      original: [
        { line: 'Eins, hier kommt die Sonne', timestamp: 0 },
        { line: 'Zwei, hier kommt die Sonne', timestamp: 4 },
        { line: 'Drei, sie ist der hellste Stern von allen', timestamp: 8 },
        { line: 'Vier, hier kommt die Sonne', timestamp: 12 },
      ],
      german: [
        { line: 'Eins, hier kommt die Sonne', timestamp: 0 },
        { line: 'Zwei, hier kommt die Sonne', timestamp: 4 },
        { line: 'Drei, sie ist der hellste Stern von allen', timestamp: 8 },
        { line: 'Vier, hier kommt die Sonne', timestamp: 12 },
      ],
    },
    vocabulary: ['Sonne', 'Stern', 'hell', 'kommen', 'alle'],
  },
  {
    id: 'kraftwerk-autobahn',
    title: 'Autobahn',
    artist: 'Kraftwerk',
    level: 'A1',
    genre: 'Electronic',
    year: 1974,
    cover: '🚗',
    color: '#4ADE80',
    lyrics: {
      original: [
        { line: 'Wir fahr\'n fahr\'n fahr\'n auf der Autobahn', timestamp: 0 },
        { line: 'Vor uns liegt ein weites Tal', timestamp: 4 },
        { line: 'Die Sonne scheint mit Glitzerstrahl', timestamp: 8 },
        { line: 'Die Fahrbahn ist ein graues Band', timestamp: 12 },
        { line: 'Weiße Streifen, grüner Rand', timestamp: 16 },
      ],
      german: [
        { line: 'Wir fahr\'n fahr\'n fahr\'n auf der Autobahn', timestamp: 0 },
        { line: 'Vor uns liegt ein weites Tal', timestamp: 4 },
        { line: 'Die Sonne scheint mit Glitzerstrahl', timestamp: 8 },
        { line: 'Die Fahrbahn ist ein graues Band', timestamp: 12 },
        { line: 'Weiße Streifen, grüner Rand', timestamp: 16 },
      ],
    },
    vocabulary: ['Autobahn', 'fahren', 'Sonne', 'Tal', 'grün'],
  },
  {
    id: 'peter-fox-alles-neu',
    title: 'Alles Neu',
    artist: 'Peter Fox',
    level: 'B1',
    genre: 'Hip-Hop',
    year: 2008,
    cover: '✨',
    color: '#818CF8',
    lyrics: {
      original: [
        { line: 'Ich steh auf Berlin', timestamp: 0 },
        { line: 'Weil ich von hier bin', timestamp: 4 },
        { line: 'Das ist mein Zuhause', timestamp: 8 },
        { line: 'Hier bin ich zu Hause', timestamp: 12 },
      ],
      german: [
        { line: 'Ich steh auf Berlin', timestamp: 0 },
        { line: 'Weil ich von hier bin', timestamp: 4 },
        { line: 'Das ist mein Zuhause', timestamp: 8 },
        { line: 'Hier bin ich zu Hause', timestamp: 12 },
      ],
    },
    vocabulary: ['Berlin', 'stehen', 'Zuhause', 'weil', 'hier'],
  },
  {
    id: 'cro-whatever',
    title: 'Easy',
    artist: 'Cro',
    level: 'A2',
    genre: 'Hip-Hop',
    year: 2012,
    cover: '🐼',
    color: '#FB923C',
    lyrics: {
      original: [
        { line: 'Das Leben ist schön', timestamp: 0 },
        { line: 'Auch wenn du es nicht siehst', timestamp: 4 },
        { line: 'Du musst nur schauen', timestamp: 8 },
        { line: 'Was vor dir liegt', timestamp: 12 },
      ],
      german: [
        { line: 'Das Leben ist schön', timestamp: 0 },
        { line: 'Auch wenn du es nicht siehst', timestamp: 4 },
        { line: 'Du musst nur schauen', timestamp: 8 },
        { line: 'Was vor dir liegt', timestamp: 12 },
      ],
    },
    vocabulary: ['Leben', 'schön', 'sehen', 'müssen', 'liegen'],
  },
];

/* ════════════════════════════════════════════
   INIT
════════════════════════════════════════════ */

export function initMusic(state) {
  appState = state;
  catalog  = SONGS_CATALOG;
  filteredCatalog = [...catalog];

  renderCatalog(filteredCatalog);
  bindMusicEvents();
}

/* ════════════════════════════════════════════
   CATALOG RENDERING
════════════════════════════════════════════ */

function renderCatalog(songs) {
  const container = $('music-catalog');
  const emptyEl   = $('music-empty');
  if (!container) return;

  if (songs.length === 0) {
    container.innerHTML = '';
    emptyEl?.classList.remove('hidden');
    return;
  }
  emptyEl?.classList.add('hidden');

  container.innerHTML = songs.map(song => `
    <button class="music-card" data-song-id="${song.id}" role="listitem"
      aria-label="Play ${song.title} by ${song.artist}">
      <div class="music-card__cover" style="--song-color: ${song.color}">
        <span class="music-card__emoji" aria-hidden="true">${song.cover}</span>
        <div class="music-card__play-overlay" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </div>
      </div>
      <div class="music-card__info">
        <p class="music-card__title">${song.title}</p>
        <p class="music-card__artist">${song.artist}</p>
        <div class="music-card__meta">
          <span class="music-card__genre">${song.genre}</span>
          <span class="music-card__level music-card__level--${song.level}">${song.level}</span>
        </div>
      </div>
    </button>
  `).join('');

  container.querySelectorAll('.music-card').forEach(card => {
    card.addEventListener('click', () => {
      const song = catalog.find(s => s.id === card.dataset.songId);
      if (song) openPlayer(song);
    });
  });
}

/* ════════════════════════════════════════════
   PLAYER
════════════════════════════════════════════ */

function openPlayer(song) {
  currentSong = song;
  currentMode = 'original';
  quizActive  = false;

  // Populate header
  const titleEl  = $('player-song-title');
  const artistEl = $('player-song-artist');
  const badgeEl  = $('player-level-badge');
  if (titleEl)  titleEl.textContent  = song.title;
  if (artistEl) artistEl.textContent = song.artist;
  if (badgeEl) {
    badgeEl.textContent = song.level;
    badgeEl.className   = `music-player__level-badge music-player__level-badge--${song.level}`;
  }

  // Reset toggles
  setToggleMode('original');

  // Render lyrics
  renderLyrics(song, currentMode);

  // Hide catalog, show player
  $('music-catalog')?.classList.add('hidden');
  $('music-filters')?.classList.add('hidden');
  $('music-header')?.classList.add('hidden');
  $('music-empty')?.classList.add('hidden');
  $('music-quiz')?.classList.add('hidden');
  $('music-player')?.classList.remove('hidden');
}

function closePlayer() {
  currentSong = null;
  $('music-player')?.classList.add('hidden');
  $('music-catalog')?.classList.remove('hidden');
  $('music-filters')?.classList.remove('hidden');
  $('music-header')?.classList.remove('hidden');
}

function renderLyrics(song, mode) {
  const lyricsEl = $('music-lyrics');
  if (!lyricsEl) return;

  const lines = mode === 'bilingual'
    ? song.lyrics.original.map((l, i) => ({
        original: l.line,
        german: song.lyrics.german[i]?.line || l.line,
      }))
    : (mode === 'german' ? song.lyrics.german : song.lyrics.original);

  if (mode === 'bilingual') {
    lyricsEl.innerHTML = lines.map((pair, i) => `
      <div class="lyric-pair" data-index="${i}">
        <p class="lyric-line lyric-line--original">${pair.original}</p>
        <p class="lyric-line lyric-line--german">${renderClickableWords(pair.german)}</p>
      </div>
    `).join('');
  } else {
    const isGerman = mode === 'german';
    lyricsEl.innerHTML = lines.map((l, i) => `
      <p class="lyric-line${isGerman ? ' lyric-line--german' : ''}" data-index="${i}">
        ${isGerman ? renderClickableWords(l.line) : escapeHtml(l.line)}
      </p>
    `).join('');
  }

  // Bind word click events on German lines
  lyricsEl.querySelectorAll('.lyric-word').forEach(word => {
    word.addEventListener('click', () => showWordPopup(word.dataset.word));
  });
}

function renderClickableWords(line) {
  return line.split(' ').map(word => {
    const clean = word.replace(/[^a-zA-ZäöüÄÖÜß]/g, '');
    if (!clean) return escapeHtml(word);
    return `<span class="lyric-word" data-word="${escapeAttr(clean)}" tabindex="0" role="button"
      aria-label="Look up ${escapeAttr(clean)}">${escapeHtml(word)}</span>`;
  }).join(' ');
}

/* ════════════════════════════════════════════
   WORD POPUP
════════════════════════════════════════════ */

async function showWordPopup(word) {
  const popup = $('music-word-popup');
  if (!popup) return;

  // Show loading state
  $('popup-word').textContent    = word;
  $('popup-article').textContent = '';
  $('popup-translation').textContent = '...';
  $('popup-example').textContent = '';
  popup.classList.remove('hidden');

  try {
    const nativeLang = appState?.nativeLang || 'en';
    const result = await lookupWord(word, nativeLang, 'English', appState?.geminiKey || '');

    $('popup-article').textContent     = result.article && result.article !== '-' ? result.article : '';
    $('popup-word').textContent        = result.word || word;
    $('popup-translation').textContent = result.nativeTranslation || '';
    $('popup-example').textContent     = result.examples?.[0]?.german || '';

    // Listen button
    $('popup-listen').onclick = () => speak(word, $('popup-listen'));

  } catch {
    $('popup-translation').textContent = 'Could not load definition.';
  }
}

/* ════════════════════════════════════════════
   QUIZ
════════════════════════════════════════════ */

function startQuiz() {
  if (!currentSong) return;
  quizActive = true;
  quizIndex  = 0;
  quizWords  = [...currentSong.vocabulary].sort(() => Math.random() - 0.5).slice(0, 5);

  $('music-lyrics')?.classList.add('hidden');
  $('music-player__actions')?.classList.add('hidden');
  $('music-quiz')?.classList.remove('hidden');

  renderQuizQuestion();
}

function renderQuizQuestion() {
  const questionEl = $('quiz-question');
  const optionsEl  = $('quiz-options');
  const progressEl = $('quiz-progress');
  const resultEl   = $('quiz-result');

  if (!questionEl || !optionsEl) return;

  if (quizIndex >= quizWords.length) {
    // Quiz complete
    questionEl.textContent = '🎉 Quiz complete!';
    optionsEl.innerHTML    = '';
    if (resultEl) {
      resultEl.textContent = `You completed all ${quizWords.length} words from "${currentSong.title}"!`;
      resultEl.classList.remove('hidden');
    }
    return;
  }

  const word = quizWords[quizIndex];
  if (progressEl) progressEl.textContent = `${quizIndex + 1} / ${quizWords.length}`;
  if (resultEl)   resultEl.classList.add('hidden');

  questionEl.innerHTML = `
    <p class="quiz-prompt">What does this word mean?</p>
    <p class="quiz-word">${word}</p>
  `;

  // Generate 4 options — 1 correct + 3 distractors from catalog vocabulary
  const allWords = catalog.flatMap(s => s.vocabulary).filter(w => w !== word);
  const distractors = allWords.sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [word, ...distractors].sort(() => Math.random() - 0.5);

  optionsEl.innerHTML = options.map(opt => `
    <button class="quiz-option" data-word="${escapeAttr(opt)}" role="listitem">
      ${escapeHtml(opt)}
    </button>
  `).join('');

  optionsEl.querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', () => handleQuizAnswer(btn, word));
  });
}

function handleQuizAnswer(btn, correctWord) {
  const isCorrect = btn.dataset.word === correctWord;

  // Disable all options
  document.querySelectorAll('.quiz-option').forEach(b => {
    b.disabled = true;
    if (b.dataset.word === correctWord) b.classList.add('quiz-option--correct');
    else if (b === btn && !isCorrect)    b.classList.add('quiz-option--wrong');
  });

  const resultEl = $('quiz-result');
  if (resultEl) {
    resultEl.textContent  = isCorrect ? '✅ Correct!' : `❌ The answer was: ${correctWord}`;
    resultEl.className    = `music-quiz__result ${isCorrect ? 'music-quiz__result--correct' : 'music-quiz__result--wrong'}`;
    resultEl.classList.remove('hidden');
  }

  setTimeout(() => {
    quizIndex++;
    renderQuizQuestion();
  }, 1500);
}

/* ════════════════════════════════════════════
   TOGGLE MODE
════════════════════════════════════════════ */

function setToggleMode(mode) {
  currentMode = mode;
  ['original', 'german', 'bilingual'].forEach(m => {
    const btn = $(`toggle-${m}`);
    if (btn) btn.setAttribute('aria-pressed', String(m === mode));
    btn?.classList.toggle('active', m === mode);
  });
  if (currentSong) renderLyrics(currentSong, mode);
}

/* ════════════════════════════════════════════
   EVENTS
════════════════════════════════════════════ */

function bindMusicEvents() {

  // Filter pills
  document.querySelectorAll('.music-level-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.music-level-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeLevel = pill.dataset.level;
      applyFilters();
    });
  });

  // Search
  $('music-search-input')?.addEventListener('input', applyFilters);

  // Player back button
  $('music-player-back')?.addEventListener('click', closePlayer);

  // Toggle buttons
  ['original', 'german', 'bilingual'].forEach(mode => {
    $(`toggle-${mode}`)?.addEventListener('click', () => setToggleMode(mode));
  });

  // Word popup close
  $('popup-close')?.addEventListener('click', () => {
    $('music-word-popup')?.classList.add('hidden');
  });

  // Quiz button
  $('music-quiz-btn')?.addEventListener('click', () => {
    if (quizActive) {
      // Return to lyrics
      quizActive = false;
      $('music-quiz')?.classList.add('hidden');
      $('music-lyrics')?.classList.remove('hidden');
    } else {
      startQuiz();
    }
  });

  // Pronounce button
  $('music-pronounce-btn')?.addEventListener('click', () => {
    if (!currentSong) return;
    const lines = currentSong.lyrics.german;
    const text  = lines.map(l => l.line).join('. ');
    speak(text, $('music-pronounce-btn'));
  });
}

/* ════════════════════════════════════════════
   FILTERING
════════════════════════════════════════════ */

function applyFilters() {
  const query = ($('music-search-input')?.value || '').toLowerCase().trim();

  filteredCatalog = catalog.filter(song => {
    const matchLevel  = activeLevel === 'all' || song.level === activeLevel;
    const matchSearch = !query ||
      song.title.toLowerCase().includes(query) ||
      song.artist.toLowerCase().includes(query) ||
      song.genre.toLowerCase().includes(query);
    return matchLevel && matchSearch;
  });

  renderCatalog(filteredCatalog);
}

/* ════════════════════════════════════════════
   UTILS
════════════════════════════════════════════ */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
