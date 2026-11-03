import { store, beep, note, fitCanvas, pointer, wire, showOver, pulse, Fx } from './kit.js';
import { SHAPES, COLORS, newLevel, flood, solved, region } from './logic.js';

const W = 360, H = 480, BOARD = 340, TOP = 8, PAL_Y = 372;
const cv = document.getElementById('cv');
let ctx = fitCanvas(cv, W, H);
const game = { paused: false }, kit = wire(game, 'floodgate');
const db = store('floodgate.save');
let save = db.get({ best: 1, level: 1 });
let lv, grid, moves, level, finished = false, anim = 0;
const fx = new Fx(); let wave = new Map(), shownLevel = 0;

function load(n) {
  level = n; lv = newLevel(n); grid = lv.grid.slice(); moves = 0; finished = false; anim = 0; wave = new Map();
  save = { best: Math.max(save.best, n), level: n }; db.set(save);
  ui(); kit.setPlaying(true);
  document.getElementById('hint').textContent = `Fill the board with one colour in ${lv.limit} moves or fewer.`;
}
function ui() {
  if (level !== shownLevel && shownLevel) pulse('score');
  shownLevel = level;
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
  const before = region(grid, lv.size);
  grid = flood(grid, lv.size, c); moves++; anim = 1;
  const after = region(grid, lv.size), now = performance.now(), n = lv.size;
  wave = new Map();
  for (const i of after) wave.set(i, now + ((i % n) + ((i / n) | 0)) * 22);
  const cs = BOARD / n, ox = (W - BOARD) / 2;
  for (const i of after) if (!before.has(i) && Math.random() < 0.35) fx.burst(ox + (i % n) * cs + cs / 2, TOP + ((i / n) | 0) * cs + cs / 2, 2, COLORS[c], 70, 0.45, 2);
  beep(note(Math.min(14, moves)), 0.07, 'triangle');
  if (solved(grid)) {
    finished = true; kit.setPlaying(false); beep(note(12), 0.3, 'sine', 0.08);
    for (let k = 0; k < 6; k++) fx.burst(40 + Math.random() * 280, 60 + Math.random() * 240, 14, COLORS[k % 6], 220, 0.9, 3.5);
    const stars = moves <= lv.limit - lv.slack ? 3 : moves <= lv.limit - 1 ? 2 : 1;
    setTimeout(() => showOver('Flooded!', `<span style="font-size:30px;letter-spacing:6px;color:#ffd166">${'★'.repeat(stars)}<span style="opacity:.25">${'★'.repeat(3 - stars)}</span></span><br>Solved in <b>${moves}</b> moves<br>limit ${lv.limit}`, 'Next level', () => load(level + 1)), 700);
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

let last = performance.now();
function draw(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; fx.update(dt);
  ctx.clearRect(0, 0, W, H);
  const bgG = ctx.createLinearGradient(0, 0, 0, H); bgG.addColorStop(0, '#141b2b'); bgG.addColorStop(1, '#0b0f18');
  ctx.fillStyle = bgG; ctx.beginPath(); ctx.roundRect(0, 0, W, H, 18); ctx.fill();
  const n = lv.size, cs = BOARD / n, ox = (W - BOARD) / 2, gap = n > 11 ? 1 : 1.5;
  ctx.fillStyle = '#0006'; ctx.beginPath(); ctx.roundRect(ox - 4, TOP - 4, BOARD + 8, BOARD + 8, 14); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.roundRect(ox, TOP, BOARD, BOARD, 10); ctx.clip();
  for (let i = 0; i < n * n; i++) {
    const x = ox + (i % n) * cs, y = TOP + ((i / n) | 0) * cs, c = grid[i];
    const w0 = wave.get(i), tt = w0 ? Math.max(0, Math.min(1, (now - w0) / 260)) : 1, sc = w0 && tt < 1 ? 1 + Math.sin(tt * Math.PI) * 0.16 : 1;
    ctx.save(); ctx.translate(x + cs / 2, y + cs / 2); ctx.scale(sc, sc);
    const r = Math.max(2, cs * 0.16), hs = cs / 2 - gap;
    const g = ctx.createLinearGradient(0, -hs, 0, hs); g.addColorStop(0, shadeC(COLORS[c], 0.22)); g.addColorStop(1, shadeC(COLORS[c], -0.18));
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-hs, -hs, hs * 2, hs * 2, r); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.roundRect(-hs + 1, -hs + 1, hs * 2 - 2, hs * 0.55, r); ctx.fill();
    ctx.restore();
    shape(c, SHAPES[c], x + cs / 2, y + cs / 2, cs * 0.25 * sc, 'rgba(10,14,22,.42)');
  }
  ctx.restore();
  // flooded region outline
  const reg = region(grid, n);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 8;
  for (const i of reg) {
    const x = ox + (i % n) * cs, y = TOP + ((i / n) | 0) * cs, cx = i % n, cy = (i / n) | 0;
    ctx.beginPath();
    if (cx === 0 || !reg.has(i - 1)) { ctx.moveTo(x + 1.5, y); ctx.lineTo(x + 1.5, y + cs); }
    if (cx === n - 1 || !reg.has(i + 1)) { ctx.moveTo(x + cs - 1.5, y); ctx.lineTo(x + cs - 1.5, y + cs); }
    if (cy === 0 || !reg.has(i - n)) { ctx.moveTo(x, y + 1.5); ctx.lineTo(x + cs, y + 1.5); }
    if (cy === n - 1 || !reg.has(i + n)) { ctx.moveTo(x, y + cs - 1.5); ctx.lineTo(x + cs, y + cs - 1.5); }
    ctx.stroke();
  }
  ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ox + cs / 2, TOP + cs / 2, 3.2, 0, 7); ctx.fill();
  // palette
  const cw = (W - 20) / lv.colors;
  for (let c = 0; c < lv.colors; c++) {
    const x = 10 + c * cw + cw / 2, on = c === grid[0], bw = cw - 10, y = PAL_Y + (on ? 0 : 3);
    const g = ctx.createLinearGradient(0, y, 0, y + 46); g.addColorStop(0, shadeC(COLORS[c], 0.25)); g.addColorStop(1, shadeC(COLORS[c], -0.2));
    ctx.fillStyle = g; ctx.shadowColor = on ? '#fff' : 'rgba(0,0,0,.5)'; ctx.shadowBlur = on ? 12 : 6; ctx.beginPath(); ctx.roundRect(x - bw / 2, y, bw, 46, 14); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.roundRect(x - bw / 2 + 2, y + 2, bw - 4, 16, 12); ctx.fill();
    shape(c, SHAPES[c], x, y + 23, 11, 'rgba(10,14,22,.5)');
    ctx.fillStyle = 'rgba(10,14,22,.55)'; ctx.font = '800 10px Inter,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(c + 1), x - bw / 2 + 9, y + 11);
    if (on) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(x - bw / 2, y, bw, 46, 14); ctx.stroke(); }
  }
  // moves meter: one pip per move
  const by = PAL_Y + 66, pw = (W - 60) / lv.limit;
  ctx.textAlign = 'center'; ctx.fillStyle = '#f4f6fb'; ctx.font = '800 17px Inter,system-ui,sans-serif';
  ctx.fillText(`Moves  ${moves} / ${lv.limit}`, W / 2, by - 4);
  for (let i = 0; i < lv.limit; i++) {
    ctx.fillStyle = i < moves ? (lv.limit - i <= 3 ? '#ff6b5e' : '#56d39a') : 'rgba(255,255,255,.14)';
    ctx.beginPath(); ctx.roundRect(30 + i * pw + 1, by + 8, Math.max(2, pw - 2), 7, 3); ctx.fill();
  }
  fx.draw(ctx);
  requestAnimationFrame(draw);
}
function shadeC(hex, k) {
  const n = parseInt(hex.slice(1), 16), f = (c) => Math.round(Math.max(0, Math.min(255, k > 0 ? c + (255 - c) * k : c * (1 + k))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
load(save.level || 1);
requestAnimationFrame(draw);
window.__game = { get grid() { return grid; }, pick, get limit() { return lv.limit; }, get moves() { return moves; }, get level() { return level; } };
