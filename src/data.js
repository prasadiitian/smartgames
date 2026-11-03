// Static game data. All names, facts and numbers are original to this project.
export const VERSION = '1.1.0';
export const SAVE_VERSION = 1;

export const ATOMS = ['H', 'O', 'C', 'N'];

// Species formulas (used by the atom-conservation test).
export const FORMULA = {
  H: { H: 1 }, O: { O: 1 }, C: { C: 1 }, N: { N: 1 },
  H2: { H: 2 }, O2: { O: 2 }, N2: { N: 2 },
  H2O: { H: 2, O: 1 }, CO2: { C: 1, O: 2 },
  CH4: { C: 1, H: 4 }, NH3: { N: 1, H: 3 },
  GLU: { C: 6, H: 12, O: 6 },
};

export const LABEL = {
  H: 'H', O: 'O', C: 'C', N: 'N', H2: 'H₂', O2: 'O₂', N2: 'N₂',
  H2O: 'H₂O', CO2: 'CO₂', CH4: 'CH₄', NH3: 'NH₃', GLU: 'C₆H₁₂O₆',
};

// Which atoms (with counts) to draw for each species; used by the canvas renderer.
export const SHAPES = {
  H: ['H'], O: ['O'], C: ['C'], N: ['N'],
  H2: ['H', 'H'], O2: ['O', 'O'], N2: ['N', 'N'],
  H2O: ['O', 'H', 'H'], CO2: ['O', 'C', 'O'],
  CH4: ['C', 'H', 'H', 'H', 'H'], NH3: ['N', 'H', 'H', 'H'],
  GLU: ['C', 'C', 'C', 'C', 'C', 'C'],
};

// Okabe-Ito based colorblind-safe palette; each element also has a distinct letter label.
export const COLORS = { H: '#56B4E9', O: '#D55E00', C: '#999999', N: '#E69F00' };

// Energy earned per molecule created (before multipliers).
export const VALUE = {
  H2: 1, O2: 1.5, N2: 3, H2O: 12, CO2: 14, CH4: 160, NH3: 150, GLU: 12000,
};

// inp/out are the balanced stoichiometric coefficients.
export const REACTIONS = [
  { id: 'H2', tier: 1, inp: { H: 2 }, out: { H2: 1 }, cost: 0,
    eq: '2H → H₂', fact: 'Hydrogen is the lightest element, and nearly all of it in the universe is hydrogen or helium.' },
  { id: 'O2', tier: 1, inp: { O: 2 }, out: { O2: 1 }, cost: 40,
    eq: '2O → O₂', fact: 'Oxygen gas makes up about one fifth of dry air.' },
  { id: 'H2O', tier: 2, inp: { H2: 2, O2: 1 }, out: { H2O: 2 }, cost: 120,
    eq: '2H₂ + O₂ → 2H₂O', fact: 'Burning hydrogen in oxygen makes only water, and releases a lot of energy.' },
  { id: 'CO2', tier: 2, inp: { C: 1, O2: 1 }, out: { CO2: 1 }, cost: 1500,
    eq: 'C + O₂ → CO₂', fact: 'Carbon dioxide is what carbon makes when it burns completely in plenty of oxygen.' },
  { id: 'N2', tier: 1, inp: { N: 2 }, out: { N2: 1 }, cost: 8000,
    eq: '2N → N₂', fact: 'Nitrogen gas is about four fifths of air and is very unreactive because of its strong triple bond.' },
  { id: 'CH4', tier: 3, inp: { C: 1, H2: 2 }, out: { CH4: 1 }, cost: 30000,
    eq: 'C + 2H₂ → CH₄', fact: 'Methane is the main part of natural gas.' },
  { id: 'NH3', tier: 3, inp: { N2: 1, H2: 3 }, out: { NH3: 2 }, cost: 200000,
    eq: 'N₂ + 3H₂ → 2NH₃', fact: 'Ammonia made this way (the Haber process) is a key ingredient of fertiliser.' },
  { id: 'GLU', tier: 4, inp: { CO2: 6, H2O: 6 }, out: { GLU: 1, O2: 6 }, cost: 3000000,
    eq: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂', fact: 'Plants make glucose from carbon dioxide and water using light, and release oxygen.' },
];
export const RX = Object.fromEntries(REACTIONS.map(r => [r.id, r]));

export const NAMES = {
  H2: 'Hydrogen', O2: 'Oxygen', N2: 'Nitrogen', H2O: 'Water', CO2: 'Carbon dioxide',
  CH4: 'Methane', NH3: 'Ammonia', GLU: 'Glucose',
};
// Reactors start slightly out of balance on purpose: finding the right ratio is the puzzle.
export const START_DIALS = { H2O: { H2: 1, O2: 1 }, CO2: { C: 2, O2: 1 }, CH4: { C: 1, H2: 1 }, NH3: { N2: 1, H2: 1 }, GLU: { CO2: 1, H2O: 2 } };

export const GENS = {
  H: { name: 'Hydrogen Source', base: 8, prod: 1.0 },
  O: { name: 'Oxygen Source', base: 60, prod: 0.8 },
  C: { name: 'Carbon Source', base: 900, prod: 0.6 },
  N: { name: 'Nitrogen Source', base: 9000, prod: 0.5 },
};
export const GEN_GROWTH = 1.15;

export const UPGRADES = {
  tap:   { name: 'Spark Power',    desc: '+2 atoms per tap',              base: 8,   growth: 1.9, max: 20 },
  eff:   { name: 'Catalysis',      desc: 'Atom sources ×1.5',        base: 120, growth: 3.0, max: 25 },
  speed: { name: 'Reactor Speed',  desc: 'Reactor throughput ×1.4',  base: 70,  growth: 2.7, max: 25 },
  bond:  { name: 'Bond Strength',  desc: 'Molecule value ×1.6',      base: 400, growth: 3.4, max: 25 },
  auto:  { name: 'Auto-Balance',   desc: 'Dials set themselves to the balanced ratio', base: 60000, growth: 1, max: 1 },
};

export const BASE_SLOTS = 5;
export const MAX_SLOTS = 8;
export const BASE_THROUGHPUT = 6;     // atom-units per second per reactor
export const PHASE_THRESHOLD = 2e8;   // run Energy needed for first Phase Change
export const PP_DIV = 1e7;
export const PP_BONUS = 0.2;          // +20% production per Phase Point
export const OFFLINE_CAP = 8 * 3600;
export const OFFLINE_RATE = 0.5;

export const TIPS = [
  'Tap Spark to make atoms. Reactors bond them into molecules you can see piling up above.',
  'Two-ingredient reactors have ratio dials. Match the balanced equation for a PERFECT bonus.',
  'Unstable Reaction! Stabilise is safe; Overload is a gamble. Ignoring it costs nothing.',
];
export const PERFECT_BONUS = 1.25;   // yield multiplier while a two-ingredient reactor is exactly balanced
export const STREAK_MAX = 0.4;       // max extra Energy from a long perfect streak (+0.4% per second)
