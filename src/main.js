import {
  VERSION, ATOMS, REACTIONS, RX, GENS, UPGRADES, LABEL, COLORS, SHAPES, TIPS, PHASE_THRESHOLD, PP_BONUS, OFFLINE_CAP,
} from './data.js';
import {
  newState, tick, tap, buyGen, buyUpgrade, buyReactor, toggleReactor, setDial, stabilise, phaseChange, phasePointsGain,
  genCost, upgCost, ratioEfficiency, offline, serialize, deserialize, exportSave, importSave, slots, activeCount,
  tapAtoms, ppMult,
} from './engine.js';
import { fmt, fmtTime } from './num.js';
import platform from './platform.js';
import { sfx, setMuted, unlock } from './audio.js';

const $ = (id) => document.getElementById(id);
const KEY = 'bondwork.save';
let s = newState();
let paused = false, hidden = false, running = false;
let last = Date.now(), saveAcc = 0, hiddenAt = 0;
const parts = [];

// ---------- storage (always guarded) ----------
function store(text) { try { localStorage.setItem(KEY, text); return true; } catch (e) { return false; } }
function load() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
function save() { s.lastSave = Date.now(); store(serialize(s)); }

// ---------- tiny DOM helper ----------
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

// ---------- build static UI ----------
const refs = { rx: {}, gen: {}, upg: {}, chip: {}, cx: {} };

