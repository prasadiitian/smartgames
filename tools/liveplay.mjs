// Plays the first minute through the real UI in headless Chrome and screenshots it. Usage: node tools/liveplay.mjs <tag>
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import puppeteer from 'puppeteer-core';
const tag = process.argv[2] || 'live';
const root = path.resolve(import.meta.dirname, '..'), dir = path.join(root, 'dist'), out = path.join(root, 'design', 'audit', tag);
fs.mkdirSync(out, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => fs.existsSync(p));
const server = http.createServer((req, res) => { const f = path.join(dir, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage(); await page.setViewport({ width: 390, height: 780, isMobile: true, hasTouch: true });
const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
await page.goto(`http://127.0.0.1:${server.address().port}/`); await page.waitForFunction('window.__bondwork'); await page.waitForSelector('#helpOk', { timeout: 3000 }).then(() => page.click('#helpOk')).catch(() => {});
const marks = [4, 10, 20, 30, 42, 50]; const t0 = Date.now(); const log = []; let mi = 0;
while ((Date.now() - t0) / 1000 < 52) {
  await page.evaluate(() => {
    const need = document.querySelector('#atomPick button.need'); if (need) need.click();
    document.getElementById('btnTap').click();
    const s = __bondwork.state;
    // follow the goals: build the next reactor when affordable, otherwise cheapest upgrade
    const rx = [...document.querySelectorAll('#reactors .rx:not([hidden]) > .hd > button')].find(b => /^Build/.test(b.textContent) && !b.disabled);
    if (rx) return rx.click();
    const nextRx = [...document.querySelectorAll('#reactors .rx:not([hidden]) > .hd > button')].find(b => /^Build/.test(b.textContent));
    const target = nextRx ? parseFloat(nextRx.textContent.replace('Build ', '')) : 1e9;
    const can = [...document.querySelectorAll('#upgs .item button.can, #gens .item button.can')].filter(b => target > 150 || parseFloat(b.textContent) <= 12);
    if (can.length) can[0].click();
    // set dials to the balanced ratio like a thoughtful player
    for (const id of ['H2O']) { const st = s.reactors[id]; if (st.owned && st.dials.H2 !== 2) { const btn = document.querySelectorAll('#reactors .rx')[2]; const plus = btn && [...btn.querySelectorAll('.dial')][0]?.querySelectorAll('button')[1]; plus && plus.click(); } }
    const r = document.querySelector('#reveal:not([hidden]) button'); if (r && Math.random() < 0.3) r.click();
  });
  const el = (Date.now() - t0) / 1000;
  if (mi < marks.length && el >= marks[mi]) { await page.screenshot({ path: path.join(out, `t${marks[mi]}s.png`) }); mi++; }
  await new Promise(r => setTimeout(r, 330));
}
const st = await page.evaluate(() => { const s = __bondwork.state; return { energy: s.energy, disc: Object.keys(s.disc), goals: Object.keys(s.goalsDone).length, ach: Object.keys(s.ach), rare: s.stats.rare, perfect: s.stats.perfectEver, molecules: __bondwork.scene.total() }; });
console.log(JSON.stringify(st), 'errors:', errs.length, errs.slice(0, 2));
await browser.close(); server.close();
