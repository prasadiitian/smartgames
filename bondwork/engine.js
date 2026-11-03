// Pure game logic: no DOM, no timers. Used by the UI and by the Node tests/simulation.
import {
  ATOMS, REACTIONS, RX, VALUE, GENS, GEN_GROWTH, UPGRADES, BASE_SLOTS, MAX_SLOTS, START_DIALS,
  BASE_THROUGHPUT, PHASE_THRESHOLD, PP_DIV, PP_BONUS, OFFLINE_CAP, OFFLINE_RATE, SAVE_VERSION,
  PERFECT_BONUS, STREAK_MAX,
} from './data.js';
import { clamp } from './num.js';
import { GOALS, ACHS, ACH_BONUS, activeGoals, endlessGoal } from './goals.js';

const SPECIES = ['H', 'O', 'C', 'N', 'H2', 'O2', 'N2', 'H2O', 'CO2', 'CH4', 'NH3', 'GLU'];
const FIRST_RARE = 38; // seconds: the first surprise arrives early on purpose

export function newState() {
  const inv = {};
  for (const s of SPECIES) inv[s] = 0;
  const reactors = {};
  for (const r of REACTIONS) {
    const dials = START_DIALS[r.id] ? { ...START_DIALS[r.id] } : Object.fromEntries(Object.keys(r.inp).map(k => [k, 1]));
    reactors[r.id] = { owned: r.id === 'H2', active: r.id === 'H2', dials };
  }
  return {
    v: SAVE_VERSION,
    energy: 0, runEnergy: 0, totalEnergy: 0,
    inv, reactors,
    gens: { H: 0, O: 0, C: 0, N: 0 },
    upg: { tap: 0, eff: 0, speed: 0, bond: 0, auto: 0 },
    pp: 0, phases: 0, prestige2: null, // prestige2: hook for a future second layer
    selAtom: 'H',
    x2: 0,             // seconds of 2x production left (rewarded hook)
    cat: 0,            // seconds of catalyst (x3) left
    evTimer: 75, ev: null, stab: null, jam: null, stability: 0,
    rareTimer: FIRST_RARE, rare: null,
    streak: 0, incomeEst: 0,
    runMade: {},
    disc: {}, ach: {}, goalsDone: {}, genGoal: 0,
    stats: { taps: 0, made: {}, events: 0, overWin: 0, rare: 0, perfectEver: false, bestStreak: 0 },
    playTime: 0, runTime: 0, taps: 0,
    seen: { tips: 0, help: 0, codex: {} },
    settings: { mute: false, shake: true },
    lastSave: 0,
    q: [],             // transient UI event queue (never saved)
  };
}

export const achMult = s => 1 + ACH_BONUS * Object.keys(s.ach).length;
export const ppMult = s => 1 + PP_BONUS * s.pp;
export const globalMult = s => ppMult(s) * achMult(s);
export const slots = s => Math.min(MAX_SLOTS, BASE_SLOTS + Math.floor(s.pp / 3));
export const tapAtoms = s => 3 + 2 * s.upg.tap;
export const speedMult = s => Math.pow(1.4, s.upg.speed);
export const effMult = s => Math.pow(1.5, s.upg.eff);
export const bondMult = s => Math.pow(1.6, s.upg.bond);
export const boostMult = s => (s.x2 > 0 ? 2 : 1) * (s.cat > 0 ? 3 : 1);
export const streakMult = s => 1 + Math.min(STREAK_MAX, s.streak * 0.004);

export function ratioEfficiency(r, dials) {
  const keys = Object.keys(r.inp);
  if (keys.length === 1) return 1;
  const dsum = keys.reduce((a, k) => a + dials[k], 0);
  const events = Math.min(...keys.map(k => (dials[k] / dsum) / r.inp[k]));
  const csum = keys.reduce((a, k) => a + r.inp[k], 0);
  return Math.min(1, events * csum); // fraction of consumed atoms that become product
}
export const isPerfect = (r, dials) => Object.keys(r.inp).length > 1 && ratioEfficiency(r, dials) >= 0.999;

