/**
 * games.js — Games Hub orchestrator
 * Manages the Games view, switching between the hub menu and specific games.
 */

import { get as getProgress } from './progress.js';
import { loadSettings } from './settings.js';
import { callAI } from './search.js';
import { fetchImage } from './images.js';

export function initGames() {
  const gamesHub = document.getElementById('games-hub');
  if (!gamesHub) return;

  const gameCards = gamesHub.querySelectorAll('.game-card');
  const backBtns = document.querySelectorAll('.game-back-btn');
  const gameAreas = document.querySelectorAll('.game-area');

  // Open specific game
  gameCards.forEach(card => {
    card.addEventListener('click', () => {
      const gameId = card.dataset.game;
      if (!gameId) return;

      // Hide hub
      gamesHub.classList.add('hidden');
      
      // Hide all game areas, then show the target one
      gameAreas.forEach(area => area.classList.add('hidden'));
      const targetArea = document.getElementById(`game-area-${gameId}`);
      if (targetArea) {
        targetArea.classList.remove('hidden');
      }

      // Initialize the chosen game
      if (gameId === 'quiz') startQuiz();
      else if (gameId === 'wasistdas') startWasIstDas();
      else if (gameId === 'correct') startCorrect();
      else if (gameId === 'hangman') startHangman();
    });
  });

  // Back button handling
  backBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      gameAreas.forEach(area => area.classList.add('hidden'));
      gamesHub.classList.remove('hidden');
    });
  });
}

function getWords(count = 5) {
  const hist = getProgress().searchHistory || [];
  
  // A large pool of default words so games are never repetitive
  const defaultWords = [
    { word: 'Hund', nativeTranslation: 'Dog' }, { word: 'Katze', nativeTranslation: 'Cat' },
    { word: 'Haus', nativeTranslation: 'House' }, { word: 'Wasser', nativeTranslation: 'Water' },
    { word: 'Apfel', nativeTranslation: 'Apple' }, { word: 'Brot', nativeTranslation: 'Bread' },
    { word: 'Käse', nativeTranslation: 'Cheese' }, { word: 'Milch', nativeTranslation: 'Milk' },
    { word: 'Buch', nativeTranslation: 'Book' }, { word: 'Tisch', nativeTranslation: 'Table' },
    { word: 'Stuhl', nativeTranslation: 'Chair' }, { word: 'Fenster', nativeTranslation: 'Window' },
    { word: 'Tür', nativeTranslation: 'Door' }, { word: 'Auto', nativeTranslation: 'Car' },
    { word: 'Fahrrad', nativeTranslation: 'Bicycle' }, { word: 'Zug', nativeTranslation: 'Train' },
    { word: 'Flugzeug', nativeTranslation: 'Airplane' }, { word: 'Baum', nativeTranslation: 'Tree' },
    { word: 'Blume', nativeTranslation: 'Flower' }, { word: 'Sonne', nativeTranslation: 'Sun' },
    { word: 'Mond', nativeTranslation: 'Moon' }, { word: 'Stern', nativeTranslation: 'Star' },
    { word: 'Stadt', nativeTranslation: 'City' }, { word: 'Straße', nativeTranslation: 'Street' },
    { word: 'Schule', nativeTranslation: 'School' }, { word: 'Arbeit', nativeTranslation: 'Work' },
    { word: 'Freund', nativeTranslation: 'Friend' }, { word: 'Familie', nativeTranslation: 'Family' },
    { word: 'Mutter', nativeTranslation: 'Mother' }, { word: 'Vater', nativeTranslation: 'Father' },
    { word: 'Kind', nativeTranslation: 'Child' }, { word: 'Geld', nativeTranslation: 'Money' },
    { word: 'Zeit', nativeTranslation: 'Time' }, { word: 'Uhr', nativeTranslation: 'Clock/Watch' },
    { word: 'Essen', nativeTranslation: 'Food' }, { word: 'Trinken', nativeTranslation: 'Drink' },
    { word: 'Fleisch', nativeTranslation: 'Meat' }, { word: 'Gemüse', nativeTranslation: 'Vegetable' },
    { word: 'Obst', nativeTranslation: 'Fruit' }, { word: 'Kaffee', nativeTranslation: 'Coffee' },
    { word: 'Tee', nativeTranslation: 'Tea' }, { word: 'Bier', nativeTranslation: 'Beer' },
    { word: 'Wein', nativeTranslation: 'Wine' }, { word: 'Schuh', nativeTranslation: 'Shoe' },
    { word: 'Hemd', nativeTranslation: 'Shirt' }, { word: 'Hose', nativeTranslation: 'Pants' },
    { word: 'Kleid', nativeTranslation: 'Dress' }, { word: 'Mantel', nativeTranslation: 'Coat' },
    { word: 'Hut', nativeTranslation: 'Hat' }, { word: 'Tasche', nativeTranslation: 'Bag' },
    { word: 'Brille', nativeTranslation: 'Glasses' }, { word: 'Kopf', nativeTranslation: 'Head' },
    { word: 'Hand', nativeTranslation: 'Hand' }, { word: 'Fuß', nativeTranslation: 'Foot' },
    { word: 'Auge', nativeTranslation: 'Eye' }, { word: 'Ohr', nativeTranslation: 'Ear' }
  ];

  // Combine history and defaults, ensuring variety
  let allWords = [...hist, ...defaultWords];

  // Clean words: strip leading articles (der, die, das, ein, eine) so games don't include them
  allWords = allWords.map(w => {
    let cleanWord = w.word.replace(/^(der|die|das|ein|eine)\s+/i, '').trim();
    return { ...w, word: cleanWord };
  });

  // Deduplicate by word
  const seen = new Set();
  const uniqueWords = [];
  for (const w of allWords) {
    const lower = w.word.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      uniqueWords.push(w);
    }
  }

  // Return requested count, randomized
  return uniqueWords.sort(() => 0.5 - Math.random()).slice(0, count);
}

