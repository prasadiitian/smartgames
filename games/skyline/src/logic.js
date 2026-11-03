// Skyline Stack rules. Blocks are {x, w} on a 1-D axis. Dropping trims the overhang.
export const START_W = 160;
export const PERFECT_TOL = 4;     // px: within this counts as perfect, block snaps to the one below
export const REGROW_AFTER = 3;    // perfects in a row before the block grows back
export const REGROW_BY = 10;
export const MIN_W = 4;
export function place(prev, cur) {
  const l = Math.max(prev.x, cur.x), r = Math.min(prev.x + prev.w, cur.x + cur.w);
  if (r - l < MIN_W) return null;                                   // missed: game over
  if (Math.abs(cur.x - prev.x) <= PERFECT_TOL) return { x: prev.x, w: Math.min(cur.w, prev.w), perfect: true };
  return { x: l, w: r - l, perfect: false };
}
// Streak bonus: after REGROW_AFTER perfects, widen (never beyond the start width).
export function regrow(block, streak) {
  if (streak > 0 && streak % REGROW_AFTER === 0) { const w = Math.min(START_W, block.w + REGROW_BY); return { x: Math.max(0, block.x - (w - block.w) / 2), w }; }
  return block;
}
export const speedFor = (level) => Math.min(260, 90 + level * 5);  // px/s, capped so it stays playable
export const pointsFor = (perfect, streak) => 1 + (perfect ? Math.min(streak, 5) : 0);
// Slider position at time t, bouncing between 0 and (fieldW - w).
export function sliderX(t, speed, w, fieldW) {
  const span = fieldW - w, p = (t * speed) % (2 * span);
  return p <= span ? p : 2 * span - p;
}