function buildUI() {
  $('ver').textContent = VERSION;
  const pick = $('atomPick');
  for (const a of ATOMS) {
    const b = el('button', '', a); b.style.background = COLORS[a]; b.dataset.a = a; b.setAttribute('aria-label', 'Spark ' + a);
    b.onclick = () => { s.selAtom = a; unlock(); };
    pick.appendChild(b);
  }
  const inv = $('inv');
  for (const k of Object.keys(s.inv)) {
    const c = el('span', 'chip'); c.appendChild(document.createTextNode(LABEL[k] + ' ')); const b = el('b', '', '0'); c.appendChild(b);
    inv.appendChild(c); refs.chip[k] = { c, b };
  }
  const rxBox = $('reactors');
  for (const r of REACTIONS) {
    const card = el('div', 'rx'); const hd = el('div', 'hd');
    const eq = el('div', 'eq', r.eq); const act = el('button', '', ''); const stab = el('button', '', 'Stabilise!');
    stab.style.background = '#D55E00'; stab.style.color = '#000'; stab.style.fontWeight = '700'; stab.hidden = true;
    hd.append(eq, stab, act); card.appendChild(hd);
    const meta = el('div', 'meta'); card.appendChild(meta);
    const dials = el('div', 'dials'); const dRefs = {};
    if (Object.keys(r.inp).length > 1) {
      for (const k of Object.keys(r.inp)) {
        const d = el('div', 'dial'); d.appendChild(el('span', 'k', LABEL[k]));
        const m = el('button', '', '−'); const out = el('output', '', '1'); const p = el('button', '', '+');
        m.setAttribute('aria-label', 'Decrease ' + k); p.setAttribute('aria-label', 'Increase ' + k);
        m.onclick = () => { setDial(s, r.id, k, s.reactors[r.id].dials[k] - 1); sfx.tap(); };
        p.onclick = () => { setDial(s, r.id, k, s.reactors[r.id].dials[k] + 1); sfx.tap(); };
        d.append(m, out, p); dials.appendChild(d); dRefs[k] = { out, m, p };
      }
      card.appendChild(dials);
    }
    const bar = el('div', 'bar'); const fill = el('i'); bar.appendChild(fill); card.appendChild(bar);
    act.onclick = () => {
      unlock();
      const st = s.reactors[r.id];
      if (!st.owned) { if (buyReactor(s, r.id)) { sfx.buy(); maybeTip(1); } else sfx.deny(); }
      else if (!toggleReactor(s, r.id)) sfx.deny(); else sfx.tap();
    };
    stab.onclick = () => { if (stabilise(s)) sfx.stabilise(); };
    rxBox.appendChild(card);
    refs.rx[r.id] = { card, act, stab, meta, dials: dRefs, fill, bar, hasDials: Object.keys(dRefs).length > 0, dialBox: dials };
  }
  const gens = $('gens');
  for (const g of Object.keys(GENS)) {
    const it = el('div', 'item'); const t = el('div', 't'); const b1 = el('b', '', GENS[g].name); const sp = el('span');
    t.append(b1, sp); const btn = el('button'); btn.onclick = () => { unlock(); buyGen(s, g) ? sfx.buy() : sfx.deny(); };
    it.append(t, btn); gens.appendChild(it); refs.gen[g] = { it, sp, btn };
  }
  const up = $('upgs');
  for (const u of Object.keys(UPGRADES)) {
    const it = el('div', 'item'); const t = el('div', 't'); const b1 = el('b'); const sp = el('span', '', UPGRADES[u].desc);
    t.append(b1, sp); const btn = el('button'); btn.onclick = () => { unlock(); buyUpgrade(s, u) ? sfx.buy() : sfx.deny(); };
    it.append(t, btn); up.appendChild(it); refs.upg[u] = { it, b1, btn };
  }
  const bx = $('boosts');
  const x2 = el('button', '', 'Watch for 2× production (5 min)'); x2.style.width = '100%';
  x2.onclick = () => platform.showRewarded(() => { s.x2 = 300; sfx.buy(); }, () => {});
  bx.appendChild(x2); refs.x2 = x2;
  for (const r of REACTIONS) {
    const c = el('div', 'card cx'); c.append(el('div', 'eq', ''), el('div', 'small', ''));
    $('codexList').appendChild(c); refs.cx[r.id] = c;
  }

  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => showTab(b.dataset.tab));
  $('btnTap').onclick = () => { unlock(); const n = tap(s); sfx.tap(); spawn(s.selAtom, true); maybeTip(0); void n; };
  $('btnPause').onclick = () => setPaused(!paused);
  $('btnMute').onclick = () => { s.settings.mute = !s.settings.mute; setMuted(s.settings.mute); unlock(); };
  $('tipOk').onclick = () => { $('tip').hidden = true; };
  $('btnExport').onclick = () => { $('saveText').value = exportSave(s); $('saveText').select(); msg('Save text is above. Copy it somewhere safe.'); };
  $('btnImport').onclick = () => {
    try { s = importSave($('saveText').value); save(); refreshAll(); msg('Imported.'); } catch (e) { msg('That text is not a valid save.'); }
  };
  let armed = 0;
  $('btnReset').onclick = () => {
    if (Date.now() - armed < 4000) { s = newState(); save(); refreshAll(); msg('Game reset.'); armed = 0; $('btnReset').textContent = 'Reset game'; }
    else { armed = Date.now(); $('btnReset').textContent = 'Tap again to erase'; setTimeout(() => { $('btnReset').textContent = 'Reset game'; }, 4000); }
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', save);
  window.addEventListener('blur', () => {});
  const cv = $('cv');
  cv.addEventListener('pointerdown', () => unlock());
}

function msg(t) { $('saveMsg').textContent = t; }
function showTab(t) {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t || (t === 'build' && b.dataset.tab === 'lab' && matchMedia('(min-width:900px)').matches)));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('on', p.id === t));
  $('modal').scrollTop = 0;
  document.querySelector('main').classList.toggle('alt', t === 'codex' || t === 'more');
}

function refreshAll() { setMuted(s.settings.mute); }

// ---------- tips (max three, one-time) ----------
function maybeTip(i) {
  if (s.seen.tips !== i || i >= TIPS.length) return;
  s.seen.tips = i + 1; $('tipText').textContent = TIPS[i]; $('tip').hidden = false;
}

// ---------- pause / visibility ----------
function setPaused(p) {
  paused = p; $('btnPause').textContent = p ? 'Resume' : 'Pause';
  if (p) platform.gameplayStop(); else { last = Date.now(); platform.gameplayStart(); }
}
function onVisibility() {
  if (document.hidden) { hidden = true; hiddenAt = Date.now(); save(); platform.gameplayStop(); }
  else {
    hidden = false;
    const away = (Date.now() - hiddenAt) / 1000;
    last = Date.now();
    if (!paused) { platform.gameplayStart(); if (away >= 30) welcomeBack(away); }
  }
}

