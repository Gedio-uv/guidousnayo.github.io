/**
 * music.js — Tolk Music Feature (YouTube Integration)
 * YouTube player, synced karaoke lyrics, word lookup, vocabulary quiz.
 */

import { lookupWord } from './search.js';
import { speak, stopSpeech } from './speech.js';

const YOUTUBE_API_KEY = ''; // Add your YouTube Data API v3 Key here

// ── State ──
let currentSong   = null;
let currentMode   = 'original'; // 'original' | 'german' | 'bilingual'
let quizActive    = false;
let quizWords     = [];
let quizIndex     = 0;
let appState      = null; // injected from app.js

let ytPlayer      = null;
let syncInterval  = null;
let currentActiveLineIndex = -1;

// ── DOM shortcuts ──
const $ = id => document.getElementById(id);

// ── Hardcoded Option B Suggestions ──
const YT_SUGGESTIONS = [
  {
    videoId: 'La4Dcd1aUcE',
    title: '99 Luftballons',
    artist: 'Nena',
    level: 'A2',
    lyrics: {
      original: [
        { line: 'Hast du etwas Zeit für mich', timestamp: 14 },
        { line: 'Dann singe ich ein Lied für dich', timestamp: 17 },
        { line: 'Von 99 Luftballons', timestamp: 20 },
        { line: 'Auf ihrem Weg zum Horizont', timestamp: 24 }
      ],
      german: [
        { line: 'Hast du etwas Zeit für mich', timestamp: 14 },
        { line: 'Dann singe ich ein Lied für dich', timestamp: 17 },
        { line: 'Von 99 Luftballons', timestamp: 20 },
        { line: 'Auf ihrem Weg zum Horizont', timestamp: 24 }
      ]
    },
    vocabulary: ['Luftballon', 'Horizont', 'singen', 'Zeit', 'Lied']
  },
  {
    videoId: 'StZcUAPRRac',
    title: 'Sonne',
    artist: 'Rammstein',
    level: 'B1',
    lyrics: {
      original: [
        { line: 'Eins, hier kommt die Sonne', timestamp: 35 },
        { line: 'Zwei, hier kommt die Sonne', timestamp: 39 },
        { line: 'Drei, sie ist der hellste Stern von allen', timestamp: 43 },
        { line: 'Vier, hier kommt die Sonne', timestamp: 47 }
      ],
      german: [
        { line: 'Eins, hier kommt die Sonne', timestamp: 35 },
        { line: 'Zwei, hier kommt die Sonne', timestamp: 39 },
        { line: 'Drei, sie ist der hellste Stern von allen', timestamp: 43 },
        { line: 'Vier, hier kommt die Sonne', timestamp: 47 }
      ]
    },
    vocabulary: ['Sonne', 'Stern', 'hell', 'kommen', 'alle']
  },
  {
    videoId: 'iukUNxnC2xw',
    title: 'Autobahn',
    artist: 'Kraftwerk',
    level: 'A1',
    lyrics: {
      original: [
        { line: 'Wir fahr\'n fahr\'n fahr\'n auf der Autobahn', timestamp: 60 },
        { line: 'Vor uns liegt ein weites Tal', timestamp: 65 },
        { line: 'Die Sonne scheint mit Glitzerstrahl', timestamp: 70 },
        { line: 'Die Fahrbahn ist ein graues Band', timestamp: 75 },
        { line: 'Weiße Streifen, grüner Rand', timestamp: 80 }
      ],
      german: [
        { line: 'Wir fahr\'n fahr\'n fahr\'n auf der Autobahn', timestamp: 60 },
        { line: 'Vor uns liegt ein weites Tal', timestamp: 65 },
        { line: 'Die Sonne scheint mit Glitzerstrahl', timestamp: 70 },
        { line: 'Die Fahrbahn ist ein graues Band', timestamp: 75 },
        { line: 'Weiße Streifen, grüner Rand', timestamp: 80 }
      ]
    },
    vocabulary: ['Autobahn', 'fahren', 'Sonne', 'Tal', 'grün']
  },
  {
    videoId: 'qdtLCfEcPL4',
    title: 'Alles Neu',
    artist: 'Peter Fox',
    level: 'B1',
    lyrics: {
      original: [
        { line: 'Ich steh auf Berlin', timestamp: 15 },
        { line: 'Weil ich von hier bin', timestamp: 18 },
        { line: 'Das ist mein Zuhause', timestamp: 20 },
        { line: 'Hier bin ich zu Hause', timestamp: 22 }
      ],
      german: [
        { line: 'Ich steh auf Berlin', timestamp: 15 },
        { line: 'Weil ich von hier bin', timestamp: 18 },
        { line: 'Das ist mein Zuhause', timestamp: 20 },
        { line: 'Hier bin ich zu Hause', timestamp: 22 }
      ]
    },
    vocabulary: ['Berlin', 'stehen', 'Zuhause', 'weil', 'hier']
  },
  {
    videoId: '4wOoLLDXbOU',
    title: 'Easy',
    artist: 'Cro',
    level: 'A2',
    lyrics: {
      original: [
        { line: 'Das Leben ist schön', timestamp: 20 },
        { line: 'Auch wenn du es nicht siehst', timestamp: 23 },
        { line: 'Du musst nur schauen', timestamp: 25 },
        { line: 'Was vor dir liegt', timestamp: 27 }
      ],
      german: [
        { line: 'Das Leben ist schön', timestamp: 20 },
        { line: 'Auch wenn du es nicht siehst', timestamp: 23 },
        { line: 'Du musst nur schauen', timestamp: 25 },
        { line: 'Was vor dir liegt', timestamp: 27 }
      ]
    },
    vocabulary: ['Leben', 'schön', 'sehen', 'müssen', 'liegen']
  }
];

