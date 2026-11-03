import { store, beep, note, fitCanvas, wire, showOver } from './kit.js';
import { START_W, place, regrow, speedFor, sliderX } from './logic.js';

const W = 320, H = 480, BH = 22, BASE_Y = H - 60;
const HINT = 'Tap, click or press Space to drop. Three perfect drops in a row widen the block.';
const cv = document.getElementById('cv');
let ctx = fitCanvas(cv, W, H);
const game = { paused: false }, kit = wire(game, 'skyline');
const db = store('skyline.save');
let save = db.get({ best: 0 });
let tower, cur, tClock, streak, floors, over, cuts, shake, camY;

function init() {
  tower = [{ x: (W - START_W) / 2, w: START_W }];
  streak = 0; floors = 0; over = false; cuts = []; shake = 0; camY = 0; tClock = 0;
  spawnBlock(); ui(); kit.setPlaying(true);
  document.getElementById('hint').textContent = HINT;
}
function spawnBlock() {
  const top = tower[tower.length - 1];
  cur = { w: top.w, born: tClock, speed: speedFor(floors) };
}
function ui() {
  document.getElementById('score').textContent = floors;
  document.getElementById('best').textContent = Math.max(save.best, floors);
}
const say = (t) => { document.getElementById('hint').textContent = t; };

function drop() {
  if (game.paused || over) return;
  const top = tower[tower.length - 1];
  const x = sliderX(tClock - cur.born, cur.speed, cur.w, W);
  const r = place(top, { x, w: cur.w });
  if (!r) {
    over = true; shake = 10; beep(110, 0.3, 'sawtooth', 0.08); kit.setPlaying(false);
    cuts.push({ x, w: cur.w, y: tower.length, vy: 0, vx: 0 });
    save = { best: Math.max(save.best, floors) }; db.set(save);
    showOver('Toppled!', `You built <b>${floors}</b> floors.`, 'Build again', init);
    return;
  }
  if (r.perfect) {
    streak++; shake = 3; beep(note(Math.min(14, streak + 2)), 0.12, 'triangle');
    say(streak >= 2 ? `Perfect x${streak}!` : 'Perfect!');
  } else {
    streak = 0; beep(200, 0.06, 'square', 0.05);
    const lostL = r.x - x, lostR = x + cur.w - (r.x + r.w);
    if (lostL > 0) cuts.push({ x, w: lostL, y: tower.length, vy: 0, vx: -30 });
    if (lostR > 0) cuts.push({ x: r.x + r.w, w: lostR, y: tower.length, vy: 0, vx: 30 });
  }
  let nb = { x: r.x, w: r.w };
  const wide = regrow(nb, streak);
  if (wide.w > nb.w) { nb = wide; beep(note(9), 0.2, 'sine', 0.06); say('The block grew back!'); }
  tower.push(nb); floors++;
  save = { best: Math.max(save.best, floors) }; db.set(save);
  ui(); spawnBlock();
}
cv.addEventListener('pointerdown', e => { e.preventDefault(); drop(); });
addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); drop(); } });
addEventListener('resize', () => { ctx = fitCanvas(cv, W, H); });

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!game.paused && !over) tClock += dt;
  camY += (Math.max(0, tower.length - 8) * BH - camY) * Math.min(1, dt * 5);
  shake = Math.max(0, shake - dt * 30);
  for (const c of cuts) { c.vy += 900 * dt; c.fall = (c.fall || 0) + c.vy * dt; c.x += c.vx * dt; }
  cuts = cuts.filter(c => (c.fall || 0) < H);
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1a2540'); g.addColorStop(1, '#0b0f16');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  const yOf = (i) => BASE_Y - i * BH + camY;
  tower.forEach((b, i) => { ctx.fillStyle = `hsl(${(i * 17 + 200) % 360} 70% 58%)`; ctx.fillRect(b.x, yOf(i), b.w, BH - 2); });
  for (const c of cuts) { ctx.fillStyle = `hsl(${(c.y * 17 + 200) % 360} 40% 40%)`; ctx.fillRect(c.x, yOf(c.y) + (c.fall || 0), c.w, BH - 2); }
  if (!over) {
    const x = sliderX(tClock - cur.born, cur.speed, cur.w, W);
    ctx.fillStyle = `hsl(${(tower.length * 17 + 200) % 360} 85% 68%)`;
    ctx.fillRect(x, yOf(tower.length), cur.w, BH - 2);
    const top = tower[tower.length - 1];
    ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(top.x, yOf(tower.length) + BH, top.w, H);
  }
  ctx.restore();
  requestAnimationFrame(frame);
}
init();
requestAnimationFrame(frame);
window.__game = { get floors() { return floors; }, drop, get tower() { return tower; } };
