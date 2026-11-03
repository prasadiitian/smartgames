import { store, beep, note, fitCanvas, wire, showOver, pulse, Fx, stars, mix, rgb, clamp01 } from './kit.js';
import { START_W, place, regrow, speedFor, sliderX } from './logic.js';

const W = 320, H = 480, BH = 22, BASE_Y = H - 60;
const HINT = 'Tap to drop. 3 perfect drops in a row widen the block.';
const cv = document.getElementById('cv');
let ctx = fitCanvas(cv, W, H);
const game = { paused: false }, kit = wire(game, 'skyline');
const db = store('skyline.save');
let save = db.get({ best: 0 });
let tower, cur, tClock, streak, floors, over, cuts, shake, camY, flash = 0;
const fx = new Fx(), sky = stars(60, W, H, 3);
const clouds = [{ x: 30, y: 90, s: 1 }, { x: 210, y: 170, s: 0.7 }, { x: 120, y: 260, s: 0.9 }];
let shownFloors = 0;

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
  if (floors > shownFloors) pulse('score');
  shownFloors = floors;
  document.getElementById('score').textContent = floors;
  document.getElementById('best').textContent = Math.max(save.best, floors);
}
const hue = (i, s = 70, l = 58) => `hsl(${(i * 17 + 200) % 360} ${s}% ${l}%)`;
const yAt = (i) => BASE_Y - i * BH + camY;
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
    streak++; shake = 3; flash = 0.35; beep(note(Math.min(14, streak + 2)), 0.12, 'triangle');
    fx.burst(r.x + r.w / 2, yAt(tower.length), 14, '#fff', 170, 0.55, 2.5);
    fx.text(W / 2, yAt(tower.length) - 26, streak >= 2 ? `PERFECT x${streak}` : 'PERFECT', '#ffd166', 22);
    say(streak >= 2 ? `Perfect x${streak}!` : 'Perfect!');
  } else {
    streak = 0; beep(200, 0.06, 'square', 0.05);
    fx.burst(r.x + r.w / 2, yAt(tower.length), 6, hue(tower.length, 70, 60), 90, 0.4, 2);
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

const SKY = [[[41, 74, 128], [150, 196, 235]], [[18, 22, 54], [60, 52, 120]], [[5, 6, 16], [14, 16, 38]]];   // [top, bottom] at ground / high / space
function drawBlock(b, i, alpha = 1, dim = 1) {
  const y = yAt(i), c = hue(i, 72, 58 * dim);
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(0, y, 0, y + BH);
  g.addColorStop(0, hue(i, 80, 70 * dim)); g.addColorStop(0.18, c); g.addColorStop(1, hue(i, 70, 40 * dim));
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(b.x, y, b.w, BH - 2, 3); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(b.x + 2, y + 1, b.w - 4, 2);
  ctx.fillStyle = 'rgba(255,240,170,.55)';   // lit windows
  for (let wx = b.x + 8; wx < b.x + b.w - 8; wx += 14) if (((wx * 7 + i * 13) | 0) % 3) ctx.fillRect(wx, y + 8, 6, 7);
  ctx.globalAlpha = 1;
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!game.paused && !over) tClock += dt;
  camY += (Math.max(0, tower.length - 8) * BH - camY) * Math.min(1, dt * 5);
  shake = Math.max(0, shake - dt * 30); flash = Math.max(0, flash - dt);
  fx.update(dt);
  for (const c of cuts) { c.vy += 900 * dt; c.fall = (c.fall || 0) + c.vy * dt; c.x += c.vx * dt; }
  cuts = cuts.filter(c => (c.fall || 0) < H);
  for (const c of clouds) { c.x += 6 * c.s * dt; if (c.x > W + 60) c.x = -80; }

  ctx.save();
  ctx.clearRect(0, 0, W, H);
  const alt = clamp01(camY / (BH * 40) + tower.length / 90), seg = alt < 0.5 ? 0 : 1, k = alt < 0.5 ? alt * 2 : (alt - 0.5) * 2;
  const top = mix(SKY[seg][0], SKY[seg + 1][0], k), bot = mix(SKY[seg][1], SKY[seg + 1][1], k);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, rgb(top)); g.addColorStop(1, rgb(bot));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const night = clamp01((alt - 0.2) * 2);
  for (const s of sky) { ctx.globalAlpha = s.a * night * (0.6 + 0.4 * Math.sin(now / 700 + s.tw)); ctx.fillStyle = '#fff'; ctx.fillRect(s.x, (s.y + camY * 0.05) % H, s.s, s.s); }
  ctx.globalAlpha = (1 - night) * 0.55; ctx.fillStyle = '#fff';
  for (const c of clouds) { const cy = (c.y + camY * 0.25) % H; ctx.beginPath(); ctx.ellipse(c.x, cy, 34 * c.s, 11 * c.s, 0, 0, 7); ctx.ellipse(c.x + 20 * c.s, cy + 3, 26 * c.s, 9 * c.s, 0, 0, 7); ctx.ellipse(c.x - 20 * c.s, cy + 4, 24 * c.s, 8 * c.s, 0, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;

  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  // city silhouette that scrolls away as the tower climbs
  const cityY = BASE_Y + BH - 2 + camY;
  if (cityY < H + 60) {
    ctx.fillStyle = rgb(mix([20, 28, 52], [8, 10, 24], night));
    for (let i = 0, x = -10; x < W + 10; i++) { const w = 22 + (i * 11) % 26, h = 26 + (i * 37) % 70; ctx.fillRect(x, cityY - h, w, h + 80); x += w + 3; }
    ctx.fillStyle = '#10151f'; ctx.fillRect(0, cityY, W, H);
  }
  tower.forEach((b, i) => drawBlock(b, i));
  for (const c of cuts) { const y = yAt(c.y) + (c.fall || 0); ctx.globalAlpha = Math.max(0, 1 - (c.fall || 0) / 300); ctx.fillStyle = hue(c.y, 40, 38); ctx.fillRect(c.x, y, c.w, BH - 2); ctx.globalAlpha = 1; }
  if (!over) {
    const x = sliderX(tClock - cur.born, cur.speed, cur.w, W);
    const tp = tower[tower.length - 1];
    ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(tp.x, yAt(tower.length) + BH, tp.w, H);            // alignment guide
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(tp.x - 1, yAt(tower.length), 2, BH * 2); ctx.fillRect(tp.x + tp.w - 1, yAt(tower.length), 2, BH * 2);
    ctx.shadowColor = hue(tower.length, 90, 65); ctx.shadowBlur = 16;
    drawBlock({ x, w: cur.w }, tower.length); ctx.shadowBlur = 0;
  }
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 0.35})`; ctx.fillRect(0, 0, W, H); }
  fx.draw(ctx);
  ctx.restore();
  requestAnimationFrame(frame);
}
init();
requestAnimationFrame(frame);
window.__game = { get floors() { return floors; }, drop, get tower() { return tower; } };
