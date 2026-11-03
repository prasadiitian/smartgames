import { store, rng, beep, note, fitCanvas, pointer, wire, showOver, pulse, Fx, stars } from './kit.js';
import { LANES, PLAYER_Y, newState, moveLane, step, scoreOf } from './logic.js';

const W = 300, H = 480, LW = W / LANES;
const cv = document.getElementById('cv');
let ctx = fitCanvas(cv, W, H);
const game = { paused: false }, kit = wire(game, 'lanedrift');
const db = store('lanedrift.save');
let save = db.get({ best: 0 });
let s, rand, shake = 0, flash = 0, scroll = 0, px = 1, comboStep = 0, shown = 0;
const fx = new Fx(), sky = stars(40, W, H, 21);

function init() {
  s = newState(); rand = rng((Date.now() ^ 0x51ed270b) >>> 0); px = 1; shake = 0; comboStep = 0;
  ui(); kit.setPlaying(true);
  document.getElementById('hint').textContent = 'Swipe or tap left / right to change lane.';
}
function ui() {
  if (scoreOf(s) > shown + 9) { pulse('score'); shown = scoreOf(s); } else if (scoreOf(s) < shown) shown = 0;
  document.getElementById('score').textContent = scoreOf(s);
  document.getElementById('best').textContent = Math.max(save.best, scoreOf(s));
}
function go(dir) {
  if (game.paused || s.dead) return;
  if (moveLane(s, dir)) beep(330 + s.lane * 60, 0.04, 'square', 0.04);
}

let sx = 0, sy = 0, down = false, moved = false;
cv.addEventListener('pointerdown', e => { e.preventDefault(); down = true; moved = false; sx = e.clientX; sy = e.clientY; });
cv.addEventListener('pointermove', e => {
  if (!down || moved) return;
  const dx = e.clientX - sx;
  if (Math.abs(dx) > 28) { moved = true; go(dx > 0 ? 1 : -1); }
});
cv.addEventListener('pointerup', e => {
  if (!down) return;
  down = false;
  if (!moved) go(pointer(cv, e, W, H).x > W / 2 ? 1 : -1);
});
addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') go(-1);
  if (e.key === 'ArrowRight' || e.key === 'd') go(1);
});
addEventListener('resize', () => { ctx = fitCanvas(cv, W, H); });

function emit(ev) {
  if (ev === 'coin') { beep(note(comboStep++ % 10 + 5), 0.08, 'triangle'); flash = 0.25; fx.burst(px * LW + LW / 2, PLAYER_Y * H - 10, 10, '#ffd166', 150, 0.5, 2.5); fx.text(px * LW + LW / 2, PLAYER_Y * H - 40, '+10', '#ffd166', 18); }
  if (ev === 'crash') {
    shake = 14; beep(90, 0.35, 'sawtooth', 0.09); kit.setPlaying(false);
    fx.burst(px * LW + LW / 2, PLAYER_Y * H, 40, '#ff6b5e', 300, 0.9, 3.5); fx.burst(px * LW + LW / 2, PLAYER_Y * H, 20, '#ffd166', 220, 0.7, 2.5);
    const sc = scoreOf(s);
    save = { best: Math.max(save.best, sc) }; db.set(save);
    showOver('Crashed!', `Score <b>${sc}</b>${sc >= save.best ? ' · new best!' : ''}<br>${s.coinsGot} coins`, 'Drive again', init);
  }
}