// ================= QUIZ =================
function startQuiz() {
  const words = getWords(50);
  let currentQ = 0;
  let score = 0;
  
  const questionEl = document.getElementById('quiz-question');
  const optionsEl = document.getElementById('quiz-options');
  const progressEl = document.getElementById('quiz-progress');
  const resultEl = document.getElementById('quiz-result');
  const quizInner = document.getElementById('music-quiz');

  resultEl.classList.add('hidden');
  resultEl.innerHTML = '';
  optionsEl.classList.remove('hidden');
  questionEl.classList.remove('hidden');

  function renderQ() {
    if (currentQ >= words.length) {
      // Quiz over
      questionEl.classList.add('hidden');
      optionsEl.classList.add('hidden');
      resultEl.classList.remove('hidden');
      resultEl.innerHTML = `<h4>Quiz Completed!</h4><p>Score: ${score} / ${words.length}</p>`;
      return;
    }
    const currentWord = words[currentQ];
    progressEl.textContent = `${currentQ + 1} / ${words.length}`;
    questionEl.textContent = `What is the meaning of "${currentWord.word}"?`;

    // generate options
    let otherWords = getWords(8).filter(w => w.word !== currentWord.word);
    let options = [currentWord, ...otherWords.slice(0, 3)].sort(() => 0.5 - Math.random());
    
    optionsEl.innerHTML = '';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'music-quiz__option';
      btn.textContent = opt.nativeTranslation || opt.word;
      btn.onclick = () => {
        if (opt.word === currentWord.word) score++;
        currentQ++;
        renderQ();
      };
      optionsEl.appendChild(btn);
    });
  }

  if (words.length === 0) {
    questionEl.textContent = "Not enough words to play. Search some words first!";
    optionsEl.innerHTML = '';
    progressEl.textContent = '0 / 0';
  } else {
    renderQ();
  }
}

