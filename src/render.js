// Visuals: molecule layouts, the Lab scene (atoms drift, bond, and pile up), overlay particles, SVG molecules.
import { COLORS } from './data.js';

// Unit layouts: atoms {e,x,y,r}, bonds [i,j]. 1 unit ~ 10px at scale 1.
const ring = (n, R) => Array.from({ length: n }, (_, k) => { const t = (k / n) * Math.PI * 2 - Math.PI / 2; return [Math.cos(t) * R, Math.sin(t) * R]; });
function glucose() {
  const p = ring(6, 1.7), atoms = [], bonds = [];
  p.forEach(([x, y], k) => atoms.push({ e: k === 5 ? 'O' : 'C', x, y, r: 0.95 }));
  for (let k = 0; k < 6; k++) bonds.push([k, (k + 1) % 6]);
  p.slice(0, 5).forEach(([x, y], k) => { const n = Math.hypot(x, y); atoms.push({ e: k % 2 ? 'H' : 'O', x: x / n * 3.3, y: y / n * 3.3, r: 0.6 }); bonds.push([k, 6 + k]); });
  return { atoms, bonds };
}
export const LAYOUT = {
  H: { atoms: [{ e: 'H', x: 0, y: 0, r: 1 }], bonds: [] },
  O: { atoms: [{ e: 'O', x: 0, y: 0, r: 1.3 }], bonds: [] },
  C: { atoms: [{ e: 'C', x: 0, y: 0, r: 1.25 }], bonds: [] },
  N: { atoms: [{ e: 'N', x: 0, y: 0, r: 1.2 }], bonds: [] },
  H2: { atoms: [{ e: 'H', x: -0.9, y: 0, r: 0.95 }, { e: 'H', x: 0.9, y: 0, r: 0.95 }], bonds: [[0, 1]] },
  O2: { atoms: [{ e: 'O', x: -1.2, y: 0, r: 1.25 }, { e: 'O', x: 1.2, y: 0, r: 1.25 }], bonds: [[0, 1]] },
  N2: { atoms: [{ e: 'N', x: -1.2, y: 0, r: 1.15 }, { e: 'N', x: 1.2, y: 0, r: 1.15 }], bonds: [[0, 1]] },
  H2O: { atoms: [{ e: 'O', x: 0, y: -0.5, r: 1.3 }, { e: 'H', x: -1.7, y: 1, r: 0.85 }, { e: 'H', x: 1.7, y: 1, r: 0.85 }], bonds: [[0, 1], [0, 2]] },
  CO2: { atoms: [{ e: 'C', x: 0, y: 0, r: 1.25 }, { e: 'O', x: -2.6, y: 0, r: 1.25 }, { e: 'O', x: 2.6, y: 0, r: 1.25 }], bonds: [[0, 1], [0, 2]] },
  CH4: { atoms: [{ e: 'C', x: 0, y: 0, r: 1.25 }, { e: 'H', x: -1.9, y: -1.6, r: 0.8 }, { e: 'H', x: 1.9, y: -1.6, r: 0.8 }, { e: 'H', x: -1.9, y: 1.7, r: 0.8 }, { e: 'H', x: 1.9, y: 1.7, r: 0.8 }], bonds: [[0, 1], [0, 2], [0, 3], [0, 4]] },
  NH3: { atoms: [{ e: 'N', x: 0, y: -0.4, r: 1.2 }, { e: 'H', x: -1.9, y: 1.1, r: 0.8 }, { e: 'H', x: 0, y: 1.9, r: 0.8 }, { e: 'H', x: 1.9, y: 1.1, r: 0.8 }], bonds: [[0, 1], [0, 2], [0, 3]] },
  GLU: glucose(),
};
export const SPECIES_ORDER = ['H2', 'O2', 'N2', 'H2O', 'CO2', 'CH4', 'NH3', 'GLU'];
const CAP = { H2: 26, O2: 26, N2: 14, H2O: 36, CO2: 26, CH4: 22, NH3: 22, GLU: 18 };

function extent(sp) {
  const L = LAYOUT[sp]; let m = 0;
  for (const a of L.atoms) m = Math.max(m, Math.abs(a.x) + a.r, Math.abs(a.y) + a.r);
  return m;
}