function barrier(x, y) {
  ctx.save(); ctx.translate(x, y);
  ctx.shadowColor = 'rgba(255,90,70,.6)'; ctx.shadowBlur = 12;
  const g = ctx.createLinearGradient(0, -20, 0, 20); g.addColorStop(0, '#ff7a66'); g.addColorStop(1, '#c23a2e');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-33, -20, 66, 40, 9); ctx.fill(); ctx.shadowBlur = 0;
  ctx.save(); ctx.beginPath(); ctx.roundRect(-33, -20, 66, 40, 9); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  for (let i = -4; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-40 + i * 16, 20); ctx.lineTo(-30 + i * 16, 20); ctx.lineTo(-10 + i * 16, -20); ctx.lineTo(-20 + i * 16, -20); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-33, -20, 66, 40, 9); ctx.stroke();
  ctx.restore();
}
function coin(x, y, now) {
  const sx = Math.abs(Math.cos(now / 260 + x)) * 0.8 + 0.2;
  ctx.save(); ctx.translate(x, y); ctx.scale(sx, 1);
  ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 14;
  const g = ctx.createRadialGradient(-3, -4, 1, 0, 0, 14); g.addColorStop(0, '#fff3b0'); g.addColorStop(0.6, '#ffd166'); g.addColorStop(1, '#d39a1f');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = '#b57d10'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.stroke();
  ctx.restore();
}
function ship(x, y, now) {
  ctx.save(); ctx.translate(x, y);
  const fl = 14 + Math.sin(now / 40) * 5 + s.speed * 12;
  const fg = ctx.createLinearGradient(0, 18, 0, 18 + fl); fg.addColorStop(0, '#fff'); fg.addColorStop(0.3, '#ffd166'); fg.addColorStop(1, 'rgba(255,120,60,0)');
  ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(-8, 18); ctx.lineTo(0, 18 + fl); ctx.lineTo(8, 18); ctx.fill();
  ctx.shadowColor = '#56b4e9'; ctx.shadowBlur = 20;
  const g = ctx.createLinearGradient(-22, 0, 22, 0); g.addColorStop(0, '#2d7fb8'); g.addColorStop(0.5, '#9be0ff'); g.addColorStop(1, '#2d7fb8');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(8, -6); ctx.lineTo(24, 20); ctx.lineTo(10, 16); ctx.lineTo(0, 22); ctx.lineTo(-10, 16); ctx.lineTo(-24, 20); ctx.lineTo(-8, -6); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = flash > 0 ? '#fff' : '#0e2a40'; ctx.beginPath(); ctx.ellipse(0, -4, 4.5, 9, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(8, -6); ctx.lineTo(24, 20); ctx.stroke();
  ctx.restore();
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!game.paused && !s.dead) { step(s, dt, rand, emit); scroll = (scroll + s.speed * dt * 480) % 60; ui(); }
  px += (s.lane - px) * Math.min(1, dt * 18);
  shake = Math.max(0, shake - dt * 40); flash = Math.max(0, flash - dt);
  fx.update(dt);
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0b1020'); bg.addColorStop(1, '#141c33');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  // road
  const rg = ctx.createLinearGradient(0, 0, 0, H); rg.addColorStop(0, '#1b2438'); rg.addColorStop(1, '#232e47');
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  for (const q of sky) { ctx.globalAlpha = q.a * 0.5; ctx.fillStyle = '#fff'; ctx.fillRect(q.x, (q.y + scroll * q.s * 2) % H, q.s * 0.8, q.s * 3); }   // streaking dust
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,255,255,.03)';
  for (let y = -60 + scroll; y < H; y += 60) ctx.fillRect(0, y, W, 28);
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.setLineDash([26, 34]); ctx.lineDashOffset = -scroll;
  for (let l = 1; l < LANES; l++) { ctx.beginPath(); ctx.moveTo(l * LW, 0); ctx.lineTo(l * LW, H); ctx.stroke(); }
  ctx.setLineDash([]);
  ctx.shadowColor = '#56b4e9'; ctx.shadowBlur = 14; ctx.strokeStyle = '#56b4e9'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(2, H); ctx.moveTo(W - 2, 0); ctx.lineTo(W - 2, H); ctx.stroke(); ctx.shadowBlur = 0;
  // speed lines at high speed
  if (s.speed > 0.7) { ctx.strokeStyle = `rgba(255,255,255,${(s.speed - 0.7) * 0.5})`; ctx.lineWidth = 1.5; for (let i = 0; i < 8; i++) { const x = ((i * 97 + 13) % W), y = ((i * 131 + scroll * 14) % H); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 34); ctx.stroke(); } }
  for (const c of s.coins) coin(c.lane * LW + LW / 2, c.y * H, now);
  for (const o of s.obstacles) barrier(o.lane * LW + LW / 2, o.y * H);
  if (!s.dead) ship(px * LW + LW / 2, PLAYER_Y * H, now);
  fx.draw(ctx);
  ctx.restore();
  requestAnimationFrame(frame);
}
init();
requestAnimationFrame(frame);
window.__game = { get state() { return s; }, go };
