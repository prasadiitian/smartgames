import assert from 'node:assert/strict';
import { REACTIONS, FORMULA, COLORS } from '../src/data.js';
import { fmt, MAX, clamp } from '../src/num.js';
import {
  newState, tick, tap, serialize, deserialize, exportSave, importSave, offline, ratioEfficiency,
  buyReactor, setDial, stabilise, overload, collectRare, phaseChange, phasePointsGain, isPerfect, globalMult,
} from '../src/engine.js';
import { run } from './sim.mjs';
import { RX, PERFECT_BONUS } from '../src/data.js';
import { GOALS, ACHS, activeGoals } from '../src/goals.js';

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ok   ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message); }
}

// 1. Atom conservation
const count = (side) => {
  const t = {};
  for (const [sp, n] of Object.entries(side)) for (const [a, k] of Object.entries(FORMULA[sp])) t[a] = (t[a] || 0) + n * k;
  return t;
};
for (const r of REACTIONS) test('atoms conserved: ' + r.eq, () => assert.deepEqual(count(r.inp), count(r.out)));
test('spec reactions present', () => {
  const ids = REACTIONS.map(r => r.id);
  for (const id of ['H2', 'O2', 'H2O', 'CO2', 'CH4', 'NH3', 'GLU']) assert.ok(ids.includes(id));
});

// 2. Economy simulation
const sim = run(60);
test('first upgrade affordable within 10s', () => assert.ok(sim.first.upg <= 10, sim.first.upg));
test('first auto-generator within 60s', () => assert.ok(sim.first.gen <= 60, sim.first.gen));
test('first molecule within 2 min', () => assert.ok(sim.first.molecule <= 120, sim.first.molecule));
test('first Phase Change at 25-40 min', () => assert.ok(sim.phaseAt >= 25 * 60 && sim.phaseAt <= 40 * 60, sim.phaseAt / 60));
test('never >60s with nothing affordable', () => assert.ok(sim.maxGap <= 60, sim.maxGap));
test('all reactors reached in 60 min (no dead end)', () => assert.ok(REACTIONS.every(r => sim.state.reactors[r.id].owned)));
test('phase change resets run, keeps points', () => {
  const s = sim.state;
  const gain = phasePointsGain(s);
  assert.ok(gain >= 1);
  phaseChange(s);
  assert.equal(s.energy, 0); assert.equal(s.pp, gain); assert.equal(s.gens.H, 0);
});
test('idle-heavy player still reaches Phase Change within 60 min', () => {
  const r = run(60, { activeMin: 2, tapsIdle: 0 });
  assert.ok(r.phaseAt !== null && r.phaseAt <= 3600, r.phaseAt);
});

// 3. Save / offline / numbers
test('save round trip', () => {
  const s = newState(); s.energy = 1234.5; s.gens.H = 3; s.seen.codex.H2 = true; s.reactors.H2O.owned = true;
  const b = deserialize(serialize(s));
  assert.equal(b.energy, 1234.5); assert.equal(b.gens.H, 3); assert.equal(b.seen.codex.H2, true); assert.equal(b.reactors.H2O.owned, true);
});
test('export/import round trip', () => {
  const s = newState(); s.energy = 99; assert.equal(importSave(exportSave(s)).energy, 99);
});
test('bad saves rejected', () => {
  assert.throws(() => deserialize('nope'));
  assert.throws(() => deserialize('{"v":99}'));
  assert.throws(() => importSave('@@@'));
});
test('NaN in save ignored', () => {
  const s = newState(); const j = JSON.parse(serialize(s)); j.energy = null; j.gens.H = 'x';
  const b = deserialize(JSON.stringify(j)); assert.equal(b.energy, 0); assert.equal(b.gens.H, 0);
});
test('offline progress gives energy, capped at 8h', () => {
  const s = newState(); s.gens.H = 5; s.inv.H = 100;
  const a = offline(s, 3600).energy;
  const t = newState(); t.gens.H = 5; t.inv.H = 100;
  const c = offline(t, 100 * 3600);
  assert.ok(a > 0); assert.equal(c.seconds, 8 * 3600);
});
test('offline ignores tiny gaps', () => assert.equal(offline(newState(), 5).seconds, 0));
test('number formatting', () => {
  assert.equal(fmt(0), '0'); assert.equal(fmt(15), '15'); assert.equal(fmt(1.5), '1.50');
  assert.equal(fmt(1500), '1.50K'); assert.equal(fmt(2.3e6), '2.30M'); assert.equal(fmt(999999), '1.00M');
  assert.equal(fmt(1e36), '1.00e36'); assert.equal(fmt(1e300), '1.00e300');
  assert.equal(fmt(Infinity), '1.00e300'); assert.equal(fmt(NaN), '0');
});
test('values stay finite at 1e300', () => {
  assert.equal(clamp(1e305), MAX); assert.equal(clamp(Infinity), MAX);
  const s = newState(); s.inv.H = 1e299; s.gens.H = 1e299; s.upg.eff = 25; tick(s, 1000);
  assert.ok(Number.isFinite(s.inv.H) && s.inv.H <= MAX && Number.isFinite(s.energy));
});

// Mechanics
test('ratio dials: balanced yields 100%, mismatch wastes', () => {
  const h2o = REACTIONS.find(r => r.id === 'H2O');
  assert.equal(ratioEfficiency(h2o, { H2: 2, O2: 1 }), 1);
  assert.equal(ratioEfficiency(h2o, { H2: 4, O2: 2 }), 1);
  assert.ok(ratioEfficiency(h2o, { H2: 1, O2: 1 }) < 0.8);
});
test('balanced reactor beats mismatched one', () => {
  const mk = (d) => { const s = newState(); s.reactors.H2O.owned = s.reactors.H2O.active = true; s.reactors.H2O.dials = d;
    s.inv.H2 = 1e4; s.inv.O2 = 1e4; tick(s, 10); return s.inv.H2O; };
  assert.ok(mk({ H2: 2, O2: 1 }) > mk({ H2: 1, O2: 1 }) * 1.2);
});
test('tap adds atoms', () => { const s = newState(); tap(s); assert.ok(s.inv.H >= 3); });
test('unstable event is optional and never costs progress', () => {
  const s = newState(); s.evTimer = 0.1; tick(s, 0.2, () => 0); assert.ok(s.ev);
  const e0 = s.energy; tick(s, 9, () => 0.5); assert.equal(s.ev, null); assert.ok(s.energy >= e0);
  const t = newState(); t.evTimer = 0.1; tick(t, 0.2, () => 0); assert.ok(stabilise(t)); assert.ok(t.stab);
});
test('palette: colours distinct (colorblind-safe Okabe-Ito set)', () => {
  const v = Object.values(COLORS); assert.equal(new Set(v).size, v.length);
  const okabe = ['#56B4E9', '#D55E00', '#999999', '#E69F00'];
  for (const c of v) assert.ok(okabe.includes(c));
});
test('buyReactor deducts cost', () => { const s = newState(); s.energy = 100; assert.ok(buyReactor(s, 'O2')); assert.equal(s.energy, 60); });
test('dial range clamps', () => { const s = newState(); setDial(s, 'H2O', 'H2', 99); assert.equal(s.reactors.H2O.dials.H2, 9); });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
