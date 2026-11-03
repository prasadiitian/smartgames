// Logic tests for the four small games. Run: node tests/games.mjs
import assert from 'node:assert/strict';
import * as mm from '../games/moonmerge/src/logic.js';
import * as sk from '../games/skyline/src/logic.js';
import * as fg from '../games/floodgate/src/logic.js';
import * as ld from '../games/lanedrift/src/logic.js';

let pass = 0;
const test = (name, fn) => { try { fn(); pass++; console.log('ok   ' + name); } catch (e) { console.error('FAIL ' + name + ': ' + e.message); process.exitCode = 1; } };
function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---- Moonmerge
test('moonmerge: slide merges equal pairs once per move', () => {
  assert.deepEqual(mm.slideLine([1, 1, 1, 1]).line, [2, 2, 0, 0]);
  assert.deepEqual(mm.slideLine([1, 1, 2, 0]).line, [2, 2, 0, 0]);
  assert.deepEqual(mm.slideLine([0, 2, 0, 2]).line, [3, 0, 0, 0]);
  assert.equal(mm.slideLine([1, 1, 0, 0]).gained, 4);
});
test('moonmerge: all four directions', () => {
  const b = mm.emptyBoard(); b[0] = 1; b[3] = 1;
  assert.equal(mm.move(b, 0).board[0], 2);
  assert.equal(mm.move(b, 1).board[3], 2);
  const c = mm.emptyBoard(); c[0] = 1; c[12] = 1;
  assert.equal(mm.move(c, 2).board[0], 2);
  assert.equal(mm.move(c, 3).board[12], 2);
});
test('moonmerge: no-op move reports moved=false; spawn fills a free cell; sum of tiers conserved on merge', () => {
  const b = mm.emptyBoard(); b[0] = 1;
  assert.equal(mm.move(b, 0).moved, false);
  const r = mm.spawn(b, seeded(1)); assert.ok(r.at > 0 && r.board[r.at] >= 1);
  const m = [1, 1, 2, 2, ...Array(12).fill(0)]; const mv = mm.move(m, 0);
  const val = (x) => x.reduce((a, v) => a + (v ? 2 ** v : 0), 0);
  assert.equal(val(mv.board), val(m));
});
test('moonmerge: game over detection', () => {
  const full = [1, 2, 1, 2, 2, 1, 2, 1, 1, 2, 1, 2, 2, 1, 2, 1];
  assert.equal(mm.canMove(full), false);
  full[15] = 2; assert.equal(mm.canMove(full), true);
});
test('moonmerge: random play never corrupts the board and ends', () => {
  const r = seeded(7); let b = mm.emptyBoard(); b = mm.spawn(b, r).board; let moves = 0;
  while (mm.canMove(b) && moves < 20000) { const mv = mm.move(b, Math.floor(r() * 4)); if (mv.moved) { b = mm.spawn(mv.board, r).board; } moves++; assert.ok(b.every(v => Number.isInteger(v) && v >= 0 && v < 20)); }
  assert.ok(!mm.canMove(b), 'random play should eventually get stuck');
});

// ---- Skyline
test('skyline: overhang trimmed, perfect snaps, miss returns null', () => {
  const prev = { x: 100, w: 100 };
  assert.deepEqual(sk.place(prev, { x: 130, w: 100 }), { x: 130, w: 70, perfect: false });
  assert.equal(sk.place(prev, { x: 102, w: 100 }).perfect, true);
  assert.equal(sk.place(prev, { x: 102, w: 100 }).x, 100);
  assert.equal(sk.place(prev, { x: 300, w: 100 }), null);
});
test('skyline: block never grows past start width and regrows on a streak of 3', () => {
  assert.equal(sk.regrow({ x: 50, w: 100 }, 3).w, 110);
  assert.equal(sk.regrow({ x: 50, w: 100 }, 2).w, 100);
  assert.equal(sk.regrow({ x: 0, w: sk.START_W }, 3).w, sk.START_W);
});
test('skyline: slider stays inside the field and speed is capped', () => {
  for (let t = 0; t < 50; t += 0.137) { const x = sk.sliderX(t, 200, 80, 320); assert.ok(x >= 0 && x <= 240, 'x=' + x); }
  assert.equal(sk.speedFor(10000), 260);
});
test('skyline: perfect play reaches 100 floors; sloppy play ends', () => {
  let top = { x: 80, w: sk.START_W }; for (let i = 0; i < 100; i++) top = sk.regrow(sk.place(top, { x: top.x + 1, w: top.w }), i + 1);
  assert.ok(top.w >= 4);
  let b = { x: 80, w: sk.START_W }, n = 0; while (b && n < 100) { b = sk.place(b, { x: b.x + 40, w: b.w }); n++; }
  assert.ok(n < 100, 'always 40px off must end');
});

