import { store, rng, beep, note, fitCanvas, pointer, wire, showOver } from './kit.js';
import { LANES, PLAYER_Y, newState, moveLane, step, scoreOf } from './logic.js';

const W = 300, H = 480, LW = W / LANES;
const cv = document.getElementById('cv');
let ctx = fitCanvas(cv, W, H);
const game = { paused: false }, kit = wire(game, 'lanedrift');
const db = store('lanedrift.save');
let save = db.get({ best: 0 });
let s, rand, shake = 0, flash = 0, scroll = 0, px = 1, comboStep = 0;

function init() {
  s = newState(); rand = rng((Date.now() ^ 0x51ed270b) >>> 0); px = 1; shake = 0; comboStep = 0;
  ui(); kit.setPlaying(true);
  document.getElementById('hint').textContent = 'Swipe, tap the left or right side, or use the arrow keys to change lane.';
}
function ui() {
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
  if (ev === 'coin') { beep(note(comboStep++ % 10 + 5), 0.08, 'triangle'); flash = 0.25; }
  if (ev === 'crash') {
    shake = 14; beep(90, 0.35, 'sawtooth', 0.09); kit.setPlaying(false);
    const sc = scoreOf(s);
    save = { best: Math.max(save.best, sc) }; db.set(save);
    showOver('Crashed!', `Score <b>${sc}</b>${sc >= save.best ? ' · new best!' : ''}<br>${s.coinsGot} coins`, 'Drive again', init);
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!game.paused && !s.dead) { step(s, dt, rand, emit); scroll = (scroll + s.speed * dt * 480) % 60; ui(); }
  px += (s.lane - px) * Math.min(1, dt * 18);
  shake = Math.max(0, shake - dt * 40); flash = Math.max(0, flash - dt);
  ctx.save();
  ctx.fillStyle = '#10151f'; ctx.fillRect(0, 0, W, H);
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  ctx.fillStyle = '#1c2434'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#3a4560'; ctx.lineWidth = 3; ctx.setLineDash([26, 34]); ctx.lineDashOffset = -scroll;
  for (let l = 1; l < LANES; l++) { ctx.beginPath(); ctx.moveTo(l * LW, 0); ctx.lineTo(l * LW, H); ctx.stroke(); }
  ctx.setLineDash([]);
  for (const o of s.obstacles) {
    const x = o.lane * LW + LW / 2, y = o.y * H;
    ctx.fillStyle = '#e8564b'; ctx.beginPath(); ctx.roundRect(x - 30, y - 22, 60, 44, 8); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 14, y - 10); ctx.lineTo(x + 14, y + 10); ctx.moveTo(x + 14, y - 10); ctx.lineTo(x - 14, y + 10); ctx.stroke();
  }
  for (const c of s.coins) {
    const x = c.lane * LW + LW / 2, y = c.y * H;
    ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill();
    ctx.fillStyle = '#7a5a00'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', x, y + 1);
  }
  const cx = px * LW + LW / 2, cy = PLAYER_Y * H;
  ctx.fillStyle = flash > 0 ? '#fff' : '#56b4e9';
  ctx.beginPath(); ctx.moveTo(cx, cy - 26); ctx.lineTo(cx + 20, cy + 22); ctx.lineTo(cx - 20, cy + 22); ctx.closePath(); ctx.fill();
  ctx.restore();
  requestAnimationFrame(frame);
}
init();
requestAnimationFrame(frame);
window.__game = { get state() { return s; }, go };