// Which ingredient is in excess (null when balanced / single ingredient).
export function excessIngredient(r, dials) {
  const keys = Object.keys(r.inp);
  if (keys.length === 1) return null;
  const ratios = keys.map(k => dials[k] / r.inp[k]);
  const lo = Math.min(...ratios), hi = Math.max(...ratios);
  if (hi - lo < 1e-9) return null;
  return keys[ratios.indexOf(hi)];
}

export function genCost(s, id) { return GENS[id].base * Math.pow(GEN_GROWTH, s.gens[id]); }
export function upgCost(s, id) { const u = UPGRADES[id]; return u.base * Math.pow(u.growth, s.upg[id]); }
export function activeCount(s) { return REACTIONS.filter(r => s.reactors[r.id].active).length; }

const push = (s, e) => { if (s.q.length < 30) s.q.push(e); };

export function buyGen(s, id) {
  const c = genCost(s, id);
  if (s.energy < c) return false;
  s.energy -= c; s.gens[id]++; return true;
}
export function buyUpgrade(s, id) {
  if (s.upg[id] >= UPGRADES[id].max) return false;
  const c = upgCost(s, id);
  if (s.energy < c) return false;
  s.energy -= c; s.upg[id]++;
  if (id === 'auto') for (const r of REACTIONS) setIdeal(s, r.id);
  return true;
}
export function buyReactor(s, id) {
  const r = RX[id], st = s.reactors[id];
  if (st.owned || s.energy < r.cost) return false;
  s.energy -= r.cost; st.owned = true;
  if (activeCount(s) < slots(s)) st.active = true;
  if (s.upg.auto) setIdeal(s, id);
  return true;
}
export function toggleReactor(s, id) {
  const st = s.reactors[id];
  if (!st.owned) return false;
  if (st.active) { st.active = false; return true; }
  if (activeCount(s) >= slots(s)) return false;
  st.active = true; return true;
}
export function setIdeal(s, id) {
  const r = RX[id];
  for (const k of Object.keys(r.inp)) s.reactors[id].dials[k] = r.inp[k];
}
export function setDial(s, id, k, v) {
  if (s.upg.auto) return false;
  const r = RX[id], d = s.reactors[id].dials;
  const was = isPerfect(r, d);
  d[k] = Math.max(1, Math.min(9, Math.round(v)));
  const now = isPerfect(r, d);
  if (now && !was) { s.stats.perfectEver = true; push(s, { k: 'perfect', rid: id }); }
  return now && !was;
}

export function tap(s) {
  const n = tapAtoms(s) * globalMult(s);
  s.inv[s.selAtom] = clamp(s.inv[s.selAtom] + n);
  s.taps++; s.stats.taps++;
  return n;
}

export function phasePointsGain(s) {
  if (s.runEnergy < PHASE_THRESHOLD) return 0;
  return Math.max(1, Math.floor(Math.sqrt(s.runEnergy / PP_DIV)));
}

export function phaseChange(s) {
  const gain = phasePointsGain(s);
  if (!gain) return 0;
  const keep = { pp: s.pp + gain, phases: s.phases + 1, prestige2: s.prestige2, seen: s.seen,
    settings: s.settings, totalEnergy: s.totalEnergy, playTime: s.playTime, taps: s.taps, stability: s.stability, selAtom: 'H',
    disc: s.disc, ach: s.ach, goalsDone: s.goalsDone, genGoal: s.genGoal, stats: s.stats, rareTimer: 90, incomeEst: 0 };
  const fresh = newState();
  Object.assign(s, fresh, keep);
  return gain;
}

// ---- rare events and unstable reactions (all optional; ignoring them never costs progress) ----
export function stabilise(s) {
  if (!s.ev) return false;
  s.stab = { rid: s.ev.rid, left: 20, mult: 1.25 };
  s.ev = null; s.evTimer = 90; s.stability++; s.stats.events++;
  return true;
}
// Risky choice: 50% chance of x3 output for 15 s, 50% chance the reactor jams for 8 s. Nothing permanent either way.
export function overload(s, rand = Math.random) {
  if (!s.ev) return null;
  const rid = s.ev.rid, win = rand() < 0.5;
  if (win) { s.stab = { rid, left: 15, mult: 3 }; s.stats.overWin++; }
  else s.jam = { rid, left: 8 };
  s.ev = null; s.evTimer = 90; s.stats.events++;
  return win;
}
export function collectRare(s) {
  if (!s.rare) return null;
  const type = s.rare.type; let reward = 0;
  if (type === 'lucky') {
    reward = Math.max(20, s.incomeEst * 45);
    s.energy = clamp(s.energy + reward); s.runEnergy = clamp(s.runEnergy + reward); s.totalEnergy = clamp(s.totalEnergy + reward);
  } else s.cat = 15;
  s.rare = null; s.rareTimer = 100 + 100 * 0.5; s.stats.rare++;
  return { type, reward };
}

