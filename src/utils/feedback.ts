// Audio synthesizer for warehouse scanner beeps using Web Audio API

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * High-pitch double chirp resembling an industrial barcode terminal.
 */
export function playScanSuccessSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;

    osc.frequency.setValueAtTime(1760, now); // A6 note
    osc.frequency.setValueAtTime(2349.32, now + 0.08); // D7 note

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  } catch {
    // Graceful fallback if audio is blocked
  }
}

/**
 * Low pitch buzz for errors (e.g. stock insufficient, barcode not found).
 */
export function playScanErrorSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    const now = ctx.currentTime;

    osc.frequency.setValueAtTime(220, now); // A3 note
    osc.frequency.setValueAtTime(164.81, now + 0.12); // E3

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // Graceful fallback
  }
}

/**
 * Native mobile device vibration for tactile feedback.
 */
export function triggerHaptic(type: 'success' | 'warning' | 'error' = 'success'): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (type === 'success') {
        navigator.vibrate([40, 30, 60]);
      } else if (type === 'warning') {
        navigator.vibrate([100, 50, 100]);
      } else {
        navigator.vibrate([200, 100, 200]);
      }
    } catch {
      // Ignore vibration error
    }
  }
}
