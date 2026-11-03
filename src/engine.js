// Pure game logic: no DOM, no timers. Used by the UI and by the Node tests/simulation.
import {
  ATOMS, REACTIONS, RX, VALUE, GENS, GEN_GROWTH, UPGRADES, BASE_SLOTS, MAX_SLOTS,
  BASE_THROUGHPUT, PHASE_THRESHOLD, PP_DIV, PP_BONUS, OFFLINE_CAP, OFFLINE_RATE, SAVE_VERSION,
} from './data.js';
import { clamp } from './num.js';

const SPECIES = ['H', 'O', 'C', 'N', 'H2', 'O2', 'N2', 'H2O', 'CO2', 'CH4', 'NH3', 'GLU'];

export function newState() {
  const inv = {};
  for (const s of SPECIES) inv[s] = 0;
  const reactors = {};
  for (const r of REACTIONS) {
    reactors[r.id] = { owned: r.id === 'H2', active: r.id === 'H2', dials: Object.fromEntries(Object.keys(r.inp).map(k => [k, 1])) };
  }
  return {
    v: SAVE_VERSION,
    energy: 0, runEnergy: 0, totalEnergy: 0,
    inv, reactors,
    gens: { H: 0, O: 0, C: 0, N: 0 },
    upg: { tap: 0, eff: 0, speed: 0, bond: 0, auto: 0 },
    pp: 0, phases: 0, prestige2: null, // prestige2: hook for a future second layer
    selAtom: 'H',
    x2: 0,             // seconds of 2x production left
    evTimer: 75, ev: null, stab: null, stability: 0,
    playTime: 0, runTime: 0, taps: 0,
    seen: { tips: 0, codex: {} },
    settings: { mute: false },
    lastSave: 0,
  };
}

export const ppMult = s => 1 + PP_BONUS * s.pp;
export const slots = s => Math.min(MAX_SLOTS, BASE_SLOTS + Math.floor(s.pp / 3));
export const tapAtoms = s => 3 + 2 * s.upg.tap;
export const speedMult = s => Math.pow(1.4, s.upg.speed);
export const effMult = s => Math.pow(1.5, s.upg.eff);
export const bondMult = s => Math.pow(1.6, s.upg.bond);
export const boostMult = s => (s.x2 > 0 ? 2 : 1);

export function ratioEfficiency(r, dials) {
  const keys = Object.keys(r.inp);
  if (keys.length === 1) return 1;
  const dsum = keys.reduce((a, k) => a + dials[k], 0);
  const events = Math.min(...keys.map(k => (dials[k] / dsum) / r.inp[k]));
  const csum = keys.reduce((a, k) => a + r.inp[k], 0);
  return Math.min(1, events * csum); // fraction of consumed atoms that become product
}

export function genCost(s, id) { return GENS[id].base * Math.pow(GEN_GROWTH, s.gens[id]); }
export function upgCost(s, id) { const u = UPGRADES[id]; return u.base * Math.pow(u.growth, s.upg[id]); }

export function activeCount(s) { return REACTIONS.filter(r => s.reactors[r.id].active).length; }

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
  if (s.upg.auto) return;
  s.reactors[id].dials[k] = Math.max(1, Math.min(9, Math.round(v)));
}

export function tap(s) {
  const n = tapAtoms(s) * ppMult(s);
  s.inv[s.selAtom] = clamp(s.inv[s.selAtom] + n);
  s.taps++;
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
    settings: s.settings, totalEnergy: s.totalEnergy, playTime: s.playTime, taps: s.taps, stability: s.stability, selAtom: 'H' };
  const fresh = newState();
  Object.assign(s, fresh, keep);
  return gain;
}

