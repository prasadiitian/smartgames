// Generates gameplay screenshots and cover images into deploy/listing/. Needs Chrome/Edge installed.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import puppeteer from 'puppeteer-core';
import { run } from '../tests/sim.mjs';
import { serialize } from '../src/engine.js';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'deploy', 'listing');
const dir = path.join(root, 'dist');
fs.mkdirSync(path.join(out, 'covers'), { recursive: true });
fs.mkdirSync(path.join(out, 'screenshots'), { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => fs.existsSync(p));

const sim = run(14);
const st = sim.state; st.lastSave = Date.now(); st.seen.tips = 3; st.seen.help = 1;
const save = serialize(st);

const server = http.createServer((req, res) => {
  const f = path.join(dir, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  const ext = path.extname(f);
  res.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[ext] || 'text/plain' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });

async function shot(name, w, h, tab, mobile) {
  const ctx = await browser.createBrowserContext(); const page = await ctx.newPage();
  await page.setViewport({ width: w, height: h, isMobile: mobile, hasTouch: mobile });
  await page.evaluateOnNewDocument((s) => { try { localStorage.setItem('bondwork.save', s); } catch (e) {} }, save);
  await page.goto(base); await page.waitForFunction('window.__bondwork');
  await page.evaluate(() => { __bondwork.state.evTimer = 1000; });
  if (tab !== 'lab') await page.click(`#tabs button[data-tab=${tab}]`);
  // spawn some visible particles
  for (let i = 0; i < 6; i++) { await page.click('#btnTap').catch(() => {}); await new Promise(r => setTimeout(r, 120)); }
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(out, 'screenshots', name) });
  await ctx.close();
}
await shot('01-lab-desktop.png', 1280, 720, 'lab', false);
await shot('02-lab-phone-portrait.png', 360, 640, 'lab', true);
await shot('03-build-phone.png', 360, 640, 'build', true);
await shot('04-codex-tablet.png', 768, 1024, 'codex', true);
await shot('05-phase-desktop.png', 1280, 720, 'more', false);

// Covers: original artwork drawn in SVG (atoms as coloured circles with bond lines).
const atom = (x, y, r, c, l) => `<line x1="0" y1="0" x2="0" y2="0"/><circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="#0b0f16" stroke-width="${r / 10}"/><text x="${x}" y="${y + r * 0.32}" text-anchor="middle" font-size="${r * 0.9}" font-weight="700" fill="#000" font-family="Segoe UI,Arial">${l}</text>`;
const bond = (x1, y1, x2, y2, w) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#dfe6f2" stroke-width="${w}" stroke-linecap="round"/>`;
function coverHTML(w, h) {
  const u = Math.min(w, h * 1.25) / 100; // unit
  const cx = w * 0.5, cy = h * 0.42, R = 7 * u;
  const water = (x, y, s) => bond(x, y, x - 11 * s, y + 9 * s, 1.6 * s) + bond(x, y, x + 11 * s, y + 9 * s, 1.6 * s) + atom(x - 11 * s, y + 9 * s, 6 * s, '#56B4E9', 'H') + atom(x + 11 * s, y + 9 * s, 6 * s, '#56B4E9', 'H') + atom(x, y, 8.5 * s, '#D55E00', 'O');
  const methane = (x, y, s) => [[-12, -9], [12, -9], [-12, 10], [12, 10]].map(([dx, dy]) => bond(x, y, x + dx * s, y + dy * s, 1.6 * s)).join('') + [[-12, -9], [12, -9], [-12, 10], [12, 10]].map(([dx, dy]) => atom(x + dx * s, y + dy * s, 5.5 * s, '#56B4E9', 'H')).join('') + atom(x, y, 8 * s, '#999999', 'C');
  const co2 = (x, y, s) => bond(x - 14 * s, y, x + 14 * s, y, 1.8 * s) + atom(x - 14 * s, y, 7.5 * s, '#D55E00', 'O') + atom(x + 14 * s, y, 7.5 * s, '#D55E00', 'O') + atom(x, y, 7.5 * s, '#999999', 'C');
  const u2 = u * (w > h * 1.5 ? 1.15 : 1);
  return `<!doctype html><meta charset=utf-8><body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:radial-gradient(circle at 30% 20%,#27364f,#0e131c 70%);font-family:'Segoe UI',Arial,sans-serif">
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="position:absolute;inset:0">
${water(w * 0.2, h * 0.24, u2 * 1.2)}${methane(w * 0.82, h * 0.26, u2 * 1.1)}${co2(w * 0.84, h * 0.87, u2 * 0.8)}${water(w * 0.12, h * 0.86, u2 * 0.7)}
</svg>
<div style="position:absolute;left:0;right:0;top:${h * 0.34}px;text-align:center;color:#ffd166;font-weight:800;font-size:${Math.min(w * 0.17, h * 0.27)}px;letter-spacing:.02em;text-shadow:0 4px 0 #6b4a00,0 8px 24px rgba(0,0,0,.6)">Bondwork</div>
<div style="position:absolute;left:0;right:0;top:${h * 0.34 + Math.min(w * 0.17, h * 0.27) * 1.2}px;text-align:center;color:#eef2f8;font-size:${Math.min(w * 0.055, h * 0.075)}px;font-weight:600">Balance reactions. Build matter.</div></body>`;
}
for (const [w, h] of [[315, 250], [630, 500], [1280, 720]]) {
  const page = await browser.newPage(); await page.setViewport({ width: w, height: h });
  await page.setContent(coverHTML(w, h));
  await page.screenshot({ path: path.join(out, 'covers', `cover-${w}x${h}.png`) });
  await page.close();
}
await browser.close(); server.close();
console.log('media written to deploy/listing');
