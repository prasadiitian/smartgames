// Tiny synthesized sound effects (Web Audio, no files). Combo sounds climb a pentatonic scale.
let ctx = null;
let muted = false;
const PENTA = [0, 2, 4, 7, 9];
export const noteFreq = (n, base = 330) => base * Math.pow(2, (PENTA[n % 5] + 12 * Math.floor(n / 5)) / 12);

export function setMuted(m) { muted = !!m; }
export function unlock() {
  try {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (C) ctx = new C(); }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  } catch (e) { ctx = null; }
}

function blip(freq, dur, type = 'sine', vol = 0.05, slide = 0, delay = 0) {
  if (muted || !ctx) return;
  try {
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.03);
  } catch (e) { /* ignore */ }
}

export const sfx = {
  tap: (c = 0) => blip(noteFreq(Math.min(c, 14)), 0.09, 'triangle', 0.05),
  buy: (c = 0) => { const f = noteFreq(Math.min(c, 14), 260); blip(f, 0.09, 'square', 0.03); blip(f * 1.5, 0.14, 'square', 0.03, 0, 0.07); },
  bond: (c = 0) => { blip(noteFreq(Math.min(c, 14), 520), 0.06, 'sine', 0.035); blip(noteFreq(Math.min(c, 14), 520) * 2, 0.08, 'sine', 0.02, 0, 0.04); },
  deny: () => blip(150, 0.12, 'sawtooth', 0.03, -40),
  unstable: () => { blip(300, 0.25, 'sine', 0.05, 300); blip(300, 0.25, 'sine', 0.05, 300, 0.3); },
  stabilise: () => { blip(600, 0.1, 'triangle', 0.05); blip(900, 0.18, 'triangle', 0.05, 0, 0.08); },
  overWin: () => [392, 523, 659, 784, 1046].forEach((f, i) => blip(f, 0.16, 'square', 0.04, 0, i * 0.07)),
  overLose: () => blip(220, 0.4, 'sawtooth', 0.05, -160),
  perfect: () => [523, 659, 784].forEach((f, i) => blip(f, 0.14, 'triangle', 0.05, 0, i * 0.06)),
  goal: () => [523, 659, 784, 1046].forEach((f, i) => blip(f, 0.12, 'triangle', 0.045, 0, i * 0.06)),
  rare: () => [784, 988, 1175, 1568].forEach((f, i) => blip(f, 0.2, 'sine', 0.05, 0, i * 0.06)),
  reveal: () => { [262, 330, 392, 523, 659, 784].forEach((f, i) => blip(f, 0.22, 'triangle', 0.05, 0, i * 0.08)); blip(130, 0.6, 'sine', 0.06, 0, 0); },
  phase: () => { [392, 523, 659, 784, 1046].forEach((f, i) => blip(f, 0.3, 'triangle', 0.05, 0, i * 0.11)); },
};
