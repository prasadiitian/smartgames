import { store, rng, beep, note, fitCanvas, wire, showOver, pulse, Fx, stars } from './kit.js';
import { N, TIERS, emptyBoard, move, spawn, canMove, maxTier } from './logic.js';

const W = 360, H = 360, GAP = 8, CELL = (W - GAP * (N + 1)) / N;
const COL = ['#2b3447', '#a9b6cc', '#d1a97a', '#9d9189', '#eadf9f', '#6ec3f2', '#5fd6a0', '#f0675c', '#f4a83d', '#ffe066', '#c58bff', '#ffffff'];
const DARK_TEXT = new Set([4, 9, 11]);
const fx = new Fx(), sky = stars(26, W, H, 9);
const cv = document.getElementById('cv');
let ctx = fitCanvas(cv, W, H);
const game = { paused: false }, kit = wire(game, 'moonmerge');
const db = store('moonmerge.save');
let save = db.get({ best: 0, board: null, score: 0, won: false });
const rand = rng((Date.now() ^ 0x9e3779b9) >>> 0);
let board, score, over = false, won = save.won;
const pops = new Map();

function init(fresh) {
  if (!fresh && Array.isArray(save.board) && save.board.length === N * N && save.board.some(Boolean)) { board = save.board; score = save.score || 0; }
  else { board = emptyBoard(); score = 0; for (let i = 0; i < 2; i++) board = spawn(board, rand).board; won = false; }
  over = false; persist(); ui(); kit.setPlaying(true);
}
function persist() {
  save = { best: Math.max(save.best, score), board: over ? null : board, score: over ? 0 : score, won };
  db.set(save);
}
let shownScore = -1;
function ui() {
  if (shownScore >= 0 && score > shownScore) pulse('score');
  shownScore = score;
  document.getElementById('score').textContent = score;
  document.getElementById('best').textContent = Math.max(save.best, score);
}

function act(dir) {
  if (game.paused || over) return;
  const r = move(board, dir);
  if (!r.moved) { beep(120, 0.05, 'square', 0.04); return; }
  const before = board;
  board = r.board; score += r.gained;
  const s = spawn(board, rand);
  board = s.board;
  if (s.at >= 0) pops.set(s.at, performance.now());
  board.forEach((v, i) => {
    if (v && v > (before[i] || 0) && r.gained) {
      pops.set(i, performance.now());
      const cx = GAP + (i % N) * (CELL + GAP) + CELL / 2, cy = GAP + ((i / N) | 0) * (CELL + GAP) + CELL / 2;
      fx.burst(cx, cy, 6 + v * 2, COL[Math.min(v, COL.length - 1)], 120 + v * 14, 0.6, 3);
      if (v >= 4) fx.text(cx, cy - CELL * 0.5, '+' + 2 ** v, '#ffd166', 18);
    }
  });
  const top = Math.min(9, maxTier(board));
  beep(note(top), 0.09, 'triangle');
  if (r.gained) beep(note(top + 2), 0.12, 'sine', 0.05);
  if (!won && maxTier(board) >= 8) { won = true; document.getElementById('hint').textContent = 'A star is born! Keep going for a Nova and a Galaxy.'; }
  persist(); ui();
  if (!canMove(board)) {
    over = true; persist(); kit.setPlaying(false);
    showOver('Collapsed!', `You grew a <b>${TIERS[maxTier(board) - 1]}</b>.<br>Score ${score}`, 'Play again', () => init(true));
  }
}

let sx = 0, sy = 0, down = false;
cv.addEventListener('pointerdown', e => { down = true; sx = e.clientX; sy = e.clientY; });
cv.addEventListener('pointerup', e => {
  if (!down) return;
  down = false;
  const dx = e.clientX - sx, dy = e.clientY - sy;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  act(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 0) : (dy > 0 ? 3 : 2));
});
addEventListener('keydown', e => {
  const d = { ArrowLeft: 0, ArrowRight: 1, ArrowUp: 2, ArrowDown: 3, a: 0, d: 1, w: 2, s: 3 }[e.key];
  if (d !== undefined) { e.preventDefault(); act(d); }
});
addEventListener('resize', () => { ctx = fitCanvas(cv, W, H); });

