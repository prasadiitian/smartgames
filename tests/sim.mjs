// Economy simulation: a scripted "mixed" player. Exports run() for tests; prints a report when run directly.
import {
  newState, tick, tap, buyGen, buyUpgrade, buyReactor, genCost, upgCost, setIdeal, phasePointsGain, phaseChange,
} from '../src/engine.js';
import { REACTIONS, GENS, UPGRADES, PHASE_THRESHOLD } from '../src/data.js';

function options(s) {
  const o = [];
  for (const r of REACTIONS) if (!s.reactors[r.id].owned) o.push({ cost: r.cost, buy: () => buyReactor(s, r.id), name: 'rx:' + r.id, kind: 'rx' });
  for (const g of Object.keys(GENS)) o.push({ cost: genCost(s, g), buy: () => buyGen(s, g), name: 'gen:' + g, kind: 'gen' });
  for (const u of Object.keys(UPGRADES)) if (s.upg[u] < UPGRADES[u].max) o.push({ cost: upgCost(s, u), buy: () => buyUpgrade(s, u), name: 'upg:' + u, kind: 'upg' });
  return o;
}

// opts: tapsPerSec early, activeMinutes (taps at full rate), idleTaps after.
export function run(minutes = 60, opts = {}) {
  const { activeMin = 8, tapsActive = 4, tapsIdle = 0.3, doPhase = false, rushChem = false } = opts;
  const s = newState();
  const dt = 0.25;
  const rand = () => 0.5;
  const r = { first: {}, maxGap: 0, phaseAt: null, log: [], phases: [], events: [] };
  let rareSeen = false;
  let gap = 0, tapAcc = 0, t = 0;
  while (t < minutes * 60) {
    // pick the tap atom the economy is short of
    const need = ['H', 'O', 'C', 'N'].sort((a, b) => s.inv[a] - s.inv[b]);
    s.selAtom = s.reactors.H2.active ? (s.inv.H < 60 ? 'H' : (s.reactors.O2.owned && s.inv.O < 60 ? 'O' : 'H')) : 'H';
    if (s.reactors.CO2.owned && s.inv.C < 20) s.selAtom = 'C';
    if (s.reactors.N2.owned && s.inv.N < 20) s.selAtom = 'N';
    void need;
    tapAcc += (t < activeMin * 60 ? tapsActive : tapsIdle) * dt;
    while (tapAcc >= 1) { tap(s); tapAcc--; }
    tick(s, dt, rand);
    t += dt;
    while (s.q.length) { const e = s.q.shift(); r.events.push({ t, k: e.k }); }
    if (s.rare && !rareSeen) { rareSeen = true; r.events.push({ t, k: 'rare' }); }
    // balance dials
    for (const rx of REACTIONS) if (s.reactors[rx.id].owned) setIdeal(s, rx.id);
    // affordability is judged before the bot spends
    const cheapest = Math.min(...options(s).map(o => o.cost));
    if (s.energy < cheapest) { gap += dt; r.maxGap = Math.max(r.maxGap, gap); } else gap = 0;
    // buy cheapest affordable repeatedly
    let bought = true;
    while (bought) {
      bought = false;
      let opt = options(s).sort((a, b) => a.cost - b.cost);
      if (rushChem) { // a player who follows the goals: save for the next cheap reactor, still buying tiny upgrades
        const next = REACTIONS.find(x => !s.reactors[x.id].owned);
        if (next && next.cost <= 150) opt = opt.filter(o => o.name === 'rx:' + next.id || o.cost <= 12);
      }
      if (opt.length && opt[0].cost <= s.energy) {
        const o = opt[0];
        if (o.buy()) {
          bought = true; r.log.push({ t, name: o.name }); r.events.push({ t, k: 'buy' });
          if (!r.first[o.kind]) r.first[o.kind] = t;
          if (o.kind === 'rx' && o.name !== 'rx:H2' && !r.first.molecule) r.first.molecule = t;
        }
      }
    }
    if (!r.first.molecule && s.inv.H2 > 0) r.first.molecule = t;
    if (!r.first.water && s.disc.H2O) r.first.water = t;
    if (s.runEnergy >= PHASE_THRESHOLD && r.phaseAt === null) r.phaseAt = t;
    if (doPhase && phasePointsGain(s) >= 1 && s.runEnergy >= PHASE_THRESHOLD && r.phases.length < 3) {
      r.phases.push(t); phaseChange(s);
    }
  }
  r.state = s;
  return r;
}

if (process.argv[1]?.endsWith('sim.mjs')) {
  const r = run(60);
  const s = r.state;
  console.log('first upgrade/gen/molecule(s):', r.first.upg?.toFixed(1), r.first.gen?.toFixed(1), r.first.molecule?.toFixed(1));
  console.log('phase available at (min):', r.phaseAt === null ? 'never' : (r.phaseAt / 60).toFixed(1));
  console.log('max stretch with nothing affordable (s):', r.maxGap.toFixed(1));
  console.log('run energy at 60min:', s.runEnergy.toExponential(2));
  const r2 = run(120, { doPhase: true });
  console.log('phase times (min):', r2.phases.map(x => (x / 60).toFixed(1)).join(', '));
}