/* ════════════════════════════════════════════
   INIT & YOUTUBE API LOADER
════════════════════════════════════════════ */

export function initMusic(state) {
  appState = state;
  loadYouTubeAPI();
  renderSuggestions();
  bindMusicEvents();
}

function loadYouTubeAPI() {
  if (window.YT && window.YT.Player) return;
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// Called automatically by YT API when ready
window.onYouTubeIframeAPIReady = function() {
  ytPlayer = new window.YT.Player('yt-player', {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 1,
      modestbranding: 1,
      rel: 0
    },
    events: {
      'onStateChange': onPlayerStateChange
    }
  });
};

/* ════════════════════════════════════════════
   SUGGESTIONS RENDERING
════════════════════════════════════════════ */

function renderSuggestions() {
  const container = $('yt-suggestions');
  if (!container) return;

  container.innerHTML = YT_SUGGESTIONS.map(song => `
    <div class="yt-suggestion-card" data-video-id="${song.videoId}" role="button" tabindex="0" aria-label="Play ${song.title} by ${song.artist}">
      <div class="yt-suggestion-card__meta">
        <span class="yt-suggestion-card__title">${song.title}</span>
        <span class="yt-suggestion-card__artist">${song.artist}</span>
      </div>
      <span class="yt-suggestion-card__level yt-suggestion-card__level--${song.level}">${song.level}</span>
    </div>
  `).join('');

  container.querySelectorAll('.yt-suggestion-card').forEach(card => {
    card.addEventListener('click', () => {
      loadSong(card.dataset.videoId);
    });
  });
}

/* ════════════════════════════════════════════
   LOAD SONG & SYNC
════════════════════════════════════════════ */

function extractVideoId(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? match[1] : null;
}

function loadSong(videoIdOrUrl) {
  const videoId = extractVideoId(videoIdOrUrl) || videoIdOrUrl;
  const errorMsg = $('yt-error-msg');
  if (errorMsg) errorMsg.classList.add('hidden');

  if (!videoId || videoId.length !== 11) {
    if (errorMsg) {
      errorMsg.textContent = 'Invalid YouTube link. Please check the URL.';
      errorMsg.classList.remove('hidden');
    }
    return;
  }

  // Check if it's a known suggestion (Option B logic)
  const knownSong = YT_SUGGESTIONS.find(s => s.videoId === videoId);
  
  if (!knownSong) {
    // Arbitrary public video
    if (errorMsg) {
      errorMsg.textContent = 'No German subtitles found for this video. Try another song or use a recommended one.';
      errorMsg.classList.remove('hidden');
    }
    return;
  }

  openPlayer(knownSong);
}

function onPlayerStateChange(event) {
  if (event.data === window.YT.PlayerState.PLAYING) {
    startSync();
  } else {
    stopSync();
  }
}