function shade(hex, k) {   // k>0 lighten, k<0 darken
  const n = parseInt(hex.slice(1), 16), f = (c) => Math.round(Math.max(0, Math.min(255, k > 0 ? c + (255 - c) * k : c * (1 + k))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
function body(x, y, r, v, now) {
  const base = COL[Math.min(v, COL.length - 1)];
  ctx.save(); ctx.translate(x, y);
  if (v >= 5) { ctx.shadowColor = base; ctx.shadowBlur = 10 + v * 2; }
  if (v >= 8) {   // ring behind/around giants and planets
    ctx.save(); ctx.rotate(-0.35); ctx.strokeStyle = shade(base, 0.35); ctx.globalAlpha = 0.8; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.32, r * 0.42, 0, Math.PI, 2 * Math.PI); ctx.stroke(); ctx.restore();
  }
  const g = ctx.createRadialGradient(-r * 0.4, -r * 0.45, r * 0.1, 0, 0, r * 1.05);
  g.addColorStop(0, shade(base, 0.55)); g.addColorStop(0.5, base); g.addColorStop(1, shade(base, -0.45));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.clip();
  if (v >= 2 && v <= 6) { ctx.fillStyle = 'rgba(0,0,0,.16)'; for (const [cx, cy, cr] of [[.35, .2, .2], [-.3, .35, .14], [.1, -.4, .12]]) { ctx.beginPath(); ctx.arc(cx * r, cy * r, cr * r, 0, 7); ctx.fill(); } }
  if (v >= 7) { ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = r * 0.12; for (const k of [-.3, .1, .45]) { ctx.beginPath(); ctx.moveTo(-r, k * r); ctx.quadraticCurveTo(0, k * r + r * .18, r, k * r); ctx.stroke(); } }
  ctx.restore();
  if (v >= 8) {   // ring in front
    ctx.save(); ctx.rotate(-0.35); ctx.strokeStyle = shade(base, 0.35); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.32, r * 0.42, 0, 0, Math.PI); ctx.stroke(); ctx.restore();
  }
  if (v >= 9) {   // star rays
    ctx.save(); ctx.rotate(now / 4000); ctx.fillStyle = base; ctx.globalAlpha = 0.55;
    for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(r * 0.9, -3); ctx.lineTo(r * 1.45, 0); ctx.lineTo(r * 0.9, 3); ctx.fill(); }
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.5, r * 0.28, r * 0.15, -0.6, 0, 7); ctx.fill();
  ctx.restore();
}

let last = performance.now();
function draw(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  fx.update(dt);
  ctx.clearRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#101830'); bg.addColorStop(1, '#0a0e1a');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(0, 0, W, H, 18); ctx.fill();
  for (const s of sky) { ctx.globalAlpha = s.a * (0.7 + 0.3 * Math.sin(now / 900 + s.tw)); ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, s.s, s.s); }
  ctx.globalAlpha = 1;
  for (let i = 0; i < N * N; i++) {
    const x = GAP + (i % N) * (CELL + GAP), y = GAP + ((i / N) | 0) * (CELL + GAP), v = board[i];
    ctx.fillStyle = 'rgba(255,255,255,.045)'; ctx.beginPath(); ctx.roundRect(x, y, CELL, CELL, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1; ctx.stroke();
    if (!v) continue;
    const t = pops.has(i) ? Math.min(1, (now - pops.get(i)) / 220) : 1;
    const sc = pops.has(i) ? 0.5 + 0.5 * t + Math.sin(t * Math.PI) * 0.2 : 1;
    const r = (CELL / 2 - 8) * (0.62 + 0.38 * Math.min(1, v / 8)) * sc;
    const cx = x + CELL / 2, cy = y + CELL / 2;
    body(cx, cy, r, v, now);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = DARK_TEXT.has(v) ? '#111' : '#fff'; ctx.shadowColor = DARK_TEXT.has(v) ? 'transparent' : 'rgba(0,0,0,.6)'; ctx.shadowBlur = 4;
    ctx.font = '800 ' + (v >= 7 ? 20 : 22) + 'px Inter,system-ui,sans-serif'; ctx.fillText(String(2 ** v), cx, cy - 3);
    ctx.shadowBlur = 0; ctx.font = '700 9.5px Inter,system-ui,sans-serif'; ctx.globalAlpha = 0.92; ctx.fillText((TIERS[v - 1] || '').toUpperCase(), cx, cy + 14); ctx.globalAlpha = 1;
  }
  fx.draw(ctx);
  requestAnimationFrame(draw);
}
init(false);
requestAnimationFrame(draw);
window.__game = { get board() { return board; }, get score() { return score; }, act };
