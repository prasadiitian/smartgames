import {
  VERSION, ATOMS, REACTIONS, RX, GENS, UPGRADES, LABEL, COLORS, NAMES, VALUE, TIPS, PHASE_THRESHOLD, PP_BONUS, OFFLINE_CAP, PERFECT_BONUS,
} from './data.js';
import {
  newState, tick, tap, buyGen, buyUpgrade, buyReactor, toggleReactor, setDial, stabilise, overload, collectRare, phaseChange,
  phasePointsGain, genCost, upgCost, ratioEfficiency, excessIngredient, isPerfect, offline, serialize, deserialize, exportSave,
  importSave, slots, activeCount, tapAtoms, ppMult, achMult, globalMult, bondMult, streakMult,
} from './engine.js';
import { activeGoals, ACHS, ACH_BONUS } from './goals.js';
import { fmt, fmtTime } from './num.js';
import { LabScene, Overlay, moleculeSVG, SPECIES_ORDER } from './render.js';
import platform from './platform.js';
import { sfx, setMuted, unlock } from './audio.js';

const $ = (id) => document.getElementById(id);
const KEY = 'bondwork.save';
let s = newState();
let paused = false, hidden = false;
let last = Date.now(), saveAcc = 0, hiddenAt = 0;
const scene = new LabScene($('cv'));
const overlay = new Overlay($('fx'));
const COLS = [COLORS.H, COLORS.O, COLORS.N, '#ffd166'];

// ---------- storage (always guarded) ----------
function store(text) { try { localStorage.setItem(KEY, text); return true; } catch (e) { return false; } }
function load() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
function save() { s.lastSave = Date.now(); store(serialize(s)); }

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