function checkProgress(s) {
  for (const g of activeGoals(s)) {
    const p = g.prog(s);
    if (p.cur >= p.max) {
      const reward = Math.max(g.flat, s.incomeEst * 25);
      if (g.id === 'endless') s.genGoal++; else s.goalsDone[g.id] = true;
      s.energy = clamp(s.energy + reward); s.runEnergy = clamp(s.runEnergy + reward); s.totalEnergy = clamp(s.totalEnergy + reward);
      push(s, { k: 'goal', text: g.text, reward });
    }
  }
  for (const a of ACHS) if (!s.ach[a.id] && a.cond(s)) { s.ach[a.id] = true; push(s, { k: 'ach', id: a.id, name: a.name }); }
}

// Advance simulation by dt seconds. rand: () => [0,1). emit(e): optional visual callback.
export function tick(s, dt, rand = Math.random, emit = null) {
  if (dt <= 0) return;
  s.playTime += dt; s.runTime += dt;
  if (s.x2 > 0) s.x2 = Math.max(0, s.x2 - dt);
  if (s.cat > 0) s.cat = Math.max(0, s.cat - dt);

  const gm = effMult(s) * boostMult(s);
  for (const a of ATOMS) {
    if (s.gens[a]) s.inv[a] = clamp(s.inv[a] + GENS[a].prod * s.gens[a] * gm * dt);
  }

  const thr = BASE_THROUGHPUT * speedMult(s) * boostMult(s);
  const em = globalMult(s) * bondMult(s) * streakMult(s);
  let tickGain = 0, multiOn = 0, multiPerfect = 0;
  for (const r of REACTIONS) { // REACTIONS ordered so ingredients are made before use
    const st = s.reactors[r.id];
    if (!st.active) continue;
    const keys = Object.keys(r.inp);
    const perfect = isPerfect(r, st.dials);
    if (keys.length > 1) { multiOn++; if (perfect) multiPerfect++; }
    if (s.jam && s.jam.rid === r.id) continue;
    const dsum = keys.reduce((a, k) => a + st.dials[k], 0);
    let T = thr * dt;
    if (s.stab && s.stab.rid === r.id) T *= s.stab.mult;
    let scale = 1;
    const cons = {};
    let events = Infinity;
    for (const k of keys) {
      cons[k] = T * st.dials[k] / dsum;
      events = Math.min(events, cons[k] / r.inp[k]);
      scale = Math.min(scale, s.inv[k] / cons[k]);
    }
    if (!(scale > 0)) continue;
    scale = Math.min(1, scale);
    events *= scale;
    for (const k of keys) s.inv[k] -= cons[k] * scale;
    if (perfect) events *= PERFECT_BONUS;
    let gain = 0;
    for (const o of Object.keys(r.out)) {
      const n = r.out[o] * events;
      s.inv[o] = clamp(s.inv[o] + n);
      s.stats.made[o] = (s.stats.made[o] || 0) + n;
      s.runMade[o] = (s.runMade[o] || 0) + n;
      if (!s.disc[o] && s.inv[o] >= 1) { s.disc[o] = true; push(s, { k: 'reveal', sp: o }); }
      gain += n * VALUE[o];
      if (emit) emit({ k: 'make', sp: o, n, rid: r.id, perfect });
    }
    gain = clamp(gain * em);
    tickGain += gain;
    s.energy = clamp(s.energy + gain);
    s.runEnergy = clamp(s.runEnergy + gain);
    s.totalEnergy = clamp(s.totalEnergy + gain);
  }
  s.incomeEst += (tickGain / dt - s.incomeEst) * Math.min(1, dt / 5);

  // Perfect streak: grows while every active two-ingredient reactor is balanced.
  if (multiOn > 0 && multiPerfect === multiOn) { s.streak += dt; if (s.streak > s.stats.bestStreak) s.stats.bestStreak = s.streak; }
  else s.streak = 0;

  if (s.stab) { s.stab.left -= dt; if (s.stab.left <= 0) s.stab = null; }
  if (s.jam) { s.jam.left -= dt; if (s.jam.left <= 0) s.jam = null; }

  // Unstable Reaction: a decision, not a chore.
  if (s.ev) {
    s.ev.left -= dt;
    if (s.ev.left <= 0) { s.ev = null; s.evTimer = 60 + rand() * 60; }
  } else {
    s.evTimer -= dt;
    if (s.evTimer <= 0) {
      const act = REACTIONS.filter(r => s.reactors[r.id].active);
      if (act.length) s.ev = { rid: act[Math.floor(rand() * act.length)].id, left: 8 };
      else s.evTimer = 10;
    }
  }

  // Rare events: a floating token the UI places; it expires on its own.
  if (s.rare) {
    s.rare.left -= dt;
    if (s.rare.left <= 0) { s.rare = null; s.rareTimer = 80 + rand() * 80; }
  } else {
    s.rareTimer -= dt;
    if (s.rareTimer <= 0) {
      const lucky = s.stats.rare === 0 || rand() < 0.5;
      s.rare = { type: lucky ? 'lucky' : 'catalyst', left: 9, seed: rand() };
    }
  }
  checkProgress(s);
}

