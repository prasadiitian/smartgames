// Screenshots of each small game after a little scripted play -> design/games/<slug>.png (used for listings).
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import puppeteer from 'puppeteer-core';
const root = path.resolve(import.meta.dirname, '..'), site = path.join(root, 'site');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => fs.existsSync(p));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(site, p); if (!fs.existsSync(f)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(s); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${server.address().port}/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
for (const slug of ['moonmerge', 'skyline', 'floodgate', 'lanedrift']) {
  const pg = await b.newPage(); await pg.setViewport({ width: 480, height: 640 });
  await pg.goto(base + slug + '/'); await pg.waitForFunction('window.__game'); await sleep(300);
  await pg.screenshot({ path: path.join(root, 'design/games', slug + '-help.png') }); await pg.click('#btnPlay'); await sleep(100);
  if (slug === 'moonmerge') for (let i = 0; i < 40; i++) { await pg.keyboard.press(['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp'][i % 4]); }
  if (slug === 'skyline') for (let i = 0; i < 5; i++) { await sleep(350 + i * 120); await pg.evaluate(() => window.__game.drop()); }
  if (slug === 'floodgate') await pg.evaluate(() => { for (const c of [1, 2, 3, 0, 1]) window.__game.pick(c); });
  if (slug === 'lanedrift') { for (let i = 0; i < 60; i++) { const ok = await pg.evaluate(() => { const s = window.__game.state; return !s.dead && s.obstacles.some(o => o.y > 0.35 && o.y < 0.6) && s.coins.some(c => c.y > 0.2 && c.y < 0.6); }); if (ok) break; await sleep(100); } }
  await sleep(250); await pg.screenshot({ path: path.join(root, 'design/games', slug + '.png') });
  await (await pg.$('#cv')).screenshot({ path: path.join(root, 'design/games', slug + '-board.png') }); await pg.close();
}
await b.close(); server.close();