function startSync() {
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(() => {
    if (!ytPlayer || !ytPlayer.getCurrentTime || !currentSong) return;
    const time = ytPlayer.getCurrentTime();
    syncLyricsToTime(time);
  }, 250); // Poll every 250ms
}

function stopSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

function syncLyricsToTime(time) {
  if (!currentSong) return;
  const lines = currentSong.lyrics.german;
  let activeIndex = -1;

  // Find the last line whose timestamp is <= current time
  for (let i = 0; i < lines.length; i++) {
    if (time >= lines[i].timestamp) {
      activeIndex = i;
    } else {
      break;
    }
  }

  if (activeIndex !== currentActiveLineIndex) {
    // Remove old highlights
    document.querySelectorAll('.lyric-line--active, .lyric-pair--active').forEach(el => {
      el.classList.remove('lyric-line--active', 'lyric-pair--active');
    });

    if (activeIndex >= 0) {
      const lineEls = document.querySelectorAll(`[data-index="${activeIndex}"]`);
      lineEls.forEach(el => {
        if (el.classList.contains('lyric-pair')) el.classList.add('lyric-pair--active');
        else el.classList.add('lyric-line--active');
        
        // Only scroll if we changed lines to avoid jitter
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
    currentActiveLineIndex = activeIndex;
  }
}

/* ════════════════════════════════════════════
   PLAYER UI
════════════════════════════════════════════ */

function openPlayer(song) {
  currentSong = song;
  currentMode = 'original';
  quizActive  = false;
  currentActiveLineIndex = -1;

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

  // Load video into iframe
  if (ytPlayer && ytPlayer.loadVideoById) {
    ytPlayer.loadVideoById(song.videoId);
  }

  // Reset toggles
  setToggleMode('original');

  // Render lyrics
  renderLyrics(song, currentMode);

  // Hide input section, show player
  $('yt-section')?.classList.add('hidden');
  $('music-quiz')?.classList.add('hidden');
  $('music-player')?.classList.remove('hidden');
}

function closePlayer() {
  stopSync();
  if (ytPlayer && ytPlayer.stopVideo) {
    ytPlayer.stopVideo();
  }
  currentSong = null;
  $('music-player')?.classList.add('hidden');
  $('yt-section')?.classList.remove('hidden');
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

function renderClickableWords(text) {
  return text.split(' ').map(w => {
    const clean = w.replace(/[^a-zA-ZäöüßÄÖÜ]/g, '');
    if (clean.length > 2) {
      return `<span class="lyric-word" data-word="${clean}">${w}</span>`;
    }
    return w;
  }).join(' ');
}

/* ════════════════════════════════════════════
   WORD LOOKUP POPUP
════════════════════════════════════════════ */

async function showWordPopup(word) {
  const popup = $('music-word-popup');
  if (!popup) return;

  const popupWord    = $('popup-word');
  const popupArticle = $('popup-article');
  const popupMeaning = $('popup-meaning');
  const popupLevel   = $('popup-level');
  
  // Quick reset
  if (popupWord) popupWord.textContent = word;
  if (popupArticle) popupArticle.textContent = '';
  if (popupMeaning) popupMeaning.textContent = 'Translating...';
  if (popupLevel) popupLevel.textContent = '';
  
  popup.classList.remove('hidden');

  try {
    const data = await lookupWord(word);
    if (!data || data.error) throw new Error(data?.error || 'Not found');
    
    if (popupWord) popupWord.textContent = data.word || word;
    if (popupArticle) popupArticle.textContent = data.article ? `${data.article} ` : '';
    if (popupMeaning) popupMeaning.textContent = data.translation || data.meaning;
    if (popupLevel && data.level) {
      popupLevel.textContent = data.level;
      popupLevel.className = `music-word-popup__level music-word-popup__level--${data.level}`;
    }
  } catch (err) {
    if (popupMeaning) popupMeaning.textContent = 'Translation not available.';
  }
}

/* ════════════════════════════════════════════
   QUIZ
════════════════════════════════════════════ */

function startQuiz() {
  if (!currentSong) return;
  quizActive = true;
  quizIndex  = 0;
  quizWords  = shuffle([...(currentSong.vocabulary || [])]).slice(0, 5);

  if (quizWords.length < 3) {
    alert("Not enough vocabulary words to generate a quiz.");
    quizActive = false;
    return;
  }

  $('music-lyrics')?.classList.add('hidden');
  $('music-quiz')?.classList.remove('hidden');
  
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const container = $('music-quiz');
  if (!container) return;

  if (quizIndex >= quizWords.length) {
    // End of quiz
    container.innerHTML = `
      <div class="music-quiz__complete">
        <h3>🎉 Quiz Complete!</h3>
        <p>You practiced ${quizWords.length} words from this song.</p>
        <button id="quiz-done-btn" class="btn-primary" style="margin-top: 16px;">Back to Lyrics</button>
      </div>
    `;
    $('quiz-done-btn')?.addEventListener('click', () => {
      quizActive = false;
      $('music-quiz')?.classList.add('hidden');
      $('music-lyrics')?.classList.remove('hidden');
    });
    return;
  }

  const targetWord = quizWords[quizIndex];
  
  // Generate options (1 correct, 3 random wrong from the rest of the vocab)
  const pool = (currentSong.vocabulary || []).filter(w => w !== targetWord);
  const wrongOptions = shuffle(pool).slice(0, 3);
  const options = shuffle([targetWord, ...wrongOptions]);

  container.innerHTML = `
    <div class="music-quiz__header">
      <p class="music-quiz__progress">Question ${quizIndex + 1} of ${quizWords.length}</p>
      <h3 class="music-quiz__question">What does this word mean?</h3>
      <div class="music-quiz__target">${targetWord}</div>
    </div>
    <div class="music-quiz__options">
      ${options.map(opt => `<button class="quiz-option" data-word="${opt}">Translating ${opt}...</button>`).join('')}
    </div>
    <div id="quiz-result" class="music-quiz__result hidden"></div>
  `;

  // Fetch meanings for buttons asynchronously to mock the translation UI
  const btns = container.querySelectorAll('.quiz-option');
  btns.forEach(async btn => {
    const word = btn.dataset.word;
    try {
      const data = await lookupWord(word);
      btn.textContent = data.translation || word;
    } catch {
      btn.textContent = word; // fallback
    }
    btn.addEventListener('click', () => handleQuizAnswer(btn, targetWord));
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
    resultEl.textContent  = isCorrect ? '✅ Correct!' : \`❌ The answer was: \${correctWord}\`;
    resultEl.className    = \`music-quiz__result \${isCorrect ? 'music-quiz__result--correct' : 'music-quiz__result--wrong'}\`;
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
    const btn = $(\`toggle-\${m}\`);
    if (btn) btn.setAttribute('aria-pressed', String(m === mode));
    btn?.classList.toggle('active', m === mode);
  });
  if (currentSong) {
    renderLyrics(currentSong, mode);
  }
}

/* ════════════════════════════════════════════
   EVENTS
════════════════════════════════════════════ */

function bindMusicEvents() {
  // YT Link Loader
  $('yt-load-btn')?.addEventListener('click', () => {
    const val = $('yt-link-input')?.value;
    if (val) loadSong(val);
  });

  // Player back button
  $('music-player-back')?.addEventListener('click', closePlayer);

  // Toggle buttons
  ['original', 'german', 'bilingual'].forEach(mode => {
    $(\`toggle-\${mode}\`)?.addEventListener('click', () => setToggleMode(mode));
  });

  // Word popup close
  $('popup-close')?.addEventListener('click', () => {
    $('music-word-popup')?.classList.add('hidden');
  });

  // Word popup listen (speak)
  $('popup-listen')?.addEventListener('click', () => {
    const word = $('popup-word')?.textContent;
    if (word) speak(word);
  });

  // Quiz button
  $('music-quiz-btn')?.addEventListener('click', () => {
    if (quizActive) {
      quizActive = false;
      $('music-quiz')?.classList.add('hidden');
      $('music-lyrics')?.classList.remove('hidden');
    } else {
      startQuiz();
    }
  });
  
  // Hide the old Pronounce button since YouTube provides the audio
  const pronounceBtn = $('music-pronounce-btn');
  if (pronounceBtn) {
    pronounceBtn.style.display = 'none';
  }
}

/* ════════════════════════════════════════════
   UTILS
════════════════════════════════════════════ */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}
