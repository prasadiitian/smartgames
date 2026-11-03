// Tiny synthesized sound effects (Web Audio, no files).
let ctx = null;
let muted = false;

export function setMuted(m) { muted = !!m; }
export function unlock() {
  try {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (C) ctx = new C(); }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  } catch (e) { ctx = null; }
}

function blip(freq, dur, type = 'sine', vol = 0.05, slide = 0) {
  if (muted || !ctx) return;
  try {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch (e) { /* ignore */ }
}

export const sfx = {
  tap: () => blip(520 + Math.random() * 120, 0.07, 'triangle', 0.04),
  buy: () => { blip(440, 0.08, 'square', 0.03); setTimeout(() => blip(660, 0.1, 'square', 0.03), 70); },
  deny: () => blip(150, 0.12, 'sawtooth', 0.03, -40),
  unstable: () => blip(300, 0.25, 'sine', 0.05, 300),
  stabilise: () => { blip(600, 0.1, 'triangle', 0.05); setTimeout(() => blip(900, 0.18, 'triangle', 0.05), 80); },
  phase: () => { [392, 523, 659, 784].forEach((f, i) => setTimeout(() => blip(f, 0.2, 'triangle', 0.05), i * 110)); },
};
