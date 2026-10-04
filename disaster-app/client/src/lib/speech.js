/**
 * Web Speech API wrapper for voice turn guidance.
 *
 * Speech synthesis is unavailable or muted in several browsers, and some
 * require a user gesture first. Every call is guarded so evacuation guidance
 * keeps working visually even when audio does not.
 */

let enabled = true;
let lastSpoken = '';

export function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function setSpeechEnabled(value) {
  enabled = Boolean(value);
  if (!enabled) cancelSpeech();
}

export function isSpeechEnabled() {
  return enabled;
}

/** Picks an English voice when one is available, otherwise the default. */
function pickVoice() {
  try {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    return (
      voices.find((voice) => /^en[-_]IN/i.test(voice.lang)) ??
      voices.find((voice) => /^en/i.test(voice.lang)) ??
      null
    );
  } catch {
    return null;
  }
}

/**
 * Speaks a phrase.
 * `force` repeats a phrase that was already spoken, used for re-routes.
 */
export function speak(text, { force = false } = {}) {
  if (!enabled || !text || !isSpeechSupported()) return;
  if (!force && text === lastSpoken) return;

  try {
    const synth = window.speechSynthesis;
    // Replace rather than queue, so guidance never lags behind the user.
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? 'en-IN';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    synth.speak(utterance);
    lastSpoken = text;
  } catch {
    // Audio guidance is a convenience, never a requirement.
  }
}

export function cancelSpeech() {
  try {
    if (isSpeechSupported()) window.speechSynthesis.cancel();
    lastSpoken = '';
  } catch {
    // Nothing to do.
  }
}

export function resetSpokenHistory() {
  lastSpoken = '';
}
