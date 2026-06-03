/**
 * speech.js — Web Speech API module
 * Handles German TTS pronunciation.
 */

let currentUtterance = null;
let speechRate = 0.9;

/**
 * Set the speech rate (0.5 – 1.5)
 */
export function setSpeechRate(rate) {
  speechRate = parseFloat(rate);
}

/**
 * Get available German voices.
 */
function getGermanVoice() {
  const voices = window.speechSynthesis.getVoices();
  // Prefer high-quality de-DE voices
  const preferred = voices.find(v => v.lang === 'de-DE' && v.localService);
  const fallback  = voices.find(v => v.lang === 'de-DE');
  const anyDE     = voices.find(v => v.lang.startsWith('de'));
  return preferred || fallback || anyDE || null;
}

/**
 * Speak a German word or sentence.
 * @param {string} text - German text to speak
 * @param {HTMLButtonElement} [btn] - Button to animate (optional)
 */
export function speak(text, btn = null) {
  if (!window.speechSynthesis) {
    console.warn('Web Speech API not supported');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang  = 'de-DE';
  utterance.rate  = speechRate;
  utterance.pitch = 1.0;

  // Try to set a German voice
  const voice = getGermanVoice();
  if (voice) utterance.voice = voice;

  // Animate button
  if (btn) {
    btn.classList.add('playing');
    utterance.onend   = () => btn.classList.remove('playing');
    utterance.onerror = () => btn.classList.remove('playing');
  }

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

/**
 * Stop any ongoing speech.
 */
export function stopSpeech() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Voices might not be available immediately on page load.
 * Call this to ensure voices are loaded.
 */
export function initSpeech() {
  return new Promise(resolve => {
    if (typeof window.speechSynthesis === 'undefined') {
      resolve(false);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(true);
    } else {
      window.speechSynthesis.onvoiceschanged = () => resolve(true);
      // Timeout fallback
      setTimeout(() => resolve(true), 2000);
    }
  });
}
