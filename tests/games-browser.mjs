// Headless Chrome checks for the four small games, served from site/ (so subfolder paths are tested).
// Run: node tools/build.mjs && node tools/build-games.mjs && node tests/games-browser.mjs [baseUrl]
// With a baseUrl (e.g. a live Pages URL) it checks that deployment instead of the local site/.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import puppeteer from 'puppeteer-core';

const root = path.resolve(import.meta.dirname, '..');
const site = path.join(root, 'site');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => fs.existsSync(p));
const slugs = ['moonmerge', 'skyline', 'floodgate', 'lanedrift'];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
let server = null, base = process.argv[2];
if (!base) {
  server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(site, p);
    if (!f.startsWith(site) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}/`;
}
if (!base.endsWith('/')) base += '/';

let fails = 0, total = 0;
const check = (name, ok, detail = '') => { total++; if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || !detail ? '' : ' - ' + detail)); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });

// returns number of non-background pixels on the canvas (is anything drawn?)
const painted = (page) => page.evaluate(() => {
  const cv = document.getElementById('cv'), c = cv.getContext('2d'), d = c.getImageData(0, 0, cv.width, cv.height).data;
  const seen = new Set(); for (let i = 0; i < d.length; i += 52) seen.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
  return seen.size;
});

for (const slug of slugs) {
  for (const [vw, vh] of [[360, 640], [1280, 720]]) {
    const tag = `${slug} ${vw}x${vh}`;
    const ctx = await browser.createBrowserContext();       // own storage per run
    const page = await ctx.newPage();
    await page.setViewport({ width: vw, height: vh, hasTouch: vw < 500 });
    const errs = [], reqs = [];
    page.on('pageerror', e => errs.push(String(e)));
    page.on('console', m => m.type() === 'error' && errs.push(m.text()));
    page.on('request', r => { if (!r.url().startsWith(base) && !r.url().startsWith('data:')) reqs.push(r.url()); });
    await page.goto(base + slug + '/', { waitUntil: 'load' });
    await page.waitForFunction('window.__game', { timeout: 5000 }).catch(() => {});
    check(`${tag}: loads, no console errors`, errs.length === 0 && await page.evaluate(() => !!window.__game), errs.join('; '));
    check(`${tag}: no external requests`, reqs.length === 0, reqs.join(', '));
    check(`${tag}: version string shown`, /^\d+\.\d+\.\d+$/.test(await page.$eval('#ver', e => e.textContent)));
    await sleep(300);
    check(`${tag}: How to play is shown on first run with steps and a goal`, await page.evaluate(() => !document.getElementById('help').hidden && document.querySelectorAll('#help li').length >= 3 && document.querySelector('#help .goal').textContent.length > 10));
    check(`${tag}: game is held while help is open`, await page.evaluate(() => window.__game && document.getElementById('btnPause').textContent === 'Resume'));
    await page.click('#btnPlay'); await sleep(100);
    check(`${tag}: Play closes help and starts the game`, await page.evaluate(() => document.getElementById('help').hidden && document.getElementById('btnPause').textContent === 'Pause'));
    await page.click('#btnHelp'); check(`${tag}: ? button reopens help`, await page.evaluate(() => !document.getElementById('help').hidden));
    await page.keyboard.press('Escape'); await sleep(50);
    check(`${tag}: canvas is painted`, (await painted(page)) > 4);
    const box = await page.$eval('#cv', e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; });
    check(`${tag}: canvas fits the viewport`, box.l >= 0 && box.r <= vw + 1 && box.t >= 0 && box.b <= vh + 1, JSON.stringify(box));
    const hdr = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    check(`${tag}: no horizontal scroll`, hdr);
    const btnH = await page.$$eval('button', bs => Math.min(...bs.map(b => b.getBoundingClientRect().height).filter(h => h > 0)));
    check(`${tag}: buttons at least 44px tall`, btnH >= 43.5, String(btnH));

    // game-specific play
    if (slug === 'moonmerge') {
      const before = await page.evaluate(() => window.__game.board.join());
      for (const k of ['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown']) { await page.keyboard.press(k); await sleep(30); }
      const after = await page.evaluate(() => window.__game.board.join());
      check(`${tag}: moves change the board`, before !== after);
      await page.reload({ waitUntil: 'load' }); await page.waitForFunction('window.__game');
      check(`${tag}: board persists after reload`, (await page.evaluate(() => window.__game.board.join())) === after);
    }
    if (slug === 'skyline') {
      await page.mouse.click(box.l + 40, box.t + 100); await sleep(200);
      const dead = await page.$eval('#over', e => !e.hidden);
      const floors = await page.evaluate(() => window.__game.floors);
      check(`${tag}: a drop either stacks a floor or ends the game`, dead || floors >= 1);
      if (dead) { await page.click('#again'); check(`${tag}: restart works`, await page.$eval('#over', e => e.hidden)); }
    }
    if (slug === 'floodgate') {
      await page.evaluate(() => { const g = window.__game; for (let c = 0; c < 4; c++) g.pick(c); });
      const m = await page.evaluate(() => window.__game.moves);
      check(`${tag}: picking colours spends moves`, m >= 1);
      if (vw >= 1000) { // click a palette swatch with the mouse
        const m0 = await page.evaluate(() => window.__game.moves);
        const g0 = await page.evaluate(() => window.__game.grid[0]);
        const target = (g0 + 1) % 4;
        const cw = (360 - 20) / 4; const px = box.l + (10 + target * cw + cw / 2) / 360 * (box.r - box.l), py = box.t + (372 + 22) / 476 * (box.b - box.t);
        await page.mouse.click(px, py); await sleep(100);
        check(`${tag}: palette click works`, (await page.evaluate(() => window.__game.moves)) === m0 + 1 || await page.$eval('#over', e => !e.hidden));
      }
    }
    if (slug === 'lanedrift') {
      await page.keyboard.press('ArrowLeft'); await sleep(50);
      check(`${tag}: arrow key changes lane`, (await page.evaluate(() => window.__game.state.lane)) === 0);
      await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await sleep(50);
      check(`${tag}: lane clamps at the edge`, (await page.evaluate(() => window.__game.state.lane)) === 2);
      await sleep(1200);
      check(`${tag}: the road scrolls (score grows or crash screen shown)`, (await page.evaluate(() => window.__game.state.dist)) > 0);
    }

    // pause / mute
    await page.click('#btnMute'); const m1 = await page.$eval('#btnMute', e => e.textContent);
    check(`${tag}: mute toggles`, /off/i.test(m1));
    await page.click('#btnPause'); check(`${tag}: pause toggles`, /resume/i.test(await page.$eval('#btnPause', e => e.textContent)));
    await page.reload({ waitUntil: 'load' }); await page.waitForFunction('window.__game');
    check(`${tag}: help is not shown again after the first run`, await page.evaluate(() => document.getElementById('help').hidden));
    check(`${tag}: mute preference persists`, /off/i.test(await page.$eval('#btnMute', e => e.textContent)));
    check(`${tag}: still no console errors after reload`, errs.length === 0, errs.join('; '));
    await ctx.close();
  }
}
await browser.close(); server?.close();
console.log(`\n${total - fails}/${total} browser checks passed`);
process.exit(fails ? 1 : 0);
