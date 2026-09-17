// Web Audio API procedural sound synthesizer for realistic tactile chess moves
let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function initAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Unlock audio on very first user interaction anywhere on the window
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    initAudioContext();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('click', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
  window.addEventListener('click', unlockAudio);
}

export function toggleSound(): boolean {
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
    initAudioContext();
    // Play test confirmation pop
    playMoveSound(false, false);
  }
  return soundEnabled;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function playMoveSound(isCapture = false, isCheck = false) {
  if (!soundEnabled) return;
  const ctx = initAudioContext();
  if (!ctx) return;

  // Ensure context is running
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      triggerSound(ctx, isCapture, isCheck);
    }).catch(() => {});
    return;
  }

  triggerSound(ctx, isCapture, isCheck);
}

function triggerSound(ctx: AudioContext, isCapture: boolean, isCheck: boolean) {
  try {
    const now = ctx.currentTime;

    if (isCheck) {
      // Harmonic alert chord (two resonant sine oscillators)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      osc2.frequency.setValueAtTime(440, now);    // A4
      osc2.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // E5

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } else if (isCapture) {
      // Snappy wood-on-wood impact (low thud + bright click)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.09);

      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.11);
    } else {
      // Tactile wooden chess piece placement tap
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.07);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    }
  } catch {
    // Ignore audio exceptions
  }
}