// ================= WAS IST DAS =================
async function startWasIstDas() {
  const area = document.getElementById('game-area-wasistdas');
  const words = getWords(4);
  const target = words[0];
  
  let html = `
    <div style="text-align: center; margin-top: 16px;">
      <h3 style="margin-bottom: 16px; color: var(--c-text-1);">Was ist das?</h3>
      <div id="wasistdas-img-container" style="width: 100%; height: 200px; border-radius: 12px; background: var(--c-surface-2); margin-bottom: 16px; display: flex; align-items: center; justify-content: center;">
        <span class="loader"><span class="loader__dot"></span><span class="loader__dot"></span><span class="loader__dot"></span></span>
      </div>
      <div id="wasistdas-options" style="display: flex; flex-direction: column; gap: 8px;"></div>
      <div id="wasistdas-result" style="margin-top: 16px; font-weight: bold; min-height: 24px;"></div>
    </div>
  `;
  
  // Only inject the dynamic content, not the back button which is already there
  let container = area.querySelector('.game-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'game-container';
    area.appendChild(container);
  }
  container.innerHTML = html;

  const imgContainer = document.getElementById('wasistdas-img-container');
  const optionsEl = document.getElementById('wasistdas-options');
  const resultEl = document.getElementById('wasistdas-result');

  // Fetch image
  const imgUrl = await fetchImage(target.word, loadSettings().unsplashKey);
  if (imgUrl) {
    imgContainer.innerHTML = `<img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">`;
  } else {
    imgContainer.innerHTML = `<span>(Image not found for ${target.word})</span>`;
  }

  // Options
  let options = [...words].sort(() => 0.5 - Math.random());
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'music-quiz__option';
    btn.textContent = opt.word;
    btn.onclick = () => {
      if (opt.word === target.word) {
        btn.style.borderColor = 'green';
        resultEl.textContent = 'Richtig! (Correct)';
        resultEl.style.color = 'green';
        setTimeout(startWasIstDas, 1500);
      } else {
        btn.style.borderColor = 'red';
        resultEl.textContent = 'Falsch! (Wrong)';
        resultEl.style.color = 'red';
      }
    };
    optionsEl.appendChild(btn);
  });
}

// ================= CORRECT THE SENTENCE =================
async function startCorrect() {
  const area = document.getElementById('game-area-correct');
  
  let container = area.querySelector('.game-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'game-container';
    area.appendChild(container);
  }
  
  container.innerHTML = `
    <div style="text-align: center; margin-top: 16px;">
      <h3 style="margin-bottom: 8px; color: var(--c-text-1);">Correct the Sentence</h3>
      <p style="color: var(--c-text-2); margin-bottom: 16px; font-size: 14px;">Find and fix the grammar error.</p>
      
      <div id="correct-loading" style="padding: 24px;">
        <span class="loader"><span class="loader__dot"></span><span class="loader__dot"></span><span class="loader__dot"></span></span>
      </div>

      <div id="correct-game" class="hidden">
        <div id="correct-sentence" style="font-size: 18px; margin-bottom: 16px; padding: 16px; background: var(--c-surface-2); border-radius: 8px;"></div>
        <input type="text" id="correct-input" class="search-bar__input" style="width: 100%; margin-bottom: 16px; padding: 12px; background: var(--c-surface-2); border: 1px solid var(--c-border); color: white; border-radius: 8px;" autocomplete="off" spellcheck="false" />
        <button id="correct-submit" class="btn-primary" style="width: 100%;">Check</button>
        <div id="correct-result" style="margin-top: 16px; font-weight: bold; min-height: 24px;"></div>
        <button id="correct-next" class="btn-secondary hidden" style="width: 100%; margin-top: 8px;">Next</button>
      </div>
    </div>
  `;

  const loading = document.getElementById('correct-loading');
  const game = document.getElementById('correct-game');
  const sentenceEl = document.getElementById('correct-sentence');
  const inputEl = document.getElementById('correct-input');
  const submitBtn = document.getElementById('correct-submit');
  const resultEl = document.getElementById('correct-result');
  const nextBtn = document.getElementById('correct-next');

  // Request AI
  const prompt = `Return a JSON object with two fields: "wrong" containing a very simple German sentence with exactly one basic grammatical or spelling error, and "correct" containing the fixed sentence. Example: {"wrong":"Ich bin Hunger", "correct":"Ich habe Hunger"}. Output ONLY raw JSON, no markdown.`;
  
  try {
    const raw = await callAI(loadSettings().geminiKey, prompt);
    const data = JSON.parse(raw);
    
    loading.classList.add('hidden');
    game.classList.remove('hidden');
    
    sentenceEl.textContent = data.wrong;
    inputEl.value = data.wrong;
    
    submitBtn.onclick = () => {
      const val = inputEl.value.trim();
      if (val === data.correct) {
        resultEl.textContent = 'Excellent!';
        resultEl.style.color = 'green';
        submitBtn.classList.add('hidden');
        nextBtn.classList.remove('hidden');
      } else {
        resultEl.textContent = 'Not quite. Try again!';
        resultEl.style.color = 'red';
      }
    };
    
    nextBtn.onclick = startCorrect;
    
  } catch (err) {
    loading.innerHTML = `<p style="color:red">Failed to generate sentence. Please try again.</p>`;
  }
}

