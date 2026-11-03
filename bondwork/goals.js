// Goals and achievements. Pure data + predicates; the engine evaluates them every tick.
import { fmt } from './num.js';

const own = (id) => (s) => ({ cur: s.reactors[id].owned ? 1 : 0, max: 1 });
const made = (sp, n) => (s) => ({ cur: s.stats.made[sp] || 0, max: n });
const gens = (g, n) => (s) => ({ cur: s.gens[g], max: n });
const total = (n) => (s) => ({ cur: s.totalEnergy, max: n });

// Ordered short-term goals. The player always sees the first three that are not done yet.
// reward = max(flat, 25 seconds of current income) so goals stay meaningful at every stage.
export const GOALS = [
  { id: 'tap10',  text: 'Spark 10 atoms',                 prog: (s) => ({ cur: s.stats.taps, max: 10 }), flat: 8 },
  { id: 'h2',     text: 'Make your first H₂',        prog: made('H2', 1), flat: 8 },
  { id: 'upTap',  text: 'Buy a Spark Power upgrade',      prog: (s) => ({ cur: s.upg.tap, max: 1 }), flat: 12 },
  { id: 'gen3',   text: 'Own 3 Hydrogen Sources',         prog: gens('H', 3), flat: 20 },
  { id: 'e100',   text: 'Earn 100 Energy',                prog: total(100), flat: 25 },
  { id: 'rxO2',   text: 'Build the O₂ reactor',      prog: own('O2'), flat: 30 },
  { id: 'rare1',  text: 'Catch a lucky bond',             prog: (s) => ({ cur: s.stats.rare, max: 1 }), flat: 40 },
  { id: 'rxH2O',  text: 'Build the H₂O reactor',     prog: own('H2O'), flat: 50 },
  { id: 'water',  text: 'Make your first water',          prog: made('H2O', 1), flat: 60 },
  { id: 'perfect', text: 'Balance a reactor perfectly',   prog: (s) => ({ cur: s.stats.perfectEver ? 1 : 0, max: 1 }), flat: 80 },
  { id: 'gen10',  text: 'Own 10 Hydrogen Sources',        prog: gens('H', 10), flat: 100 },
  { id: 'event1', text: 'Respond to an Unstable Reaction', prog: (s) => ({ cur: s.stats.events, max: 1 }), flat: 100 },
  { id: 'e1k',    text: 'Earn 1K Energy',                 prog: total(1e3), flat: 150 },
  { id: 'rxCO2',  text: 'Build the CO₂ reactor',     prog: own('CO2'), flat: 200 },
  { id: 'o5',     text: 'Own 5 Oxygen Sources',           prog: gens('O', 5), flat: 250 },
  { id: 'streak30', text: 'Hold a 30 s perfect streak',   prog: (s) => ({ cur: s.stats.bestStreak, max: 30 }), flat: 300 },
  { id: 'e10k',   text: 'Earn 10K Energy',                prog: total(1e4), flat: 500 },
  { id: 'rxCH4',  text: 'Build the CH₄ reactor',     prog: own('CH4'), flat: 800 },
  { id: 'c10',    text: 'Own 10 Carbon Sources',          prog: gens('C', 10), flat: 1000 },
  { id: 'e100k',  text: 'Earn 100K Energy',               prog: total(1e5), flat: 2000 },
  { id: 'rxNH3',  text: 'Build the NH₃ reactor',     prog: own('NH3'), flat: 4000 },
  { id: 'e1m',    text: 'Earn 1M Energy',                 prog: total(1e6), flat: 8000 },
  { id: 'rxGLU',  text: 'Build the glucose reactor',      prog: own('GLU'), flat: 20000 },
  { id: 'glu',    text: 'Make 10 glucose',                prog: made('GLU', 10), flat: 40000 },
];

// Endless goal used once the list above is finished.
export function endlessGoal(s) {
  const target = 5000 * Math.pow(4, s.genGoal);
  return { id: 'endless', text: 'Earn ' + fmt(target) + ' Energy in total', prog: (st) => ({ cur: st.totalEnergy, max: target }), flat: 0 };
}

export function activeGoals(s) {
  const out = [];
  for (const g of GOALS) { if (!s.goalsDone[g.id]) { out.push(g); if (out.length === 3) break; } }
  if (out.length < 3) out.push(endlessGoal(s));
  return out;
}

export const ACH_BONUS = 0.02;
export const ACHS = [
  { id: 'a100',   name: 'Warm-up',        desc: 'Spark 100 atoms',                cond: (s) => s.stats.taps >= 100 },
  { id: 'a1000',  name: 'Spark Plug',     desc: 'Spark 1,000 atoms',              cond: (s) => s.stats.taps >= 1000 },
  { id: 'water',  name: 'Water Works',    desc: 'Make water',                     cond: (s) => (s.stats.made.H2O || 0) >= 1 },
  { id: 'meth',   name: 'Gas Giant',      desc: 'Make methane',                   cond: (s) => (s.stats.made.CH4 || 0) >= 1 },
  { id: 'sweet',  name: 'Sweet Success',  desc: 'Make glucose',                   cond: (s) => (s.stats.made.GLU || 0) >= 1 },
  { id: 'bal',    name: 'In Balance',     desc: 'Balance a reactor perfectly',    cond: (s) => s.stats.perfectEver },
  { id: 'str60',  name: 'Steady Hands',   desc: 'Hold a 60 s perfect streak',     cond: (s) => s.stats.bestStreak >= 60 },
  { id: 'rare5',  name: 'Lucky Lab',      desc: 'Catch 5 rare events',            cond: (s) => s.stats.rare >= 5 },
  { id: 'dare',   name: 'Daredevil',      desc: 'Win an Overload',                cond: (s) => s.stats.overWin >= 1 },
  { id: 'coll',   name: 'Full Shelf',     desc: 'Discover all 8 molecules',       cond: (s) => Object.keys(s.disc).length >= 8 },
  { id: 'phase',  name: 'Phase Shifter',  desc: 'Do a Phase Change',              cond: (s) => s.phases >= 1 },
  { id: 'tycoon', name: 'Matter Tycoon',  desc: 'Earn 1M Energy in total',        cond: (s) => s.totalEnergy >= 1e6 },
];
