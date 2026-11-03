// Headless browser checks. Usage: node tests/browser.mjs [dir-to-serve=src] [baseUrl]
// If baseUrl is given (e.g. a live URL) the local server is skipped.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const dir = path.resolve(process.argv[2] || 'src');
const external = process.argv[3];
const shots = process.env.SHOTS_DIR;
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => fs.existsSync(p));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };

let server, base = external;
if (!external) {
  server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(dir, p);
    if (!f.startsWith(dir) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}/`;
}
const origin = new URL(base).origin;

let pass = 0, fail = 0;
const ok = (c, n, d = '') => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + n + (c ? '' : '  ' + d)); };

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
const sizes = [[360, 640, true], [768, 1024, true], [1280, 720, false]];

for (const [w, h, touch] of sizes) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: w, height: h, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
  const errors = [], foreign = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('request', r => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith('data:')) foreign.push(u); });
  const t0 = Date.now();
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForSelector('#helpOk', { timeout: 3000 }).then(() => page.click('#helpOk')).catch(() => {});
  await page.waitForFunction('window.__bondwork');
  const loadMs = Date.now() - t0;
  const tag = `[${w}x${h}${touch ? ' touch' : ''}] `;
  ok(errors.length === 0, tag + 'no console errors', errors.join(' | '));
  ok(foreign.length === 0, tag + 'no external requests', foreign.join(' '));
  ok(loadMs < 3000, tag + 'loads under 3s (' + loadMs + 'ms)');

  // play a little: tap, then simulate time
  const tapSel = '#btnTap';
  for (let i = 0; i < 12; i++) { touch ? await page.tap(tapSel) : await page.click(tapSel); }
  await page.evaluate(() => { __bondwork.tick(1); });
  const e1 = await page.evaluate(() => __bondwork.state.energy);
  ok(e1 > 0, tag + 'tapping and reactors produce Energy (' + e1.toFixed(1) + ')');

  // fun-pass checks
  const fun = await page.evaluate(async () => {
    const out = {};
    const sc = __bondwork.scene;
    out.goals = document.querySelectorAll('#goals .goal').length;
    out.shelfTiles = document.querySelectorAll('#shelf .tile').length;
    out.lockedTiles = document.querySelectorAll('#shelf .tile.locked').length;
    await new Promise(r => setTimeout(r, 1500));
    out.molecules = sc.total();
    const reveal = document.getElementById('reveal');
    out.revealShown = !reveal.hidden;
    // taps must still work while a reveal card is showing
    const t0 = __bondwork.state.stats.taps; document.getElementById('btnTap').click(); out.tapWorks = __bondwork.state.stats.taps === t0 + 1;
    return out;
  });
  ok(fun.goals >= 3 && fun.goals <= 4, tag + 'goals shown (short + long-term): ' + fun.goals);
  ok(fun.shelfTiles === 8 && fun.lockedTiles >= 1, tag + 'shelf shows locked silhouettes (' + fun.lockedTiles + ' locked)');
  ok(fun.molecules >= 1, tag + 'molecules visibly pile up in the lab (' + fun.molecules + ')');
  ok(fun.revealShown, tag + 'first molecule shows a discovery reveal');
  ok(fun.tapWorks, tag + 'reveal does not block play');

  // layout checks on each tab
  for (const tab of ['lab', 'build', 'codex', 'more']) {
    if (await page.$(`#tabs button[data-tab=${tab}]`).then(b => b && b.evaluate(x => x.offsetParent !== null))) {
      await page.click(`#tabs button[data-tab=${tab}]`);
    }
    await new Promise(r => setTimeout(r, 100));
    const prob = await page.evaluate(() => {
      const out = [];
      const de = document.documentElement;
      if (de.scrollWidth > de.clientWidth + 1) out.push('page horizontal overflow ' + de.scrollWidth + '>' + de.clientWidth);
      const vis = [...document.querySelectorAll('main *:not(canvas), header *, nav *')].filter(e => e.offsetParent && e.getClientRects().length);
      for (const e of vis) {
        const r = e.getBoundingClientRect();
        if (r.width && (r.right > innerWidth + 1 || r.left < -1)) out.push('offscreen x: ' + (e.id || e.className || e.tagName) + ' ' + (e.textContent || '').slice(0, 20));
        if (e.tagName === 'BUTTON' && e.offsetParent && (r.height < 43.5 || r.width < 43.5)) out.push('small button: ' + e.textContent.slice(0, 15) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
        if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible' && e.tagName !== 'TEXTAREA') out.push('clipped text: ' + e.textContent.slice(0, 20));
      }
      // overlapping text among sibling buttons/labels in header
      const hdr = [...document.querySelectorAll('#top > *')].filter(e => e.offsetParent).map(e => e.getBoundingClientRect());
      for (let i = 0; i < hdr.length; i++) for (let j = i + 1; j < hdr.length; j++) {
        const a = hdr[i], b = hdr[j];
        if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) out.push('header overlap');
      }
      return out;
    });
    ok(prob.length === 0, tag + `layout "${tab}" has no overflow/overlap/small buttons`, prob.slice(0, 4).join(' ; '));
    if (shots) { fs.mkdirSync(shots, { recursive: true }); }
  }

  // contrast of key text vs. background
  const contrast = await page.evaluate(() => {
    const lum = (c) => { const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const bg = (e) => { while (e) { const c = getComputedStyle(e).backgroundColor; if (!c.startsWith('rgba(0, 0, 0, 0')) return c; e = e.parentElement; } return 'rgb(16,21,31)'; };
    const bad = [];
    for (const e of document.querySelectorAll('#top .stat b, #top .lbl, .item .t span, .small, h2, button, .chip')) {
      if (!e.offsetParent) continue;
      const fg = getComputedStyle(e).color, b = bg(e);
      const L1 = lum(fg), L2 = lum(b), cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const disabled = e.disabled;
      if (cr < 4.5 && !disabled) bad.push((e.textContent || '').slice(0, 15) + ' ' + cr.toFixed(2));
    }
    return bad;
  });
  ok(contrast.length === 0, tag + 'text contrast >= 4.5:1', contrast.slice(0, 4).join(' ; '));

  // pause / mute / persistence
  await page.click('#tabs button[data-tab=lab]').catch(() => {});
  await page.click('#btnPause');
  const frozen = await page.evaluate(async () => { const a = __bondwork.state.playTime; await new Promise(r => setTimeout(r, 400)); return __bondwork.state.playTime === a; });
  ok(frozen, tag + 'pause stops the simulation');
  await page.click('#btnPause');
  await page.click('#btnMute');
  ok(await page.evaluate(() => __bondwork.state.settings.mute === true), tag + 'mute toggles');
  await page.evaluate(() => __bondwork.save());
  const savedE = await page.evaluate(() => __bondwork.state.taps);
  await page.reload({ waitUntil: 'load' }); await page.waitForFunction('window.__bondwork');
  ok(await page.evaluate((n) => __bondwork.state.taps === n && __bondwork.state.settings.mute, savedE), tag + 'save persists across reload');
  const ver = await page.evaluate(() => document.getElementById('ver').textContent);
  ok(/^\d+\.\d+\.\d+$/.test(ver), tag + 'version string shown: ' + ver);

  if (shots) {
    await page.evaluate(() => { const s = __bondwork.state; s.energy = 900; s.inv.H = 200; s.inv.O = 100; });
    await page.screenshot({ path: path.join(shots, `shot-${w}x${h}.png`) });
  }
  await ctx.close();
}
await browser.close();
server?.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