// ---------- juice ----------
let comboN = 0, comboAt = 0;
function combo() { const n = performance.now(); comboN = n - comboAt < 1400 ? Math.min(14, comboN + 1) : 0; comboAt = n; return comboN; }
function centerOf(node) { const r = node.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
function pop(text, x, y, cls = '') {
  if (document.querySelectorAll('.pop').length > 14) return;
  const p = el('div', 'pop ' + cls, text); p.style.left = x + 'px'; p.style.top = y + 'px';
  document.body.appendChild(p); setTimeout(() => p.remove(), 950);
}
function toast(html) {
  const box = $('toasts'); while (box.children.length > 1) box.firstChild.remove();
  const t = el('div', 'toast'); t.innerHTML = html; box.appendChild(t); setTimeout(() => t.remove(), 2600);
}
function shake() {
  if (!s.settings.shake) return;
  const a = $('app'); a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake');
}
function bump(node) { node.classList.remove('bump'); void node.offsetWidth; node.classList.add('bump'); }
function burstEl(node, n = 16, speed = 150) { const [x, y] = centerOf(node); overlay.burst(x, y, COLS, n, speed, 0.7, 3.5); overlay.ring(x, y, '#ffd166', 36); }

// ---------- build static UI ----------
const refs = { rx: {}, gen: {}, upg: {}, chip: {}, tile: {}, ach: {} };

function buildUI() {
  $('ver').textContent = VERSION;
  const pick = $('atomPick');
  for (const a of ATOMS) {
    const b = el('button', '', a); b.style.background = COLORS[a]; b.dataset.a = a; b.setAttribute('aria-label', 'Spark ' + a);
    b.onclick = () => { s.selAtom = a; unlock(); sfx.tap(combo()); };
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
    const eq = el('div', 'eq', r.eq); const act = el('button', '', '');
    hd.append(eq, act); card.appendChild(hd);
    const meta = el('div', 'meta hint'); card.appendChild(meta);
    const dials = el('div', 'dials'); const dRefs = {};
    if (Object.keys(r.inp).length > 1) {
      for (const k of Object.keys(r.inp)) {
        const d = el('div', 'dial'); d.appendChild(el('span', 'k', LABEL[k]));
        const m = el('button', '', '−'); const out = el('output', '', '1'); const p = el('button', '', '+');
        m.setAttribute('aria-label', 'Decrease ' + k); p.setAttribute('aria-label', 'Increase ' + k);
        const change = (dv) => (e) => { unlock(); const hit = setDial(s, r.id, k, s.reactors[r.id].dials[k] + dv); if (!hit) sfx.tap(combo()); };
        m.onclick = change(-1); p.onclick = change(1);
        d.append(m, out, p); dials.appendChild(d); dRefs[k] = { out, m, p };
      }
      card.appendChild(dials);
    }
    const bar = el('div', 'bar'); const fill = el('i'); bar.appendChild(fill); card.appendChild(bar);
    const evb = el('div', 'evbtns'); evb.hidden = true;
    const safe = el('button', '', 'Stabilise (safe +25%)'); const risky = el('button', '', 'Overload (gamble ×3)');
    safe.style.background = '#1f5a3a'; risky.style.background = '#6b2f00';
    safe.onclick = () => { if (stabilise(s)) { sfx.stabilise(); const [x, y] = centerOf(card); pop('Stable! +25%', x, y, 'good'); burstEl(safe, 14); } };
    risky.onclick = () => {
      const [x, y] = centerOf(card); const win = overload(s);
      if (win === null) return;
      if (win) { sfx.overWin(); shake(); pop('OVERLOAD! ×3', x, y, 'big'); overlay.burst(x, y, COLS, 40, 260, 0.9, 4); toast('<b>Overload!</b> ×3 output for 15 s'); }
      else { sfx.overLose(); pop('Jammed 8 s', x, y, 'bad'); toast('Reactor jammed for 8 s. Nothing is lost for good.'); }
    };
    evb.append(safe, risky); card.appendChild(evb);
    act.onclick = () => {
      unlock();
      const st = s.reactors[r.id];
      if (!st.owned) { if (buyReactor(s, r.id)) { const need = Object.keys(r.inp).find(k => ATOMS.includes(k) && s.inv[k] < 10); if (need) s.selAtom = need; sfx.buy(combo()); bump(card); burstEl(act, 22, 200); maybeTip(1); } else sfx.deny(); }
      else if (!toggleReactor(s, r.id)) sfx.deny(); else sfx.tap(combo());
    };
    rxBox.appendChild(card);
    refs.rx[r.id] = { card, act, meta, dials: dRefs, fill, bar, hasDials: Object.keys(dRefs).length > 0, dialBox: dials, evb, badge: null };
  }
  const gens = $('gens');
  for (const g of Object.keys(GENS)) {
    const it = el('div', 'item'); const t = el('div', 't'); const b1 = el('b', '', GENS[g].name); const sp = el('span');
    t.append(b1, sp); const btn = el('button');
    btn.onclick = () => { unlock(); if (buyGen(s, g)) { sfx.buy(combo()); bump(btn); burstEl(btn, 12, 120); const [x, y] = centerOf(btn); pop('Level ' + s.gens[g], x, y - 10, 'good'); } else sfx.deny(); };
    it.append(t, btn); gens.appendChild(it); refs.gen[g] = { it, sp, btn };
  }
  const up = $('upgs');
  for (const u of Object.keys(UPGRADES)) {
    const it = el('div', 'item'); const t = el('div', 't'); const b1 = el('b'); const sp = el('span', '', UPGRADES[u].desc);
    t.append(b1, sp); const btn = el('button');
    btn.onclick = () => { unlock(); if (buyUpgrade(s, u)) { sfx.buy(combo()); bump(btn); burstEl(btn, 14, 140); const [x, y] = centerOf(btn); pop(UPGRADES[u].name + '!', x, y - 10, 'good'); } else sfx.deny(); };
    it.append(t, btn); up.appendChild(it); refs.upg[u] = { it, b1, btn };
  }
  const bx = $('boosts');
  const x2 = el('button', '', 'Watch for 2× production (5 min)'); x2.style.width = '100%';
  x2.onclick = () => platform.showRewarded(() => { s.x2 = 300; sfx.buy(); }, () => {});
  bx.appendChild(x2); refs.x2 = x2;

  // shelf tiles (one per molecule) and achievements
  const shelf = $('shelf');
  for (const sp of SPECIES_ORDER) {
    const t = el('div', 'tile locked'); const svg = el('div'); const nm = el('b', '', '???'); const f = el('div', 'f', '');
    t.append(svg, nm, f); shelf.appendChild(t); refs.tile[sp] = { t, svg, nm, f, shown: null };
  }
  const achs = $('achs');
  for (const a of ACHS) { const d = el('div', 'ach'); d.append(el('b', '', a.name), el('span', '', a.desc)); achs.appendChild(d); refs.ach[a.id] = d; }

  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => { showTab(b.dataset.tab); sfx.tap(); });
  const doTap = (cx, cy) => {
    unlock(); const n = tap(s); const c = combo(); sfx.tap(c); scene.spawnTapAtom(s.selAtom); maybeTip(0);
    pop('+' + fmt(n), cx, cy - 46, c > 4 ? 'big' : ''); overlay.burst(cx, cy, [COLORS[s.selAtom], '#ffffff'], 6 + Math.min(c, 8), 110, 0.45, 3);
  };
  $('btnTap').onclick = (e) => { const [x, y] = centerOf($('btnTap')); doTap(x, y); };
  $('cv').addEventListener('pointerdown', (e) => {
    const r = $('cv').getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    if (s.rare && scene.hitToken(px, py)) { rareCollected(e.clientX, e.clientY); return; }
    doTap(e.clientX, e.clientY);
  });
  $('btnPause').onclick = () => setPaused(!paused);
  $('btnMute').onclick = () => { s.settings.mute = !s.settings.mute; setMuted(s.settings.mute); unlock(); };
  $('optShake').onchange = (e) => { s.settings.shake = e.target.checked; document.body.classList.toggle('noshake', !s.settings.shake); };
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
  scene.onLand = (sp) => {
    const v = VALUE[sp] * globalMult(s) * bondMult(s) * streakMult(s);
    const c = combo(); sfx.bond(c);
    const r = $('cv').getBoundingClientRect();
    const nowT = performance.now();
    if (nowT - (onLandPop.t || 0) > 260) { onLandPop.t = nowT; pop('+' + fmt(v), r.left + scene.W / scene.dpr * (0.2 + Math.random() * 0.6), r.top + r.height * 0.42, 'good'); }
  };
}

