import { store, rng, beep, note, fitCanvas, wire, showOver } from './kit.js';
import { N, TIERS, emptyBoard, move, spawn, canMove, maxTier } from './logic.js';

const W = 360, H = 360, GAP = 8, CELL = (W - GAP * (N + 1)) / N;
const COL = ['#2b3447', '#8d99ae', '#b8a089', '#c9b037', '#56b4e9', '#2fbf71', '#e8564b', '#e69f00', '#ffd166', '#b07aff', '#ffffff'];
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
function ui() {
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
  board.forEach((v, i) => { if (v && v > (before[i] || 0) && r.gained) pops.set(i, performance.now()); });
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

function draw(now) {
  ctx.clearRect(0, 0, W, H);
  for (let i = 0; i < N * N; i++) {
    const x = GAP + (i % N) * (CELL + GAP), y = GAP + ((i / N) | 0) * (CELL + GAP), v = board[i];
    ctx.fillStyle = '#18202e'; ctx.beginPath(); ctx.roundRect(x, y, CELL, CELL, 14); ctx.fill();
    if (!v) continue;
    const t = pops.has(i) ? Math.min(1, (now - pops.get(i)) / 160) : 1;
    const sc = pops.has(i) ? 0.6 + 0.4 * t + Math.sin(t * Math.PI) * 0.18 : 1;
    const r = (CELL / 2 - 6) * (0.55 + 0.45 * Math.min(1, v / 8)) * sc;
    ctx.save(); ctx.translate(x + CELL / 2, y + CELL / 2);
    ctx.fillStyle = COL[Math.min(v, COL.length - 1)];
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = v > 3 ? 14 : 0;
    ctx.beginPath(); ctx.arc(0, 0, r + 6 * sc, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = v >= 8 || v === 3 || v === 10 ? '#111' : '#fff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 22px system-ui'; ctx.fillText(String(2 ** v), 0, -4);
    ctx.font = '10px system-ui'; ctx.fillText(TIERS[v - 1] || '', 0, 16);
    ctx.restore();
  }
  requestAnimationFrame(draw);
}
init(false);
requestAnimationFrame(draw);
window.__game = { get board() { return board; }, get score() { return score; }, act };
