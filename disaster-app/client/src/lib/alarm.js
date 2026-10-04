/**
 * Alarm tone generated with the Web Audio API so no audio file is required.
 * Browsers block audio until the user interacts with the page, so failures are
 * swallowed quietly rather than surfaced as errors.
 */

let audioContext = null;

function getContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContextClass();
  }
  return audioContext;
}

/**
 * Plays a short two-tone alert pattern.
 * `cycles` controls how many times the pattern repeats.
 */
export function playAlarm(cycles = 3) {
  try {
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const beepDuration = 0.22;
    const gap = 0.08;
    const frequencies = [880, 660];

    for (let cycle = 0; cycle < cycles; cycle += 1) {
      frequencies.forEach((frequency, index) => {
        const startAt =
          ctx.currentTime + cycle * 2 * (beepDuration + gap) + index * (beepDuration + gap);
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(frequency, startAt);

        // Short fades prevent the click that an abrupt start or stop produces.
        gain.gain.setValueAtTime(0, startAt);
        gain.gain.linearRampToValueAtTime(0.12, startAt + 0.01);
        gain.gain.linearRampToValueAtTime(0, startAt + beepDuration);

        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(startAt);
        oscillator.stop(startAt + beepDuration + 0.02);
      });
    }
  } catch {
    // Audio is a secondary channel; the visual alert remains authoritative.
  }
}

export function vibrate(pattern = [300, 150, 300, 150, 300]) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // Vibration is unsupported on desktop browsers.
  }
}

/** Combined critical-alert feedback. */
export function raiseAlarm() {
  playAlarm(3);
  vibrate();
}
