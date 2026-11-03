// Fun audit: drives a scripted player to 0s/30s/2m/10m/30m, injects that state in the real page and screenshots it.
// Usage: node tools/audit.mjs <tag> [dist-dir]   -> design/audit/<tag>/*.png and timeline.json
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import puppeteer from 'puppeteer-core';
import { run } from '../tests/sim.mjs';
import { serialize } from '../src/engine.js';

const tag = process.argv[2] || 'before';
const root = path.resolve(import.meta.dirname, '..');
const dir = path.resolve(process.argv[3] || path.join(root, 'dist'));
const out = path.join(root, 'design', 'audit', tag);
fs.mkdirSync(out, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => fs.existsSync(p));
const server = http.createServer((req, res) => {
  const f = path.join(dir, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
const marks = [['0s', 0], ['30s', 0.5], ['2min', 2], ['10min', 10], ['30min', 30]];
const timeline = {};
for (const [name, min] of marks) {
  const r = run(Math.max(min, 0.01), {});
  const s = r.state; s.lastSave = Date.now(); s.seen.tips = 3;
  timeline[name] = { purchases: r.log.length, firstPurchases: r.log.slice(0, 12).map(x => x.t.toFixed(0) + 's ' + x.name), runEnergy: s.runEnergy };
  for (const [vw, vh, mob] of [[360, 640, true], [1280, 720, false]]) {
    const ctx = await browser.createBrowserContext(); const page = await ctx.newPage();
    await page.setViewport({ width: vw, height: vh, isMobile: mob, hasTouch: mob });
    await page.evaluateOnNewDocument((j) => { try { localStorage.setItem('bondwork.save', j); } catch (e) {} }, serialize(s));
    await page.goto(base); await page.waitForFunction('window.__bondwork');
    await page.evaluate(() => { const s = __bondwork.state; s.evTimer = 1e6; if (s.rareTimer) s.rareTimer = 1e6; });
    await new Promise(r => setTimeout(r, 2500)); // let the scene animate with real time
    await page.screenshot({ path: path.join(out, `${name}-${vw}x${vh}.png`) });
    await ctx.close();
  }
}
// timeline: purchase gaps in first 3 minutes
const r3 = run(3);
const ts = r3.log.map(x => x.t);
let maxGap = 0; for (let i = 1; i < ts.length; i++) maxGap = Math.max(maxGap, ts[i] - ts[i - 1]);
const per10 = []; for (let w = 0; w < 18; w++) per10.push(ts.filter(t => t >= w * 10 && t < (w + 1) * 10).length);
timeline.first3min = { purchasesPer10s: per10, longestGapBetweenPurchases: +maxGap.toFixed(1) };
fs.writeFileSync(path.join(out, 'timeline.json'), JSON.stringify(timeline, null, 1));
console.log(JSON.stringify(timeline.first3min), '\n', JSON.stringify(timeline['2min'].firstPurchases));
await browser.close(); server.close();
