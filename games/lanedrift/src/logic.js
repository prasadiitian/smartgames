// Lane Drift rules: 3 lanes, obstacles scroll down, collect coins. Deterministic given the rng.
export const LANES = 3;
export const PLAYER_Y = 0.82;    // fraction of field height
export const HIT_BAND = 0.07;    // vertical overlap that counts as a collision
export const MAX_SPEED = 1.1;    // fields per second (cap keeps it playable)
export function newState() { return { lane: 1, obstacles: [], coins: [], dist: 0, coinsGot: 0, speed: 0.45, nextRow: 0.6, dead: false, near: 0 }; }
export const speedAt = (dist) => Math.min(MAX_SPEED, 0.45 + dist * 0.004);
export function moveLane(s, dir) { const l = Math.max(0, Math.min(LANES - 1, s.lane + dir)); const changed = l !== s.lane; s.lane = l; return changed; }
export function step(s, dt, rand, emit = () => {}) {
  if (s.dead) return;
  s.speed = speedAt(s.dist);
  const dy = s.speed * dt;
  s.dist += dy * 10;
  for (const o of s.obstacles) o.y += dy;
  for (const c of s.coins) c.y += dy;
  // spawn rows: leave at least one lane free; gap in time shrinks slowly but stays >= 0.55 s of travel
  s.nextRow -= dy;
  if (s.nextRow <= 0) {
    const free = Math.floor(rand() * LANES), blocked = [];
    for (let l = 0; l < LANES; l++) if (l !== free && rand() < 0.75) blocked.push(l);
    for (const l of blocked) s.obstacles.push({ lane: l, y: -0.1 });
    if (rand() < 0.6) s.coins.push({ lane: free, y: -0.1 });
    s.nextRow = Math.max(0.55 * s.speed, 0.3) + 0.25 + rand() * 0.15;
  }
  for (const o of s.obstacles) if (o.lane === s.lane && Math.abs(o.y - PLAYER_Y) < HIT_BAND) { s.dead = true; emit('crash'); }
  s.coins = s.coins.filter(c => { if (c.lane === s.lane && Math.abs(c.y - PLAYER_Y) < HIT_BAND * 1.3) { s.coinsGot++; emit('coin'); return false; } return c.y < 1.1; });
  s.obstacles = s.obstacles.filter(o => o.y < 1.1);
}
export const scoreOf = (s) => Math.floor(s.dist) + s.coinsGot * 10;