// Offline progress: simulate (elapsed, capped at 8h) at 50% speed in coarse steps.
export function offline(s, elapsedSec, rand = () => 0.5) {
  const el = Math.min(Math.max(0, elapsedSec), OFFLINE_CAP);
  if (el < 30) return { seconds: 0, energy: 0 };
  const before = s.energy;
  const keep = { x2: s.x2, cat: s.cat, streak: s.streak, rare: s.rare, rareTimer: s.rareTimer, stab: s.stab, jam: s.jam, ev: s.ev, evTimer: s.evTimer };
  let left = el * OFFLINE_RATE;
  const step = 5;
  const pt = s.playTime, rt = s.runTime;
  while (left > 0) { const d = Math.min(step, left); tick(s, d, rand); left -= d; }
  s.playTime = pt; s.runTime = rt;
  s.x2 = keep.x2; s.cat = 0; s.streak = keep.streak; s.rare = null; s.rareTimer = 30; s.stab = null; s.jam = null; s.ev = null; s.evTimer = 60;
  s.q = s.q.filter(e => e.k !== 'perfect');
  return { seconds: el, energy: s.energy - before };
}

// ---- Save / load ----
export function serialize(s) { return JSON.stringify(s, (k, v) => (k === 'q' ? undefined : v)); }

export function deserialize(text) {
  const d = JSON.parse(text);
  if (!d || typeof d !== 'object' || d.v !== SAVE_VERSION) throw new Error('bad save');
  const s = newState();
  const merge = (dst, src) => {
    for (const k of Object.keys(dst)) {
      if (!(k in src)) continue;
      const dv = dst[k], sv = src[k];
      if (dv && typeof dv === 'object' && !Array.isArray(dv)) {
        if (!sv || typeof sv !== 'object') continue;
        if (Object.keys(dv).length === 0) { for (const kk of Object.keys(sv)) if (['boolean', 'number'].includes(typeof sv[kk]) && (typeof sv[kk] !== 'number' || Number.isFinite(sv[kk]))) dv[kk] = sv[kk]; }
        else merge(dv, sv);
      } else if (typeof dv === typeof sv && (typeof sv !== 'number' || Number.isFinite(sv))) dst[k] = sv;
    }
  };
  merge(s, d);
  s.ev = null; s.stab = null; s.jam = null; s.rare = null; s.q = [];
  return s;
}

export function exportSave(s) { return btoa(unescape(encodeURIComponent(serialize(s)))); }
export function importSave(text) { return deserialize(decodeURIComponent(escape(atob(text.trim())))); }

export { GOALS, ACHS, endlessGoal, activeGoals };
