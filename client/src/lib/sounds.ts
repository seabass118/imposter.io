// Simple sound effects using Web Audio API — no external files needed

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available — silently ignore
  }
}

export const sounds = {
  join: () => playTone(660, 0.15, 'sine'),
  start: () => {
    playTone(523, 0.12, 'square', 0.1);
    setTimeout(() => playTone(659, 0.12, 'square', 0.1), 120);
    setTimeout(() => playTone(784, 0.2, 'square', 0.1), 240);
  },
  submit: () => playTone(880, 0.1, 'sine'),
  vote: () => playTone(440, 0.15, 'triangle'),
  win: () => {
    playTone(523, 0.15, 'sine', 0.12);
    setTimeout(() => playTone(659, 0.15, 'sine', 0.12), 150);
    setTimeout(() => playTone(784, 0.3, 'sine', 0.12), 300);
  },
  lose: () => {
    playTone(400, 0.2, 'sawtooth', 0.08);
    setTimeout(() => playTone(300, 0.3, 'sawtooth', 0.08), 200);
  },
  tick: () => playTone(1000, 0.05, 'sine', 0.05),
  error: () => playTone(200, 0.3, 'sawtooth', 0.1),
};