// ---- Floodgate
test('floodgate: flood recolours only the connected corner region', () => {
  const g = [0, 0, 1, 2, 0, 1, 1, 1, 2]; const f = fg.flood(g, 3, 1);
  assert.deepEqual(f, [1, 1, 1, 2, 1, 1, 1, 1, 2]);
  assert.equal(fg.flood(g, 3, 0), g);
});
test('floodgate: every level in 1..30 is solvable within its limit and deterministic', () => {
  for (let L = 1; L <= 30; L++) {
    const a = fg.newLevel(L), b = fg.newLevel(L); assert.deepEqual(a.grid, b.grid);
    let cur = a.grid.slice(), moves = 0;
    while (!fg.solved(cur) && moves < a.limit + 2) { // replay greedy through public API
      let best = -1, bs = -1; for (let c = 0; c < a.colors; c++) { if (c === cur[0]) continue; const s = fg.region(fg.flood(cur, a.size, c), a.size).size; if (s > bs) { bs = s; best = c; } }
      cur = fg.flood(cur, a.size, best); moves++;
    }
    assert.ok(fg.solved(cur) && moves <= a.limit, `level ${L}: ${moves} > ${a.limit}`);
    assert.ok(a.size <= 14 && a.colors <= 6 && a.limit >= 3);
  }
});
test('floodgate: difficulty rises', () => { assert.ok(fg.newLevel(12).size > fg.newLevel(1).size); assert.ok(fg.newLevel(12).colors > fg.newLevel(1).colors); });
test('floodgate: six distinct colours and six distinct shapes (colour is never the only cue)', () => { assert.equal(new Set(fg.COLORS).size, 6); assert.equal(new Set(fg.SHAPES).size, 6); });

// ---- Lane Drift
test('lanedrift: lane changes are clamped', () => {
  const s = ld.newState(); assert.equal(ld.moveLane(s, -1), true); assert.equal(ld.moveLane(s, -1), false); assert.equal(s.lane, 0);
  ld.moveLane(s, 1); ld.moveLane(s, 1); assert.equal(ld.moveLane(s, 1), false); assert.equal(s.lane, 2);
});
test('lanedrift: standing still eventually crashes; same seed is deterministic', () => {
  const run = (seed) => { const s = ld.newState(), r = seeded(seed); let t = 0; while (!s.dead && t < 600) { ld.step(s, 1 / 60, r); t += 1 / 60; } return { dead: s.dead, t }; };
  const a = run(3), b = run(3); assert.deepEqual(a, b); assert.ok(a.dead, 'a player who never moves must crash');
});
test('lanedrift: a lookahead bot survives 5 simulated minutes at max speed and a row never blocks every lane', () => {
  const s = ld.newState(), r = seeded(11); let t = 0, coins0 = 0;
  while (!s.dead && t < 300) {
    ld.step(s, 1 / 60, r); t += 1 / 60;
    const rows = new Map(); for (const o of s.obstacles) { const k = o.y.toFixed(4); rows.set(k, (rows.get(k) || 0) + 1); }
    for (const n of rows.values()) assert.ok(n < ld.LANES, 'all lanes blocked in one row');
    // bot: look ahead and move to the lane whose nearest approaching obstacle is farthest
    const danger = (lane) => Math.min(9, ...s.obstacles.filter(o => o.lane === lane && o.y < ld.PLAYER_Y + 0.02).map(o => ld.PLAYER_Y - o.y).filter(d => d > -0.1));
    let best = s.lane; for (let l = 0; l < ld.LANES; l++) if (danger(l) > danger(best) + 0.05) best = l;
    if (danger(s.lane) < 0.35 && best !== s.lane) ld.moveLane(s, best > s.lane ? 1 : -1);
  }
  assert.ok(!s.dead, 'bot died at t=' + t.toFixed(1));
  assert.ok(s.speed <= ld.MAX_SPEED + 1e-9 && ld.scoreOf(s) > 100);
});
test('lanedrift: coins are collected only in the player lane', () => {
  const s = ld.newState(); s.coins.push({ lane: 1, y: ld.PLAYER_Y }, { lane: 0, y: ld.PLAYER_Y }); s.nextRow = 99;
  ld.step(s, 0.001, seeded(1)); assert.equal(s.coinsGot, 1); assert.equal(s.coins.length, 1);
});

console.log(`\n${pass} game logic tests passed${process.exitCode ? ' (with failures)' : ''}`);
