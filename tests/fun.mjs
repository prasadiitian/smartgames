// Tests for the fun pass: goals, discovery, dial puzzle, risk/reward, surprises, pacing of the first minute.
import assert from 'node:assert/strict';
import { RX, PERFECT_BONUS } from '../src/data.js';
import { GOALS, ACHS, activeGoals } from '../src/goals.js';
import {
  newState, tick, tap, serialize, deserialize, setDial, overload, collectRare, phaseChange, isPerfect, globalMult,
} from '../src/engine.js';
import { run } from './sim.mjs';

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ok   ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message); }
}

const rush = run(3, { rushChem: true, tapsActive: 3 });
test('first big visual payoff (first water) within 45 s for a goal-following player', () => assert.ok(rush.first.water <= 45, rush.first.water));
test('something satisfying every <=10 s in the first minute', () => {
  const ts = [0, ...rush.events.filter(e => e.t <= 60).map(e => e.t), 60]; let gap = 0;
  for (let i = 1; i < ts.length; i++) gap = Math.max(gap, ts[i] - ts[i - 1]);
  assert.ok(gap <= 10, gap);
});
test('first surprise (lucky bond) appears about 38 s in', () => {
  const s = newState(); tick(s, 37, () => 0.5); assert.equal(s.rare, null); tick(s, 2, () => 0.5); assert.ok(s.rare && s.rare.type === 'lucky');
});
test('first molecule creates exactly one discovery reveal', () => {
  const s = newState(); s.inv.H = 100; tick(s, 1); const n = s.q.filter(e => e.k === 'reveal' && e.sp === 'H2').length; tick(s, 1);
  assert.equal(n, 1); assert.equal(s.q.filter(e => e.k === 'reveal').length, 1);
});
test('always 3 goals (or endless fallback); goals pay once', () => {
  const s = newState(); assert.equal(activeGoals(s).length, 3);
  for (let i = 0; i < 12; i++) tap(s);
  const e0 = s.energy; tick(s, 0.1);
  assert.ok(s.goalsDone.tap10 && s.energy > e0);
  for (const g of GOALS) s.goalsDone[g.id] = true;
  const a = activeGoals(s); assert.equal(a.length, 1); assert.equal(a[0].id, 'endless');
});
test('achievements give a permanent production bonus', () => {
  const s = newState(); const a = globalMult(s); s.stats.taps = 150; tick(s, 0.1); assert.ok(s.ach.a100); assert.ok(globalMult(s) > a);
  assert.equal(ACHS.length, 12);
});
test('perfect balance yields a streak; mismatched dials reset it', () => {
  const mk = (d) => { const s = newState(); s.reactors.H2O.owned = s.reactors.H2O.active = true; s.reactors.H2O.dials = d; s.inv.H2 = 1e5; s.inv.O2 = 1e5; return s; };
  const a = mk({ H2: 4, O2: 2 }); tick(a, 5);
  assert.ok(isPerfect(RX.H2O, a.reactors.H2O.dials)); assert.ok(a.streak >= 4.9); assert.ok(a.stats.bestStreak >= 4.9);
  const c = mk({ H2: 1, O2: 1 }); tick(c, 5); assert.equal(c.streak, 0);
  assert.equal(PERFECT_BONUS, 1.25);
});
test('perfect bonus beats the same throughput without it', () => {
  const mk = (d) => { const s = newState(); s.reactors.H2O.owned = s.reactors.H2O.active = true; s.reactors.H2O.dials = d; s.inv.H2 = 1e6; s.inv.O2 = 1e6; tick(s, 4); return s.inv.H2O; };
  assert.ok(mk({ H2: 2, O2: 1 }) > mk({ H2: 3, O2: 1 }) * 1.2);
});
test('setDial reaching perfect queues a perfect event', () => {
  const s = newState(); s.reactors.H2O.owned = true; assert.equal(setDial(s, 'H2O', 'H2', 2), true);
  assert.ok(s.q.some(e => e.k === 'perfect')); assert.ok(s.stats.perfectEver);
});
test('overload: win = x3 boost; loss = 8 s jam; nothing permanent is lost', () => {
  const w = newState(); w.ev = { rid: 'H2', left: 5 }; assert.equal(overload(w, () => 0.1), true);
  assert.equal(w.stab.mult, 3); assert.equal(w.stats.overWin, 1);
  const l = newState(); l.ev = { rid: 'H2', left: 5 }; l.inv.H = 1e4; l.energy = 50; assert.equal(overload(l, () => 0.9), false);
  assert.ok(l.jam && l.jam.rid === 'H2'); const h = l.inv.H; tick(l, 3); assert.equal(l.inv.H, h); assert.equal(l.energy, 50);
  tick(l, 6); assert.equal(l.jam, null); tick(l, 3); assert.ok(l.inv.H < h);
  assert.equal(overload(newState()), null);
});
test('rare events: lucky bond pays, catalyst boosts, unclaimed ones expire harmlessly', () => {
  const s = newState(); s.incomeEst = 100; s.rare = { type: 'lucky', left: 5, seed: 0.5 }; const r = collectRare(s);
  assert.ok(r.reward >= 4500 && s.energy === r.reward && s.rare === null);
  const c = newState(); c.rare = { type: 'catalyst', left: 5, seed: 0.5 }; collectRare(c); assert.equal(c.cat, 15);
  const x = newState(); x.rare = { type: 'lucky', left: 0.5, seed: 0.1 }; tick(x, 1); assert.equal(x.rare, null); assert.equal(x.energy, 0);
});
test('old v1.0.0 saves still load', () => {
  const old = JSON.stringify({ v: 1, energy: 77, runEnergy: 77, totalEnergy: 90, inv: { H: 5 }, gens: { H: 2, O: 0, C: 0, N: 0 }, upg: { tap: 1 }, pp: 1, seen: { tips: 3, codex: {} }, settings: { mute: true } });
  const s = deserialize(old); assert.equal(s.energy, 77); assert.equal(s.gens.H, 2); assert.equal(s.pp, 1); assert.deepEqual(s.disc, {}); assert.equal(s.settings.shake, true);
});
test('new save fields round trip; the transient queue is not saved', () => {
  const s = newState(); s.disc.H2 = true; s.ach.a100 = true; s.goalsDone.tap10 = true; s.stats.made.H2 = 12; s.q.push({ k: 'goal' });
  const text = serialize(s); assert.ok(!text.includes('"q"'));
  const b = deserialize(text); assert.ok(b.disc.H2 && b.ach.a100 && b.goalsDone.tap10); assert.equal(b.stats.made.H2, 12); assert.deepEqual(b.q, []);
});
test('phase change keeps shelf and achievements, resets the run pile', () => {
  const s = newState(); s.runEnergy = 3e8; s.disc.H2 = true; s.ach.a100 = true; s.runMade.H2 = 50; s.stats.made.H2 = 50;
  assert.ok(phaseChange(s) >= 1); assert.ok(s.disc.H2 && s.ach.a100); assert.deepEqual(s.runMade, {}); assert.equal(s.stats.made.H2, 50);
});

test('first-run help flag survives save and load (regression: it used to be dropped)', () => {
  const s = newState(); s.seen.help = 1;
  assert.equal(deserialize(serialize(s)).seen.help, 1);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
