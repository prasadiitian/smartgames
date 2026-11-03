// Shared helpers for the small games: storage, audio, canvas fit, seeded rng, pause/mute wiring.
import platform from './platform.js';
export { platform };

export function store(key) {
  return {
    get(def) { try { const v = localStorage.getItem(key); return v ? { ...def, ...JSON.parse(v) } : def; } catch { return def; } },
    set(v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage blocked */ } },
  };
}

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

let actx = null;
export const audio = { muted: false };
export function beep(freq = 440, dur = 0.08, type = 'sine', vol = 0.07) {
  if (audio.muted) return;
  try {
    actx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + dur);
  } catch { /* audio unavailable */ }
}
// pentatonic step -> frequency, so combos rise in pitch
export const note = (step) => 261.63 * Math.pow(2, [0, 2, 4, 7, 9][step % 5] / 12 + Math.floor(step / 5));

// Size a canvas for a logical w x h, scaled for device pixels. Returns the 2d context drawn in logical units.
export function fitCanvas(cv, w, h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = w * dpr; cv.height = h * dpr;
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const stage = cv.parentElement;
  const scale = Math.min(stage.clientWidth / w, stage.clientHeight / h);
  cv.style.width = Math.floor(w * scale) + 'px'; cv.style.height = Math.floor(h * scale) + 'px';
  return ctx;
}
// Convert a pointer event to logical canvas coordinates.
export function pointer(cv, e, w, h) {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * w, y: (e.clientY - r.top) / r.height * h };
}

// Wires #btnMute, #btnPause, auto-pause on tab hide, and platform gameplay hooks.
// game = { paused:boolean }; returns { setPlaying(bool) }.
export function wire(game, key) {
  const st = store(key + '.prefs');
  const prefs = st.get({ muted: false });
  audio.muted = prefs.muted;
  const bm = document.getElementById('btnMute'), bp = document.getElementById('btnPause');
  const paintM = () => { bm.textContent = audio.muted ? 'Sound off' : 'Sound on'; bm.setAttribute('aria-pressed', String(audio.muted)); };
  const paintP = () => { bp.textContent = game.paused ? 'Resume' : 'Pause'; };
  bm.onclick = () => { audio.muted = !audio.muted; st.set({ muted: audio.muted }); paintM(); };
  const setPaused = (p) => { game.paused = p; paintP(); const hint = document.getElementById('hint'); if (hint && p) hint.textContent = 'Paused'; };
  bp.onclick = () => setPaused(!game.paused);
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
  paintM(); paintP();
  platform.init();
  return {
    setPlaying(on) { on ? platform.gameplayStart() : platform.gameplayStop(); },
  };
}
export function showOver(title, body, btnLabel, onAgain) {
  const o = document.getElementById('over');
  o.innerHTML = `<h2>${title}</h2><div>${body}</div><button class="primary" id="again">${btnLabel}</button>`;
  o.hidden = false;
  document.getElementById('again').onclick = () => { o.hidden = true; onAgain(); };
}