// ================= HANGMAN =================
function startHangman() {
  const area = document.getElementById('game-area-hangman');
  const words = getWords(1);
  const word = words[0].word.toUpperCase();
  let guesses = [];
  let mistakes = 0;
  const maxMistakes = 6;
  
  let container = area.querySelector('.game-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'game-container';
    area.appendChild(container);
  }
  
  function render() {
    let wordDisplay = word.split('').map(char => {
      if (!char.match(/[A-ZÄÖÜß]/)) return char;
      return guesses.includes(char) ? char : '_';
    }).join(' ');

    const isWon = !wordDisplay.includes('_');
    const isLost = mistakes >= maxMistakes;

    let keyboardHTML = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß'.split('').map(char => {
      const isGuessed = guesses.includes(char);
      return `<button class="hangman-key" style="padding: 8px; margin: 2px; border-radius: 4px; background: var(--c-surface-3); border: none; color: white; cursor: pointer; opacity: ${isGuessed ? 0.5 : 1}" ${isGuessed || isWon || isLost ? 'disabled' : ''} data-char="${char}">${char}</button>`;
    }).join('');

    container.innerHTML = `
      <div style="text-align: center; margin-top: 16px;">
        <h3 style="margin-bottom: 8px; color: var(--c-text-1);">Hangman</h3>
        <p style="color: var(--c-text-2); margin-bottom: 16px; font-size: 14px;">${words[0].nativeTranslation || 'Guess the word'}</p>
        
        <div style="font-size: 24px; font-weight: bold; letter-spacing: 2px; margin-bottom: 24px;">
          ${wordDisplay}
        </div>
        
        <div style="margin-bottom: 16px; color: ${isLost ? 'red' : 'var(--c-text-2)'}">
          Mistakes: ${mistakes} / ${maxMistakes}
        </div>
        
        ${isWon ? `<div style="color: green; font-weight: bold; margin-bottom: 16px;">You won!</div>` : ''}
        ${isLost ? `<div style="color: red; font-weight: bold; margin-bottom: 16px;">Game Over. The word was ${word}.</div>` : ''}
        
        <div style="display: flex; flex-wrap: wrap; justify-content: center; max-width: 300px; margin: 0 auto;">
          ${keyboardHTML}
        </div>
        
        ${isWon || isLost ? `<button id="hangman-next" class="btn-primary" style="margin-top: 24px;">Next Word</button>` : ''}
      </div>
    `;

    container.querySelectorAll('.hangman-key').forEach(btn => {
      btn.onclick = () => {
        const char = btn.dataset.char;
        if (!guesses.includes(char)) {
          guesses.push(char);
          if (!word.includes(char)) mistakes++;
          render();
        }
      };
    });

    const nextBtn = document.getElementById('hangman-next');
    if (nextBtn) nextBtn.onclick = startHangman;
  }
  
  render();
}