// ---------- modal ----------
function modal(build) {
  const body = $('modalBody'); body.textContent = ''; build(body); $('modal').hidden = false;
}
function closeModal() { $('modal').hidden = true; }

function welcomeBack(away) {
  const res = offline(s, away);
  if (!res.seconds || res.energy <= 0) return;
  modal((b) => {
    b.append(el('h2', '', 'Welcome back'));
    b.append(el('p', '', 'You were away for ' + fmtTime(Math.min(away, OFFLINE_CAP)) + (away > OFFLINE_CAP ? ' (offline progress is capped at 8 hours)' : '') + '.'));
    b.append(el('p', '', 'Your reactors earned ' + fmt(res.energy) + ' Energy at half speed.'));
    const row = el('div', 'row');
    const dbl = el('button', '', 'Watch for 2× offline earnings');
    dbl.onclick = () => platform.showRewarded(() => { s.energy += res.energy; s.runEnergy += res.energy; s.totalEnergy += res.energy; dbl.disabled = true; dbl.textContent = 'Doubled!'; sfx.buy(); }, () => {});
    const ok = el('button', 'big', 'Collect'); ok.onclick = closeModal;
    row.append(dbl, ok); b.append(row);
  });
}

// ---------- canvas lab ----------
const cv = $('cv'), g = cv.getContext('2d');
function fitCanvas() {
  const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(100, Math.floor(r.width * d)), h = Math.max(40, Math.floor(r.height * d));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
}
function spawn(species, fromTap) {
  if (parts.length > 60) parts.shift();
  parts.push({ sp: species, x: Math.random() * cv.width, y: fromTap ? cv.height * 0.9 : cv.height * (0.4 + Math.random() * 0.5),
    vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 30, life: 1.6, rot: Math.random() * 6 });
}
function drawParts(dt) {
  g.clearRect(0, 0, cv.width, cv.height);
  const sc = cv.height / 100;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.life -= dt; p.x += p.vx * dt * sc; p.y += p.vy * dt * sc; p.rot += dt;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    g.globalAlpha = Math.min(1, p.life);
    const shape = SHAPES[p.sp] || ['H'], n = shape.length, R = 8 * sc;
    const pos = shape.map((a, k) => {
      if (n === 1) return [0, 0];
      if (n === 6) { const t = k / 6 * 6.283; return [Math.cos(t) * R * 1.4, Math.sin(t) * R * 1.4]; }
      if (k === 0 && n > 2) return [0, 0];
      const t = p.rot * 0.3 + (n === 2 ? k * 3.14159 : (k - 1) / (n - 1) * 6.283 + 0.5);
      return [Math.cos(t) * R * 1.5, Math.sin(t) * R * 1.5];
    });
    g.strokeStyle = '#dfe6f2'; g.lineWidth = 2 * sc;
    for (let k = 1; k < n; k++) {
      const from = n === 6 ? pos[k - 1] : pos[0]; g.beginPath(); g.moveTo(p.x + from[0], p.y + from[1]); g.lineTo(p.x + pos[k][0], p.y + pos[k][1]); g.stroke();
    }
    shape.forEach((a, k) => { g.fillStyle = COLORS[a]; g.beginPath(); g.arc(p.x + pos[k][0], p.y + pos[k][1], R, 0, 6.283); g.fill(); });
  }
  g.globalAlpha = 1;
}

// ---------- per-frame UI update ----------
let lastEnergy = 0, prodAcc = 0;
function setText(node, t) { if (node.textContent !== t) node.textContent = t; }
function setDis(b, v) { if (b.disabled !== v) b.disabled = v; }