// SVG used by the shelf and the reveal dialog.
export function moleculeSVG(sp, locked) {
  const L = LAYOUT[sp], m = extent(sp) + 0.4, v = `${-m} ${-m} ${m * 2} ${m * 2}`;
  let s = `<svg viewBox="${v}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`;
  for (const [i, j] of L.bonds) { const a = L.atoms[i], b = L.atoms[j]; s += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${locked ? '#2a3447' : '#dfe6f2'}" stroke-width="0.35" stroke-linecap="round"/>`; }
  for (const a of L.atoms) {
    s += `<circle cx="${a.x}" cy="${a.y}" r="${a.r}" fill="${locked ? '#2a3447' : COLORS[a.e]}" stroke="${locked ? '#34425a' : '#0b0f16'}" stroke-width="0.12"/>`;
    if (!locked && a.r >= 0.8) s += `<text x="${a.x}" y="${a.y + a.r * 0.33}" text-anchor="middle" font-size="${a.r * 0.95}" font-weight="700" fill="#000" font-family="system-ui,sans-serif">${a.e}</text>`;
  }
  return s + '</svg>';
}

// ---- sprite cache: pre-rendered molecules for fast drawing ----
const sprites = new Map();
function sprite(sp, scale) {
  const key = sp + '@' + scale.toFixed(2);
  let c = sprites.get(key); if (c) return c;
  const L = LAYOUT[sp], m = extent(sp) + 0.3, px = Math.ceil(m * 2 * scale * 10);
  c = document.createElement('canvas'); c.width = c.height = px; c.__m = m;
  const g = c.getContext('2d'); g.translate(px / 2, px / 2); const u = scale * 10;
  g.lineCap = 'round'; g.strokeStyle = '#dfe6f2'; g.lineWidth = Math.max(1.5, u * 0.3);
  for (const [i, j] of L.bonds) { g.beginPath(); g.moveTo(L.atoms[i].x * u, L.atoms[i].y * u); g.lineTo(L.atoms[j].x * u, L.atoms[j].y * u); g.stroke(); }
  for (const a of L.atoms) {
    g.fillStyle = COLORS[a.e]; g.strokeStyle = '#0b0f16'; g.lineWidth = Math.max(1, u * 0.1);
    g.beginPath(); g.arc(a.x * u, a.y * u, a.r * u, 0, 6.283); g.fill(); g.stroke();
    if (a.r * u > 7) { g.fillStyle = '#000'; g.font = `700 ${Math.round(a.r * u * 0.95)}px system-ui,sans-serif`; g.textAlign = 'center'; g.fillText(a.e, a.x * u, a.y * u + a.r * u * 0.33); }
  }
  sprites.set(key, c); return c;
}

// ---- simple particle system (used by the scene and by the full-window overlay) ----
export class Particles {
  constructor() { this.list = []; this.rings = []; }
  burst(x, y, colors, n = 14, speed = 120, life = 0.7, size = 3) {
    for (let i = 0; i < n && this.list.length < 400; i++) {
      const a = Math.random() * 6.283, v = speed * (0.35 + Math.random() * 0.65);
      this.list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.2, life, max: life, c: colors[i % colors.length], s: size * (0.6 + Math.random() * 0.8) });
    }
  }
  ring(x, y, color, r = 30, life = 0.45) { if (this.rings.length < 30) this.rings.push({ x, y, color, r, life, max: life }); }
  draw(g, dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i]; p.life -= dt; if (p.life <= 0) { this.list.splice(i, 1); continue; }
      p.vy += 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      g.globalAlpha = Math.min(1, p.life / p.max * 1.4); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.s, 0, 6.283); g.fill();
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]; r.life -= dt; if (r.life <= 0) { this.rings.splice(i, 1); continue; }
      const k = 1 - r.life / r.max; g.globalAlpha = 1 - k; g.strokeStyle = r.color; g.lineWidth = 3; g.beginPath(); g.arc(r.x, r.y, r.r * (0.3 + k), 0, 6.283); g.stroke();
    }
    g.globalAlpha = 1;
  }
}

const rnd = (a, b) => a + Math.random() * (b - a);
const ATOM_TYPES = ['H', 'O', 'C', 'N'];