const onLandPop = { t: 0 };
function msg(t) { $('saveMsg').textContent = t; }
function showTab(t) {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('on', p.id === t));
  document.querySelector('main').classList.toggle('alt', t === 'codex' || t === 'more');
}
function refreshAll() {
  setMuted(s.settings.mute); $('optShake').checked = s.settings.shake; document.body.classList.toggle('noshake', !s.settings.shake);
  scene.reset(); scene.seed(s.runMade); refs.tile && Object.values(refs.tile).forEach(t => { t.shown = null; });
}

// ---------- tips (max three, one-time) ----------
function maybeTip(i) {
  if (s.seen.tips !== i || i >= TIPS.length) return;
  s.seen.tips = i + 1; $('tipText').textContent = TIPS[i]; $('tip').hidden = false;
  setTimeout(() => { if ($('tipText').textContent === TIPS[i]) $('tip').hidden = true; }, 9000);
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
function modal(build) { const body = $('modalBody'); body.textContent = ''; build(body); $('modal').hidden = false; }
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

// ---------- discovery reveal ----------
const revealQ = [];
function showReveal(sp) {
  const rx = REACTIONS.find(x => x.out[sp]);
  const host = $('reveal'); host.textContent = '';
  const box = el('div', 'reveal');
  const svg = el('div', 'rv-svg'); svg.innerHTML = moleculeSVG(sp, false);
  const txt = el('div', 'rv-txt');
  txt.append(el('div', 'kicker', 'New molecule discovered'), el('div', 'nm', NAMES[sp]), el('div', 'small', LABEL[sp] + ' · ' + rx.eq), el('div', 'small', rx.fact));
  box.append(svg, txt); host.append(box); host.hidden = false;
  clearTimeout(showReveal.t); showReveal.t = setTimeout(() => { host.hidden = true; }, 5500);
  sfx.reveal(); shake();
  const w = innerWidth / 2, h = Math.min(innerHeight * 0.3, 230);
  overlay.burst(w, h, COLS.concat(['#ffffff']), 60, 320, 1.1, 4); overlay.ring(w, h, '#ffd166', 120);
  if (refs.tile[sp]) refs.tile[sp].t.classList.add('new');
}

// ---------- rare ----------
function rareCollected(x, y) {
  const type = s.rare && s.rare.type; const res = collectRare(s);
  if (!res) return;
  scene.clearRare(); sfx.rare(); shake();
  overlay.burst(x, y, ['#ffd166', '#ffffff', '#7be0a4'], 50, 280, 1, 4); overlay.ring(x, y, '#ffd166', 90);
  if (type === 'lucky') { pop('LUCKY BOND +' + fmt(res.reward), x, y, 'big'); toast('<b>Lucky bond!</b> +' + fmt(res.reward) + ' Energy'); }
  else { pop('CATALYST ×3', x, y, 'big'); toast('<b>Catalyst!</b> ×3 production for 15 s'); }
}

// ---------- queue from the engine ----------
function drainQueue() {
  while (s.q.length) {
    const e = s.q.shift();
    if (e.k === 'reveal') revealQ.push(e.sp);
    else if (e.k === 'goal') {
      sfx.goal(); toast('Goal done: <b>' + e.text + '</b> +' + fmt(e.reward) + ' Energy');
      const g = $('goals'); bump(g); const [x, y] = centerOf(g); overlay.burst(x, y, COLS, 24, 200, 0.8, 3.5);
    } else if (e.k === 'ach') { sfx.goal(); shake(); toast('Achievement: <b>' + e.name + '</b> (+' + Math.round(ACH_BONUS * 100) + '% production)'); }
    else if (e.k === 'perfect') {
      const rf = refs.rx[e.rid]; sfx.perfect(); if (rf) { const [x, y] = centerOf(rf.card); pop('PERFECT! +' + Math.round((PERFECT_BONUS - 1) * 100) + '%', x, y, 'big good'); overlay.burst(x, y, ['#7be0a4', '#ffffff'], 30, 220, 0.8, 3.5); bump(rf.card); }
    }
  }
  if (revealQ.length && $('reveal').hidden) showReveal(revealQ.shift());
}

// ---------- per-frame UI update ----------
function setText(node, t) { if (node.textContent !== t) node.textContent = t; }
function setDis(b, v) { if (b.disabled !== v) b.disabled = v; }
let rate = 0, rateAcc = 0, rateE0 = 0, lastRare = null;
const goalRows = [];

function update() {
  setText($('energy'), fmt(s.energy));
  setText($('rate'), fmt(rate));
  setText($('pp'), fmt(s.pp));
  $('ppStat').hidden = s.pp === 0 && s.phases === 0;
  setText($('tapN'), '+' + fmt(tapAtoms(s) * globalMult(s)));
  setText($('btnMute'), s.settings.mute ? 'Muted' : 'Sound');
  const needed = new Set();
  for (const r of REACTIONS) if (s.reactors[r.id].active) for (const k of Object.keys(r.inp)) if (ATOMS.includes(k) && s.inv[k] < 2 && !s.gens[k]) needed.add(k);
  $('atomPick').querySelectorAll('button').forEach(b => { b.classList.toggle('on', b.dataset.a === s.selAtom); b.classList.toggle('need', needed.has(b.dataset.a) && b.dataset.a !== s.selAtom); });
  for (const k of Object.keys(s.inv)) {
    const ref = refs.chip[k];
    ref.c.hidden = !(s.inv[k] > 0.5);
    setText(ref.b, fmt(s.inv[k]));
  }
  for (const a of ATOMS) {
    const hide = (a === 'C' && !s.reactors.CO2.owned && !s.reactors.CH4.owned) || (a === 'N' && !s.reactors.N2.owned) || (a === 'O' && !s.reactors.O2.owned);
    $('atomPick').querySelector('[data-a=' + a + ']').hidden = hide && s.inv[a] === 0;
  }
  setText($('stageInfo'), fmt(scene.total()) + ' molecules built' + (s.cat > 0 ? ' · catalyst ×3 ' + Math.ceil(s.cat) + 's' : ''));

  const sl = slots(s), ac = activeCount(s);
  const nextUnowned = REACTIONS.find(q => !s.reactors[q.id].owned);
  for (const r of REACTIONS) {
    const st = s.reactors[r.id], rf = refs.rx[r.id];
    rf.card.hidden = !st.owned && !(nextUnowned && REACTIONS.indexOf(r) <= REACTIONS.indexOf(nextUnowned));
    rf.card.classList.toggle('off', !st.active);
    const unstable = !!(s.ev && s.ev.rid === r.id), jammed = !!(s.jam && s.jam.rid === r.id);
    rf.card.classList.toggle('unstable', unstable);
    rf.card.classList.toggle('jam', jammed);
    rf.evb.hidden = !unstable;
    const perfect = st.owned && isPerfect(r, st.dials);
    rf.card.classList.toggle('perfect', perfect);
    if (!st.owned) {
      setText(rf.act, 'Build ' + fmt(r.cost)); setDis(rf.act, s.energy < r.cost);
      setText(rf.meta, 'Needs ' + Object.entries(r.inp).map(([k, n]) => n + ' ' + LABEL[k]).join(' + '));
      rf.bar.hidden = true; if (rf.dialBox) rf.dialBox.hidden = true;
    } else {
      rf.bar.hidden = false; if (rf.dialBox) rf.dialBox.hidden = false;
      setText(rf.act, st.active ? 'On' : 'Off'); setDis(rf.act, !st.active && ac >= sl);
      const eff = ratioEfficiency(r, st.dials);
      let txt;
      if (jammed) txt = 'JAMMED for ' + Math.ceil(s.jam.left) + ' s. It will recover by itself.';
      else if (!rf.hasDials) txt = 'Single ingredient: always balanced.';
      else if (perfect) txt = 'PERFECT balance: +' + Math.round((PERFECT_BONUS - 1) * 100) + '% yield, nothing wasted.';
      else {
        const ex = excessIngredient(r, st.dials);
        txt = 'Too much ' + LABEL[ex] + ': ' + Math.round((1 - eff) * 100) + '% of atoms wasted. Lower ' + LABEL[ex] + ' or raise the other. Target ' + Object.keys(r.inp).map(k => r.inp[k]).join(' : ') + '.';
      }
      if (s.stab && s.stab.rid === r.id) txt += ' · boosted ×' + s.stab.mult + ' (' + Math.ceil(s.stab.left) + 's)';
      setText(rf.meta, txt);
      rf.fill.style.width = Math.round(eff * 100) + '%';
      rf.fill.style.background = perfect ? 'var(--good)' : eff > 0.8 ? 'var(--accent)' : '#ff8a8a';
      for (const k of Object.keys(rf.dials)) {
        setText(rf.dials[k].out, String(st.dials[k]));
        const lock = s.upg.auto > 0; setDis(rf.dials[k].m, lock); setDis(rf.dials[k].p, lock);
      }
    }
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
  if (s.ev) { ban.hidden = false; setText(ban, 'Unstable reaction in ' + RX[s.ev.rid].eq + '! Stabilise = safe bonus. Overload = 50% ×3, 50% jam. (' + Math.ceil(s.ev.left) + 's)'); maybeTip(2); }
  else ban.hidden = true;
  const sb = $('streakBar');
  const multi = REACTIONS.some(r => s.reactors[r.id].active && Object.keys(r.inp).length > 1);
  setText(sb, !multi ? '' : s.streak > 0 ? 'Perfect streak ' + Math.floor(s.streak) + ' s: +' + Math.round((streakMult(s) - 1) * 100) + '% Energy' : 'Balance every two-ingredient reactor to build a perfect streak.');

  renderGoals(); renderShelf(); renderPhase();
}

function renderGoals() {
  const goals = activeGoals(s), box = $('goals');
  const phaseGain = phasePointsGain(s);
  const key = goals.map(g => g.id + g.text).join('|');
  if (box.dataset.key !== key) {
    box.dataset.key = key; box.textContent = ''; goalRows.length = 0;
    for (const g of goals) {
      const row = el('div', 'goal'); const t = el('div', 'gt'); const a = el('span', '', g.text); const b = el('span', '', '');
      t.append(a, b); const bar = el('div', 'bar'); const f = el('i'); bar.append(f); row.append(t, bar); box.append(row); goalRows.push({ g, b, f });
    }
    const row = el('div', 'goal long'); const t = el('div', 'gt'); const a = el('span', '', ''); const b = el('span', '', ''); t.append(a, b);
    const bar = el('div', 'bar'); const f = el('i'); bar.append(f); row.append(t, bar); box.append(row); goalRows.push({ long: true, a, b, f });
  }
  for (const r of goalRows) {
    if (r.long) {
      const p = Math.min(1, s.runEnergy / PHASE_THRESHOLD);
      setText(r.a, phaseGain ? 'Phase Change is ready!' : 'Long-term: Phase Change at ' + fmt(PHASE_THRESHOLD) + ' Energy');
      setText(r.b, Math.floor(p * 100) + '%'); r.f.style.width = p * 100 + '%'; continue;
    }
    const p = r.g.prog(s), frac = Math.max(0, Math.min(1, p.cur / p.max));
    setText(r.b, p.max >= 20 ? fmt(Math.min(p.cur, p.max)) + '/' + fmt(p.max) : Math.min(Math.floor(p.cur), p.max) + '/' + p.max);
    r.f.style.width = frac * 100 + '%';
  }
}

function renderShelf() {
  let n = 0;
  for (const sp of SPECIES_ORDER) {
    const t = refs.tile[sp], known = !!s.disc[sp]; if (known) n++;
    if (t.shown === known) continue; t.shown = known;
    t.svg.innerHTML = moleculeSVG(sp, !known);
    t.nm.textContent = known ? NAMES[sp] : '???';
    const rx = RX[sp] || REACTIONS.find(x => x.out[sp]);
    t.f.textContent = known ? LABEL[sp] + ': ' + rx.fact : 'Locked. Build the ' + LABEL[sp] + ' reactor to discover it.';
    t.t.classList.toggle('locked', !known);
  }
  setText($('shelfCount'), n + ' of ' + SPECIES_ORDER.length + ' molecules discovered');
  let c = 0;
  for (const a of ACHS) { const on = !!s.ach[a.id]; if (on) c++; refs.ach[a.id].classList.toggle('on', on); }
  setText($('achSum'), c + ' of ' + ACHS.length + ' earned: +' + Math.round(ACH_BONUS * 100 * c) + '% production');
}

let phaseKey = '';
function renderPhase() {
  const gain = phasePointsGain(s);
  const key = gain + '|' + s.pp + '|' + s.phases + '|' + Math.floor(s.runEnergy / Math.max(1, PHASE_THRESHOLD / 50));
  if (key === phaseKey) return; phaseKey = key;
  const c = $('phaseCard'); c.textContent = '';
  c.append(el('h2', '', 'Phase Change'));
  c.append(el('p', '', 'Reset your atoms, molecules, Energy and buildings for permanent Phase Points. Each point adds ' + Math.round(PP_BONUS * 100) + '% production, and every 3 points open another reactor slot. Your shelf and achievements are kept.'));
  c.append(el('p', 'small', 'You have ' + fmt(s.pp) + ' points (×' + ppMult(s).toFixed(2) + ' production) and ' + slots(s) + ' reactor slots. Phase Changes so far: ' + s.phases + '.'));
  if (gain) {
    c.append(el('p', '', 'Available now: +' + fmt(gain) + ' Phase Points.'));
    const b = el('button', 'big', 'Phase Change (+' + fmt(gain) + ')');
    b.onclick = () => {
      modal((m) => {
        m.append(el('h2', '', 'Phase Change?'), el('p', '', 'You will gain ' + fmt(gain) + ' Phase Points and restart with a stronger multiplier.'));
        const row = el('div', 'row'); const no = el('button', '', 'Not yet'); no.onclick = closeModal;
        const yes = el('button', 'big', 'Do it');
        yes.onclick = () => { phaseChange(s); sfx.phase(); shake(); closeModal(); scene.reset(); save(); phaseKey = ''; overlay.burst(innerWidth / 2, innerHeight / 2, COLS.concat(['#fff']), 80, 380, 1.2, 4.5); toast('<b>Phase Change!</b> Production ×' + ppMult(s).toFixed(2)); };
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
const emit = (e) => { if (e.k === 'make') scene.make(e.sp, e.n); };
let evSnd = null, rareSnd = null, syncAcc = 0;
function frame() {
  const now = Date.now();
  const dt = (now - last) / 1000; last = now;
  if (!paused && !hidden) {
    if (dt > 1) { // browser throttled us; catch up in steps without visuals
      const steps = Math.min(120, Math.ceil(dt / 0.5)); const d = Math.min(dt, 60) / steps;
      for (let i = 0; i < steps; i++) tick(s, d);
    } else tick(s, dt, Math.random, emit);
    rateAcc += dt;
    if (rateAcc >= 1) { rate = Math.max(0, (s.energy - rateE0) / rateAcc); rateE0 = s.energy; rateAcc = 0; }
    saveAcc += dt; if (saveAcc >= 15) { saveAcc = 0; save(); }
    if (s.ev && evSnd !== s.ev) { evSnd = s.ev; sfx.unstable(); }
    if (!s.ev) evSnd = null;
    if (s.rare && rareSnd !== s.rare) { rareSnd = s.rare; scene.setRare(s.rare); sfx.rare(); toast(s.rare.type === 'lucky' ? 'A <b>lucky bond</b> drifts by! Tap it.' : 'A <b>catalyst</b> appeared! Tap it.'); }
    if (!s.rare && rareSnd) { rareSnd = null; scene.clearRare(); }
    syncAcc += dt; if (syncAcc > 0.4) { syncAcc = 0; scene.syncAmbient(s.inv); }
  }
  scene.resize(); overlay.resize();
  scene.draw(Math.min(dt, 0.1), s.cat > 0);
  overlay.draw(Math.min(dt, 0.1));
  drainQueue();
  update();
  requestAnimationFrame(frame);
}

// ---------- boot ----------
async function boot() {
  buildUI();
  const text = load();
  if (text) { try { s = deserialize(text); } catch (e) { s = newState(); } }
  refreshAll();
  try { await platform.init(); } catch (e) { /* adapter must never block the game */ }
  const away = text && s.lastSave ? (Date.now() - s.lastSave) / 1000 : 0;
  last = Date.now(); rateE0 = s.energy;
  platform.gameplayStart();
  if (away >= 30) welcomeBack(away);
  maybeTip(0);
  window.__bondwork = { get state() { return s; }, tick: (d) => tick(s, d, Math.random, emit), save, version: VERSION, scene };
  requestAnimationFrame(frame);
}
boot();
