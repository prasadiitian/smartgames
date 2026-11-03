import { store, beep, note, fitCanvas, pointer, wire, showOver } from './kit.js';
import { SHAPES, COLORS, newLevel, flood, solved, region } from './logic.js';

const W = 360, H = 476, BOARD = 340, TOP = 8, PAL_Y = 372;
const cv = document.getElementById('cv');
let ctx = fitCanvas(cv, W, H);
const game = { paused: false }, kit = wire(game, 'floodgate');
const db = store('floodgate.save');
let save = db.get({ best: 1, level: 1 });
let lv, grid, moves, level, finished = false, anim = 0;

function load(n) {
  level = n; lv = newLevel(n); grid = lv.grid.slice(); moves = 0; finished = false; anim = 0;
  save = { best: Math.max(save.best, n), level: n }; db.set(save);
  ui(); kit.setPlaying(true);
  document.getElementById('hint').textContent = `Fill the board with one colour in ${lv.limit} moves or fewer.`;
}
function ui() {
  document.getElementById('score').textContent = level;
  document.getElementById('best').textContent = save.best;
}

function shape(c, shp, x, y, r, col) {
  ctx.fillStyle = col; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = Math.max(1, r / 6);
  ctx.beginPath();
  if (shp === 'circle') ctx.arc(x, y, r, 0, 7);
  else if (shp === 'square') ctx.rect(x - r, y - r, 2 * r, 2 * r);
  else if (shp === 'triangle') { ctx.moveTo(x, y - r); ctx.lineTo(x + r, y + r); ctx.lineTo(x - r, y + r); ctx.closePath(); }
  else if (shp === 'diamond') { ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); }
  else if (shp === 'plus') { const k = r / 2.6; ctx.moveTo(x - k, y - r); ctx.lineTo(x + k, y - r); ctx.lineTo(x + k, y - k); ctx.lineTo(x + r, y - k); ctx.lineTo(x + r, y + k); ctx.lineTo(x + k, y + k); ctx.lineTo(x + k, y + r); ctx.lineTo(x - k, y + r); ctx.lineTo(x - k, y + k); ctx.lineTo(x - r, y + k); ctx.lineTo(x - r, y - k); ctx.lineTo(x - k, y - k); ctx.closePath(); }
  else { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); }
  ctx.fill(); ctx.stroke();
}

function pick(c) {
  if (game.paused || finished || c === grid[0]) return;
  grid = flood(grid, lv.size, c); moves++; anim = 1;
  beep(note(Math.min(14, moves)), 0.07, 'triangle');
  if (solved(grid)) {
    finished = true; kit.setPlaying(false); beep(note(12), 0.3, 'sine', 0.08);
    const stars = moves <= lv.limit - lv.slack ? 3 : moves <= lv.limit - 1 ? 2 : 1;
    showOver('Flooded!', `Solved in <b>${moves}</b> moves (limit ${lv.limit}).<br>${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`, 'Next level', () => load(level + 1));
  } else if (moves >= lv.limit) {
    finished = true; kit.setPlaying(false); beep(120, 0.3, 'sawtooth', 0.06);
    showOver('Out of moves', `The board still has ${new Set(grid).size} colours.`, 'Try again', () => load(level));
  }
}
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  const p = pointer(cv, e, W, H);
  if (p.y > PAL_Y - 8) {
    const n = lv.colors, cw = (W - 20) / n, i = Math.floor((p.x - 10) / cw);
    if (i >= 0 && i < n) pick(i);
  }
});
addEventListener('keydown', e => { const i = Number(e.key) - 1; if (i >= 0 && i < lv.colors) pick(i); });
addEventListener('resize', () => { ctx = fitCanvas(cv, W, H); });

function draw() {
  ctx.clearRect(0, 0, W, H);
  const n = lv.size, cs = BOARD / n, ox = (W - BOARD) / 2;
  anim = Math.max(0, anim - 0.06);
  for (let i = 0; i < n * n; i++) {
    const x = ox + (i % n) * cs, y = TOP + ((i / n) | 0) * cs, c = grid[i];
    ctx.fillStyle = COLORS[c]; ctx.fillRect(x, y, cs + 0.5, cs + 0.5);
    shape(c, SHAPES[c], x + cs / 2, y + cs / 2, cs * 0.28 * (1 - anim * 0.15), 'rgba(0,0,0,.28)');
  }
  // outline the flooded region so the player can see what a move will grow
  const reg = region(grid, n);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
  for (const i of reg) {
    const x = ox + (i % n) * cs, y = TOP + ((i / n) | 0) * cs, cx = i % n, cy = (i / n) | 0;
    ctx.beginPath();
    if (cx === 0 || !reg.has(i - 1)) { ctx.moveTo(x + 1.5, y); ctx.lineTo(x + 1.5, y + cs); }
    if (cx === n - 1 || !reg.has(i + 1)) { ctx.moveTo(x + cs - 1.5, y); ctx.lineTo(x + cs - 1.5, y + cs); }
    if (cy === 0 || !reg.has(i - n)) { ctx.moveTo(x, y + 1.5); ctx.lineTo(x + cs, y + 1.5); }
    if (cy === n - 1 || !reg.has(i + n)) { ctx.moveTo(x, y + cs - 1.5); ctx.lineTo(x + cs, y + cs - 1.5); }
    ctx.stroke();
  }
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ox + cs / 2, TOP + cs / 2, 3, 0, 7); ctx.fill();
  const cw = (W - 20) / lv.colors;
  for (let c = 0; c < lv.colors; c++) {
    const x = 10 + c * cw + cw / 2;
    ctx.fillStyle = COLORS[c]; ctx.beginPath(); ctx.roundRect(x - cw / 2 + 4, PAL_Y, cw - 8, 44, 10); ctx.fill();
    shape(c, SHAPES[c], x, PAL_Y + 22, 11, 'rgba(0,0,0,.45)');
    if (c === grid[0]) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x - cw / 2 + 4, PAL_Y, cw - 8, 44, 10); ctx.stroke(); }
  }
  ctx.fillStyle = '#eef2f8'; ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(`Moves ${moves} / ${lv.limit}`, W / 2, PAL_Y + 76);
  ctx.fillStyle = '#2d3850'; ctx.fillRect(40, PAL_Y + 86, W - 80, 6);
  ctx.fillStyle = moves > lv.limit - 3 ? '#e8564b' : '#56d39a'; ctx.fillRect(40, PAL_Y + 86, (W - 80) * Math.min(1, moves / lv.limit), 6);
  requestAnimationFrame(draw);
}
load(save.level || 1);
requestAnimationFrame(draw);
window.__game = { get grid() { return grid; }, pick, get limit() { return lv.limit; }, get moves() { return moves; }, get level() { return level; } };
