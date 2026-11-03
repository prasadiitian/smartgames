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
const ICON = {
  help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8M12 17h.01"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M9 5v14M15 5v14"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l4 6M21 9l-4 6"/></svg>',
};
export function wire(game, key) {
  const st = store(key + '.prefs');
  const prefs = st.get({ muted: false });
  audio.muted = prefs.muted;
  const bm = document.getElementById('btnMute'), bp = document.getElementById('btnPause');
  const paintM = () => { bm.innerHTML = ICON[audio.muted ? 'mute' : 'sound'] + `<span>${audio.muted ? 'Sound off' : 'Sound on'}</span>`; bm.setAttribute('aria-pressed', String(audio.muted)); };
  const paintP = () => { bp.innerHTML = ICON[game.paused ? 'play' : 'pause'] + `<span>${game.paused ? 'Resume' : 'Pause'}</span>`; };
  document.getElementById('btnHelp').innerHTML = ICON.help + '<span>How to play</span>';
  bm.onclick = () => { audio.muted = !audio.muted; st.set({ muted: audio.muted }); paintM(); };
  const setPaused = (p) => { game.paused = p; paintP(); const hint = document.getElementById('hint'); if (hint && p) hint.textContent = 'Paused'; };
  bp.onclick = () => setPaused(!game.paused);
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
  // First run: show "How to play" and hold the game until Play is pressed. The ? button reopens it any time.
  const help = document.getElementById('help'), play = document.getElementById('btnPlay'), seen = store(key + '.seen');
  const openHelp = () => { help.hidden = false; game.paused = true; paintP(); play.focus({ preventScroll: true }); };
  const closeHelp = () => { help.hidden = true; game.paused = false; paintP(); seen.set({ seen: true }); play.textContent = 'Continue'; };
  document.getElementById('btnHelp').onclick = openHelp;
  play.onclick = closeHelp;
  addEventListener('keydown', e => { if (e.key === 'Escape' && !help.hidden) closeHelp(); });
  paintM(); paintP();
  if (seen.get({ seen: false }).seen) play.textContent = 'Continue'; else openHelp();
  platform.init();
  return {
    setPlaying(on) { on ? platform.gameplayStart() : platform.gameplayStop(); },
  };
}
export function showOver(title, body, btnLabel, onAgain) {
  const o = document.getElementById('over');
  o.innerHTML = `<div class="card"><h2>${title}</h2><div class="big">${body}</div><button class="primary" id="again">${btnLabel}</button></div>`;
  o.hidden = false;
  document.getElementById('again').onclick = () => { o.hidden = true; onAgain(); };
}

// Score pill bump animation.
export function pulse(id) {
  const e = document.getElementById(id)?.parentElement; if (!e) return;
  e.classList.remove('pulse'); void e.offsetWidth; e.classList.add('pulse');
}
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const mix = (c1, c2, t) => c1.map((v, i) => Math.round(lerp(v, c2[i], t)));   // rgb arrays
export const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

// Particles and floating texts, drawn in logical canvas units.
export class Fx {
  constructor() { this.p = []; this.t = []; }
  burst(x, y, n, color, speed = 160, life = 0.6, size = 3) {
    n = Math.min(n, Math.max(0, 260 - this.p.length));
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = speed * (0.35 + Math.random() * 0.75); this.p.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.2, life, max: life, color, size: size * (0.6 + Math.random() * 0.8) }); }
  }
  text(x, y, str, color = '#fff', size = 20) { this.t.push({ x, y, str, color, size, life: 0.9, max: 0.9 }); }
  update(dt) {
    for (const q of this.p) { q.life -= dt; q.vy += 380 * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
    for (const q of this.t) { q.life -= dt; q.y -= 38 * dt; }
    this.p = this.p.filter(q => q.life > 0); this.t = this.t.filter(q => q.life > 0);
  }
  draw(ctx) {
    for (const q of this.p) { ctx.globalAlpha = Math.max(0, q.life / q.max); ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const q of this.t) {
      const k = q.life / q.max; ctx.globalAlpha = Math.min(1, k * 2.2); ctx.font = `800 ${q.size * (1 + (1 - k) * 0.25)}px Inter,system-ui,sans-serif`;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.strokeText(q.str, q.x, q.y); ctx.fillStyle = q.color; ctx.fillText(q.str, q.x, q.y);
    }
    ctx.globalAlpha = 1;
  }
}
// Deterministic star field for backgrounds.
export function stars(n, w, h, seed = 5) {
  const r = rng(seed), out = []; for (let i = 0; i < n; i++) out.push({ x: r() * w, y: r() * h, s: 0.4 + r() * 1.3, a: 0.25 + r() * 0.6, tw: r() * 6 }); return out;
}