// ---- the Lab scene ----
export class LabScene {
  constructor(canvas) {
    this.cv = canvas; this.g = canvas.getContext('2d');
    this.W = canvas.width; this.H = canvas.height; this.dpr = 1;
    this.amb = []; this.anims = []; this.parts = new Particles();
    this.pending = {}; this.landed = {}; this.made = {};
    this.rareTok = null; this.t = 0; this.catalyst = false;
  }
  resize() {
    const r = this.cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(100, Math.floor(r.width * d)), h = Math.max(60, Math.floor(r.height * d));
    if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; sprites.clear(); }
    this.W = this.cv.width; this.H = this.cv.height; this.dpr = d;
  }
  get unit() { return Math.max(0.7, Math.min(1.6, this.H / 230)) * this.dpr; }

  // Counts of ambient atoms follow inventory on a log scale, so growth is always visible.
  syncAmbient(inv) {
    for (const a of ATOM_TYPES) {
      const want = Math.min(9, Math.floor(Math.log2(1 + inv[a]) * 0.9));
      const mine = this.amb.filter(x => x.e === a);
      for (let i = mine.length; i < want; i++) this.amb.push(this.newAmb(a, true));
      for (let i = mine.length; i > want; i--) { const x = mine[i - 1]; x.dying = true; }
    }
  }
  newAmb(e, fadeIn) {
    return { e, x: rnd(0.08, 0.92) * this.W, y: rnd(0.1, 0.55) * this.H, vx: rnd(-14, 14), vy: rnd(-10, 10), a: fadeIn ? 0 : 1, dying: false, ph: Math.random() * 6 };
  }
  spawnTapAtom(e) {
    const a = this.newAmb(e, false); a.x = this.W * 0.5 + rnd(-20, 20); a.y = this.H * 0.55; a.vy = -60; a.pop = 0.4; this.amb.push(a);
    this.parts.ring(a.x, a.y, COLORS[e], 18 * this.unit, 0.35);
    if (this.amb.length > 90) this.amb.shift();
  }

  // A reaction produced n molecules of `sp`: queue visible bond animations.
  make(sp, n) { this.pending[sp] = Math.min(8, (this.pending[sp] || 0) + n); this.made[sp] = (this.made[sp] || 0) + n; }

  startBond(sp) {
    if (this.anims.length > 14) return;
    const L = LAYOUT[sp], u = this.unit * 10 * 1.25;
    const hx = rnd(0.25, 0.75) * this.W, hy = rnd(0.28, 0.45) * this.H;
    const parts = L.atoms.map((a) => {
      const pool = this.amb.filter(x => x.e === a.e && !x.dying && !x.taken);
      const src = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
      if (src) src.taken = true;
      return { a, x: src ? src.x : rnd(0, this.W), y: src ? src.y : rnd(0, this.H * 0.5), src };
    });
    this.anims.push({ sp, hx, hy, u, t: 0, parts, phase: 0, vy: 0, fy: 0 });
  }

  pileTarget(sp) { return Math.min(CAP[sp], Math.floor(Math.pow(this.made[sp] || 0, 0.7))); }

  // Place pile tiles as a stacked pyramid: simple molecules at the bottom, complex on top.
  pileLayout() {
    const cell = this.unit * 10 * 4.0, cols = Math.max(4, Math.floor(this.W / cell) - 1);
    const maxRows = Math.max(2, Math.floor((this.H * 0.42) / (cell * 0.82)));
    let capacity = 0; for (let r = 0; r < maxRows; r++) capacity += Math.max(2, cols - r * 2);
    let total = 0; for (const sp of SPECIES_ORDER) total += this.landed[sp] || 0;
    const f = total > capacity ? capacity / total : 1; // thin every species evenly if the heap would get too tall
    const tiles = [];
    for (const sp of SPECIES_ORDER) { const n = Math.ceil((this.landed[sp] || 0) * f - 1e-9); for (let i = 0; i < n; i++) tiles.push(sp); }
    let row = 0, inRow = 0, rowN = cols;
    const out = [];
    for (const sp of tiles) {
      if (inRow >= rowN) { row++; inRow = 0; rowN = Math.max(2, cols - row * 2); }
      out.push({ sp, x: this.W / 2 + (inRow - (rowN - 1) / 2) * cell, y: this.H - cell * 0.55 - row * cell * 0.82 }); inRow++;
    }
    return { out, cell, rows: row + 1 };
  }
  reset() { this.pending = {}; this.landed = {}; this.made = {}; this.anims = []; }

  setRare(r) { // r = state.rare or null
    if (!r) { this.rareTok = null; return; }
    if (!this.rareTok) this.rareTok = { type: r.type, x: this.W * (0.2 + r.seed * 0.6), y: this.H * 0.3, t: 0, seed: r.seed };
  }
  hitRare(px, py) { // css px relative to canvas
    const t = this.rareTok; if (!t) return false;
    const d = this.dpr, dx = px * d - t.x, dy = py * d - t.y, R = 34 * d;
    return dx * dx + dy * dy < R * R;
  }

  draw(dt, catalyst) {
    const g = this.g, W = this.W, H = this.H, u = this.unit * 10;
    this.t += dt; this.catalyst = catalyst;
    g.clearRect(0, 0, W, H);
    // soft background glow
    const gr = g.createRadialGradient(W / 2, H * 0.4, 10, W / 2, H * 0.5, W * 0.7);
    gr.addColorStop(0, catalyst ? 'rgba(255,209,102,.22)' : 'rgba(86,180,233,.10)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);

    // ambient atoms
    for (let i = this.amb.length - 1; i >= 0; i--) {
      const a = this.amb[i];
      if (a.taken) continue;
      a.ph += dt; a.x += (a.vx + Math.sin(a.ph) * 6) * dt; a.y += (a.vy + Math.cos(a.ph * 0.8) * 6) * dt;
      if (a.x < 10 || a.x > W - 10) a.vx *= -1; if (a.y < 8) a.vy = Math.abs(a.vy) + 4; if (a.y > H * 0.6) a.vy = -Math.abs(a.vy) - 2;
      a.vy *= 0.995;
      a.a = a.dying ? a.a - dt * 2 : Math.min(1, a.a + dt * 2); if (a.pop) a.pop = Math.max(0, a.pop - dt);
      if (a.a <= 0) { this.amb.splice(i, 1); continue; }
      const r = LAYOUT[a.e].atoms[0].r * u * 0.6 * (1 + (a.pop || 0) * 1.5);
      g.globalAlpha = a.a * 0.6; g.fillStyle = COLORS[a.e]; g.beginPath(); g.arc(a.x, a.y, r, 0, 6.283); g.fill();
      g.strokeStyle = '#0b0f16'; g.lineWidth = 1.5; g.stroke();
    }
    g.globalAlpha = 1;
    // free atoms that were "taken" by a bond animation are removed once the anim ends (see below)

    // spawn bond animations from pending reactions
    for (const sp of Object.keys(this.pending)) {
      if (this.pending[sp] >= 1 && Math.random() < dt * 10) { this.pending[sp] -= 1; this.startBond(sp); }
      else if (this.pending[sp] > 0 && this.anims.length > 12) this.pending[sp] = Math.min(this.pending[sp], 3);
    }

    // bond animations: gather -> bond (flash) -> drop onto pile
    const pile = this.pileLayout();
    for (let i = this.anims.length - 1; i >= 0; i--) {
      const an = this.anims[i]; an.t += dt;
      const L = LAYOUT[an.sp];
      if (an.phase === 0) { // gather
        let done = true;
        an.parts.forEach((p, k) => {
          const tx = an.hx + L.atoms[k].x * an.u * 0.9, ty = an.hy + L.atoms[k].y * an.u * 0.9;
          p.x += (tx - p.x) * Math.min(1, dt * 7); p.y += (ty - p.y) * Math.min(1, dt * 7);
          if (Math.hypot(tx - p.x, ty - p.y) > 3) done = false;
        });
        if (done || an.t > 0.9) { an.phase = 1; an.t = 0; this.parts.ring(an.hx, an.hy, '#ffffff', an.u * 2.4, 0.4); this.parts.burst(an.hx, an.hy, ['#ffd166', '#ffffff'], 8, 90, 0.5, 2.5 * this.dpr); an.bonded = true; }
      } else if (an.phase === 1) { // brief hold with bond lines, then fall
        if (an.t > 0.18) { an.phase = 2; an.t = 0; an.vy = -40; }
      } else { // fall to the pile
        an.vy += 520 * dt * this.dpr; an.hy += an.vy * dt;
        const lim = pile.out.length ? pile.out[pile.out.length - 1].y - pile.cell * 0.4 : H - pile.cell * 0.55;
        if (an.hy >= Math.max(H * 0.4, lim)) {
          this.landed[an.sp] = Math.max(this.landed[an.sp] || 0, Math.min(this.pileTarget(an.sp), (this.landed[an.sp] || 0) + 1));
          this.parts.burst(an.hx, an.hy, [COLORS.H, COLORS.O, '#ffffff'], 5, 60, 0.35, 2 * this.dpr);
          for (const p of an.parts) if (p.src) { p.src.dying = true; p.src.taken = false; p.src.a = 0; }
          this.anims.splice(i, 1); this.onLand && this.onLand(an.sp); continue;
        }
      }
      // draw atoms/bonds of the forming molecule
      const pos = an.phase === 0 ? an.parts.map(p => [p.x, p.y]) : L.atoms.map(a => [an.hx + a.x * an.u * 0.9, an.hy + a.y * an.u * 0.9]);
      if (an.phase >= 1) { g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(2, this.unit * 3); for (const [a, b] of L.bonds) { g.beginPath(); g.moveTo(pos[a][0], pos[a][1]); g.lineTo(pos[b][0], pos[b][1]); g.stroke(); } }
      L.atoms.forEach((a, k) => { g.fillStyle = COLORS[a.e]; g.strokeStyle = an.phase === 1 ? '#fff' : '#0b0f16'; g.lineWidth = 1.5; g.beginPath(); g.arc(pos[k][0], pos[k][1], a.r * u * 1.05, 0, 6.283); g.fill(); g.stroke(); });
    }

    // catch-up for loaded saves / offline: grow the pile even without animations
    for (const sp of SPECIES_ORDER) {
      const tgt = this.pileTarget(sp), cur = this.landed[sp] || 0;
      if (cur < tgt && !this.anims.some(a => a.sp === sp) && (this.pending[sp] || 0) < 1) this.landed[sp] = cur + (tgt - cur > 4 ? 2 : 1) * (Math.random() < dt * 8 ? 1 : 0);
    }

    // pile of finished molecules
    const sc = this.unit * 1.2;
    for (const t of pile.out) {
      const spr = sprite(t.sp, sc); const half = spr.width / 2;
      g.drawImage(spr, Math.round(t.x - half), Math.round(t.y - half));
    }

    // rare token
    if (this.rareTok) {
      const r = this.rareTok; r.t += dt;
      const x = r.x + Math.sin(r.t * 1.6 + r.seed * 6) * W * 0.12, y = r.y + Math.sin(r.t * 2.3) * 10 * this.dpr, R = 26 * this.dpr * (1 + 0.1 * Math.sin(r.t * 8));
      const col = r.type === 'lucky' ? '#ffd166' : '#7be0a4';
      const gl = g.createRadialGradient(x, y, 2, x, y, R * 1.8); gl.addColorStop(0, col); gl.addColorStop(1, 'rgba(255,209,102,0)');
      g.globalAlpha = 0.55; g.fillStyle = gl; g.beginPath(); g.arc(x, y, R * 1.8, 0, 6.283); g.fill(); g.globalAlpha = 1;
      g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, R, 0, 6.283); g.fill(); g.stroke();
      g.fillStyle = '#1b1500'; g.font = `800 ${Math.round(R * 0.85)}px system-ui,sans-serif`; g.textAlign = 'center'; g.fillText(r.type === 'lucky' ? '★' : '×3', x, y + R * 0.3);
      r.px = x; r.py = y; this.rareTok.x0 = r.x;
      this.rareHit = { x, y, R };
    } else this.rareHit = null;

    this.parts.draw(g, dt);

    if (this.made.__ || true) { /* stats label */ }
  }
  // true if canvas-relative css point hits the rare token (token follows its own motion)
  hitToken(px, py) {
    if (!this.rareHit) return false;
    const d = this.dpr, dx = px * d - this.rareHit.x, dy = py * d - this.rareHit.y, R = Math.max(this.rareHit.R * 1.6, 34 * d);
    return dx * dx + dy * dy < R * R;
  }
  clearRare() { this.rareTok = null; this.rareHit = null; }
  total() { return SPECIES_ORDER.reduce((a, sp) => a + (this.landed[sp] || 0), 0); }
  seed(madeStats) { // restore the pile from saved stats
    for (const sp of SPECIES_ORDER) { this.made[sp] = madeStats[sp] || 0; this.landed[sp] = this.pileTarget(sp); }
  }
}

// Full-window overlay for UI-level particle bursts (purchases, goals, reveals).
export class Overlay {
  constructor(canvas) { this.cv = canvas; this.g = canvas.getContext('2d'); this.parts = new Particles(); }
  resize() { const d = Math.min(2, window.devicePixelRatio || 1), w = innerWidth * d, h = innerHeight * d; if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; } this.d = d; }
  burst(x, y, colors, n, speed, life, size) { this.parts.burst(x * this.d, y * this.d, colors, n, speed * this.d, life, size * this.d); }
  ring(x, y, color, r) { this.parts.ring(x * this.d, y * this.d, color, r * this.d); }
  draw(dt) { this.g.clearRect(0, 0, this.cv.width, this.cv.height); if (this.parts.list.length || this.parts.rings.length) this.parts.draw(this.g, dt); }
}
