// Moonmerge rules: 4x4 board of tier numbers (0 = empty). Equal neighbours merge into the next tier.
export const N = 4;
export const TIERS = ['Dust', 'Pebble', 'Rock', 'Moonlet', 'Moon', 'Dwarf planet', 'Planet', 'Gas giant', 'Star', 'Nova', 'Galaxy'];
export const emptyBoard = () => Array(N * N).fill(0);

export function slideLine(line) {
  const t = line.filter(Boolean), out = []; let gained = 0;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === t[i + 1]) { out.push(t[i] + 1); gained += 2 ** (t[i] + 1); i++; } else out.push(t[i]);
  }
  while (out.length < N) out.push(0);
  return { line: out, gained, moved: out.some((v, i) => v !== line[i]) };
}
// dir: 0 left, 1 right, 2 up, 3 down. Returns { board, gained, moved }.
export function move(board, dir) {
  const b = board.slice(); let gained = 0, moved = false;
  for (let k = 0; k < N; k++) {
    const idx = [];
    for (let j = 0; j < N; j++) idx.push(dir < 2 ? k * N + j : j * N + k);
    if (dir === 1 || dir === 3) idx.reverse();
    const r = slideLine(idx.map(i => b[i]));
    idx.forEach((i, j) => { b[i] = r.line[j]; });
    gained += r.gained; moved ||= r.moved;
  }
  return { board: b, gained, moved };
}
export function spawn(board, rand) {
  const free = board.map((v, i) => v ? -1 : i).filter(i => i >= 0);
  if (!free.length) return { board, at: -1 };
  const at = free[Math.floor(rand() * free.length)], b = board.slice();
  b[at] = rand() < 0.9 ? 1 : 2;
  return { board: b, at };
}
export const canMove = (board) => [0, 1, 2, 3].some(d => move(board, d).moved);
export const maxTier = (board) => Math.max(...board);