function update(dt) {
  setText($('energy'), fmt(s.energy));
  setText($('rate'), fmt(rate));
  setText($('pp'), fmt(s.pp));
  $('ppStat').hidden = s.pp === 0 && s.phases === 0;
  setText($('tapN'), '+' + fmt(tapAtoms(s) * ppMult(s)));
  setText($('btnMute'), s.settings.mute ? 'Sound off' : 'Sound on');
  $('atomPick').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.a === s.selAtom));
  for (const k of Object.keys(s.inv)) {
    const ref = refs.chip[k];
    ref.c.hidden = !(s.inv[k] > 0 || ATOMS.includes(k) && (k === 'H' || k === 'O' || s.reactors.CO2.owned || s.reactors.N2.owned));
    setText(ref.b, fmt(s.inv[k]));
  }
  for (const a of ATOMS) {
    const hide = (a === 'C' && !s.reactors.CO2.owned && !s.reactors.CH4.owned) || (a === 'N' && !s.reactors.N2.owned) || (a === 'O' && !s.reactors.O2.owned);
    $('atomPick').querySelector('[data-a=' + a + ']').hidden = hide && s.inv[a] === 0;
  }
  const sl = slots(s), ac = activeCount(s);
  for (const r of REACTIONS) {
    const st = s.reactors[r.id], rf = refs.rx[r.id];
    const nextUnowned = REACTIONS.find(q => !s.reactors[q.id].owned);
    rf.card.hidden = !st.owned && r !== nextUnowned && !(nextUnowned && REACTIONS.indexOf(r) <= REACTIONS.indexOf(nextUnowned) + 1);
    rf.card.classList.toggle('off', !st.active);
    const unstable = s.ev && s.ev.rid === r.id;
    rf.card.classList.toggle('unstable', !!unstable);
    rf.stab.hidden = !unstable;
    if (!st.owned) {
      setText(rf.act, 'Build ' + fmt(r.cost)); setDis(rf.act, s.energy < r.cost);
      setText(rf.meta, 'Needs ' + Object.entries(r.inp).map(([k, n]) => n + ' ' + LABEL[k]).join(' + '));
      rf.fill.style.width = '0%'; rf.bar.hidden = true; if (rf.dialBox) rf.dialBox.hidden = true;
    } else {
      rf.bar.hidden = false; if (rf.dialBox) rf.dialBox.hidden = false;
      setText(rf.act, st.active ? 'On' : 'Off'); setDis(rf.act, !st.active && ac >= sl);
      const eff = ratioEfficiency(r, st.dials);
      const stabNote = s.stab && s.stab.rid === r.id ? ' · stabilised +25%' : '';
      setText(rf.meta, (rf.hasDials ? 'Efficiency ' + Math.round(eff * 100) + '% ' + (eff < 0.999 ? '(atoms wasted: match the equation)' : '(balanced)') : 'Single ingredient: always balanced') + stabNote);
      rf.fill.style.width = Math.round(eff * 100) + '%';
      for (const k of Object.keys(rf.dials)) {
        setText(rf.dials[k].out, String(st.dials[k]));
        const lock = s.upg.auto > 0; setDis(rf.dials[k].m, lock); setDis(rf.dials[k].p, lock);
      }
    }
    const cx = refs.cx[r.id], known = st.owned;
    cx.classList.toggle('lock', !known);
    setText(cx.children[0], known ? r.eq : '??? (build this reactor to learn it)');
    setText(cx.children[1], known ? r.fact : 'Tier ' + r.tier + ' reaction');
  }
  for (const k of Object.keys(GENS)) {
    const rf = refs.gen[k], c = genCost(s, k);
    setText(rf.sp, 'Level ' + s.gens[k] + ' · makes ' + LABEL[k] + ' atoms');
    setText(rf.btn, fmt(c)); setDis(rf.btn, s.energy < c); rf.btn.classList.toggle('can', s.energy >= c);
  }
  for (const k of Object.keys(UPGRADES)) {
    const rf = refs.upg[k], u = UPGRADES[k], maxed = s.upg[k] >= u.max, c = upgCost(s, k);
    setText(rf.b1, u.name + (u.max > 1 ? ' (' + s.upg[k] + ')' : ''));
    setText(rf.btn, maxed ? 'Done' : fmt(c)); setDis(rf.btn, maxed || s.energy < c); rf.btn.classList.toggle('can', !maxed && s.energy >= c);
  }
  setText(refs.x2, s.x2 > 0 ? '2× production: ' + fmtTime(s.x2) + ' left' : 'Watch for 2× production (5 min)');
  const ban = $('banner');
  if (s.ev) { ban.hidden = false; setText(ban, 'Unstable reaction in ' + RX[s.ev.rid].eq + '! Tap Stabilise for a bonus (' + Math.ceil(s.ev.left) + 's)'); maybeTip(2); }
  else ban.hidden = true;
  renderPhase();
}

