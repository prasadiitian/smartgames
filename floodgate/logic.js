// Floodgate rules: fill the whole grid with one colour. Each move recolours the flooded region from the top-left.
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'plus', 'star'];
export const COLORS = ['#e8564b', '#f2b134', '#56b4e9', '#2fbf71', '#b07aff', '#e8e8e8']; // plus a shape per colour, so colour is never the only cue
export function levelSpec(level) {
  const size = Math.min(14, 8 + Math.floor((level - 1) / 2) * 1), colors = Math.min(6, 4 + Math.floor((level - 1) / 3));
  return { size, colors, slack: Math.max(1, 5 - Math.floor(level / 4)), seed: 1000 + level * 7919 };
}
export function makeGrid(size, colors, seed) {
  const r = rng(seed); const g = [];
  for (let i = 0; i < size * size; i++) g.push(Math.floor(r() * colors));
  return g;
}
export function region(g, size) {
  const c = g[0], seen = new Set([0]), q = [0];
  while (q.length) {
    const i = q.pop(), x = i % size, y = (i / size) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const j = ny * size + nx; if (!seen.has(j) && g[j] === c) { seen.add(j); q.push(j); }
    }
  }
  return seen;
}
export function flood(g, size, color) {
  if (g[0] === color) return g;
  const out = g.slice(); for (const i of region(g, size)) out[i] = color; return out;
}
export const solved = (g) => g.every(v => v === g[0]);
// Greedy solver: pick the colour that grows the region the most. Used to set a fair move limit.
export function greedyMoves(g, size, colors) {
  let cur = g, n = 0;
  while (!solved(cur) && n < 500) {
    let best = -1, bestSize = -1;
    for (let c = 0; c < colors; c++) { if (c === cur[0]) continue; const s = region(flood(cur, size, c), size).size; if (s > bestSize) { bestSize = s; best = c; } }
    cur = flood(cur, size, best); n++;
  }
  return n;
}
export function newLevel(level) {
  const s = levelSpec(level), grid = makeGrid(s.size, s.colors, s.seed);
  return { ...s, grid, limit: greedyMoves(grid, s.size, s.colors) + s.slack };
}