// Advance simulation by dt seconds. rand: () => [0,1)
export function tick(s, dt, rand = Math.random) {
  if (dt <= 0) return;
  s.playTime += dt; s.runTime += dt;
  if (s.x2 > 0) s.x2 = Math.max(0, s.x2 - dt);

  const gm = effMult(s) * boostMult(s);
  for (const a of ATOMS) {
    if (s.gens[a]) s.inv[a] = clamp(s.inv[a] + GENS[a].prod * s.gens[a] * gm * dt);
  }

  const thr = BASE_THROUGHPUT * speedMult(s) * boostMult(s);
  const em = ppMult(s) * bondMult(s);
  for (const r of REACTIONS) { // REACTIONS ordered so ingredients are made before use
    const st = s.reactors[r.id];
    if (!st.active) continue;
    const keys = Object.keys(r.inp);
    const dsum = keys.reduce((a, k) => a + st.dials[k], 0);
    let T = thr * dt;
    if (s.stab && s.stab.rid === r.id) T *= 1.25;
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
    let gain = 0;
    for (const o of Object.keys(r.out)) {
      const n = r.out[o] * events;
      s.inv[o] = clamp(s.inv[o] + n);
      gain += n * VALUE[o];
    }
    gain = clamp(gain * em);
    s.energy = clamp(s.energy + gain);
    s.runEnergy = clamp(s.runEnergy + gain);
    s.totalEnergy = clamp(s.totalEnergy + gain);
  }

  // Unstable Reaction events (optional bonus, never a penalty).
  if (s.stab) { s.stab.left -= dt; if (s.stab.left <= 0) s.stab = null; }
  if (s.ev) {
    s.ev.left -= dt;
    if (s.ev.left <= 0) { s.ev = null; s.evTimer = 60 + rand() * 60; }
  } else {
    s.evTimer -= dt;
    if (s.evTimer <= 0) {
      const act = REACTIONS.filter(r => s.reactors[r.id].active);
      if (act.length) s.ev = { rid: act[Math.floor(rand() * act.length)].id, left: 6 };
      else s.evTimer = 10;
    }
  }
}

export function stabilise(s) {
  if (!s.ev) return false;
  s.stab = { rid: s.ev.rid, left: 20 };
  s.ev = null; s.evTimer = 60 + 60 * 0.5; s.stability++;
  return true;
}

// Offline progress: simulate (elapsed, capped at 8h) at 50% speed in coarse steps.
export function offline(s, elapsedSec, rand = () => 0.5) {
  const el = Math.min(Math.max(0, elapsedSec), OFFLINE_CAP);
  if (el < 30) return { seconds: 0, energy: 0 };
  const before = s.energy;
  const saveEv = [s.ev, s.stab, s.evTimer, s.x2];
  let left = el * OFFLINE_RATE;
  const step = 5;
  const pt = s.playTime, rt = s.runTime;
  while (left > 0) { const d = Math.min(step, left); tick(s, d, rand); left -= d; }
  s.playTime = pt; s.runTime = rt;
  [s.ev, s.stab, s.evTimer, s.x2] = [null, null, 60, saveEv[3]];
  return { seconds: el, energy: s.energy - before };
}

// ---- Save / load ----
export function serialize(s) { return JSON.stringify(s); }

export function deserialize(text) {
  const d = JSON.parse(text);
  if (!d || typeof d !== 'object' || d.v !== SAVE_VERSION) throw new Error('bad save');
  const s = newState();
  const merge = (dst, src) => {
    for (const k of Object.keys(dst)) {
      if (!(k in src)) continue;
      if (dst[k] && typeof dst[k] === 'object' && !Array.isArray(dst[k])) merge(dst[k], src[k] || {});
      else if (typeof dst[k] === typeof src[k] && (typeof src[k] !== 'number' || Number.isFinite(src[k]))) dst[k] = src[k];
    }
  };
  merge(s, d);
  if (d.seen && d.seen.codex && typeof d.seen.codex === 'object') s.seen.codex = { ...d.seen.codex };
  s.ev = null; s.stab = null; // transient
  return s;
}

export function exportSave(s) { return btoa(unescape(encodeURIComponent(serialize(s)))); }
export function importSave(text) { return deserialize(decodeURIComponent(escape(atob(text.trim())))); }