let phaseKey = '';
function renderPhase() {
  const gain = phasePointsGain(s);
  const key = gain + '|' + s.pp + '|' + s.phases + '|' + Math.floor(s.runEnergy / Math.max(1, PHASE_THRESHOLD / 50));
  if (key === phaseKey) return; phaseKey = key;
  const c = $('phaseCard'); c.textContent = '';
  c.append(el('h2', '', 'Phase Change'));
  c.append(el('p', '', 'Reset your atoms, molecules, Energy and buildings for permanent Phase Points. Each point adds ' + Math.round(PP_BONUS * 100) + '% production, and every 3 points open another reactor slot.'));
  c.append(el('p', 'small', 'You have ' + fmt(s.pp) + ' points (×' + ppMult(s).toFixed(2) + ' production) and ' + slots(s) + ' reactor slots. Phase Changes so far: ' + s.phases + '.'));
  if (gain) {
    c.append(el('p', '', 'Available now: +' + fmt(gain) + ' Phase Points.'));
    const b = el('button', 'big', 'Phase Change (+' + fmt(gain) + ')');
    b.onclick = () => {
      modal((m) => {
        m.append(el('h2', '', 'Phase Change?'), el('p', '', 'You will gain ' + fmt(gain) + ' Phase Points and restart with a stronger multiplier.'));
        const row = el('div', 'row'); const no = el('button', '', 'Not yet'); no.onclick = closeModal;
        const yes = el('button', 'big', 'Do it'); yes.onclick = () => { phaseChange(s); sfx.phase(); closeModal(); save(); phaseKey = ''; };
        row.append(no, yes); m.append(row);
      });
    };
    c.append(b);
  } else {
    c.append(el('p', '', 'Reach ' + fmt(PHASE_THRESHOLD) + ' Energy in one run to unlock your first Phase Change.'));
    const bar = el('div', 'bar'); const f = el('i'); f.style.width = Math.min(100, s.runEnergy / PHASE_THRESHOLD * 100) + '%'; bar.append(f); c.append(bar);
  }
}

// ---------- main loop ----------
let rate = 0, rateAcc = 0, rateE0 = 0;
function frame() {
  const now = Date.now();
  let dt = (now - last) / 1000; last = now;
  if (!paused && !hidden) {
    if (dt > 1) { // browser throttled us; catch up in steps
      const steps = Math.min(120, Math.ceil(dt / 0.5)); const d = Math.min(dt, 60) / steps;
      for (let i = 0; i < steps; i++) tick(s, d);
    } else tick(s, dt);
    rateAcc += dt;
    if (rateAcc >= 1) { rate = Math.max(0, (s.energy - rateE0) / rateAcc); rateE0 = s.energy; rateAcc = 0; }
    prodAcc += dt;
    if (prodAcc > 0.5 && s.energy > lastEnergy) {
      prodAcc = 0; const act = REACTIONS.filter(r => s.reactors[r.id].active);
      if (act.length) spawn(Object.keys(act[Math.floor(Math.random() * act.length)].out)[0]);
    }
    lastEnergy = s.energy;
    saveAcc += dt; if (saveAcc >= 15) { saveAcc = 0; save(); }
    if (s.ev && !s.ev._snd) { s.ev._snd = 1; sfx.unstable(); }
  }
  fitCanvas(); drawParts(Math.min(dt, 0.1)); update(dt);
  requestAnimationFrame(frame);
}

// ---------- boot ----------
async function boot() {
  buildUI();
  const text = load();
  if (text) { try { s = deserialize(text); } catch (e) { s = newState(); } }
  setMuted(s.settings.mute);
  try { await platform.init(); } catch (e) { /* adapter must never block the game */ }
  const away = text && s.lastSave ? (Date.now() - s.lastSave) / 1000 : 0;
  last = Date.now(); rateE0 = s.energy;
  platform.gameplayStart();
  if (away >= 30) welcomeBack(away);
  maybeTip(0);
  running = true;
  window.__bondwork = { get state() { return s; }, tick: (d) => tick(s, d), save, version: VERSION };
  requestAnimationFrame(frame);
}
boot();
