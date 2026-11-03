// Pre-flight checks (deployment rule 5). Writes deploy/PRE-FLIGHT.md. Exit code 1 if any check fails.
// Run `node tools/build.mjs` first so dist/ and the zip are current.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execSync, spawnSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import { VERSION } from '../src/data.js';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const rows = [];
const check = (name, okv, detail = '') => { rows.push({ name, ok: !!okv, detail }); console.log((okv ? 'PASS ' : 'FAIL ') + name + (detail ? ' - ' + detail : '')); };
const sh = (cmd) => spawnSync(cmd, { shell: true, cwd: root, encoding: 'utf8' });

// 1. tests
let r = sh('node tests/run.mjs'); check('Unit + economy tests', r.status === 0, (r.stdout.trim().split('\n').pop()));
r = sh('node tests/browser.mjs dist'); check('Browser tests on dist (3 viewports, console, network, layout)', r.status === 0, (r.stdout.trim().split('\n').pop()));

// 2. size
let bytes = 0;
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); f.isDirectory() ? walk(p) : (bytes += fs.statSync(p).size); } })(dist);
check('Build under 2 MB', bytes < 2 * 1024 * 1024, bytes + ' bytes');

// 3. zip structure + version
const zips = fs.readdirSync(path.join(root, 'deploy/builds')).filter(f => f.endsWith('.zip') && f.includes('v' + VERSION));
const zip = zips.sort().pop();
let names = [];
if (zip) { const o = sh(`python -c "import zipfile,sys;print('\\n'.join(zipfile.ZipFile(sys.argv[1]).namelist()))" "deploy/builds/${zip}"`); names = o.stdout.trim().split(/\r?\n/); }
check('index.html at root of zip', names.includes('index.html'), zip || 'no zip');
check('No backslash paths in zip', !names.some(n => n.includes('\\')));

// 4. static scans: external URLs, debug code, secrets
const textFiles = fs.readdirSync(dist).map(f => path.join(dist, f));
const ext = [], dbg = [];
for (const f of textFiles) {
  const t = fs.readFileSync(f, 'utf8');
  for (const m of t.matchAll(/https?:\/\/[^\s"'`)<>]+/g)) if (!/^https?:\/\/(www\.w3\.org)/.test(m[0]) && !/bridge\.playgama|crazygames|poki/.test(m[0]) ) ext.push(path.basename(f) + ': ' + m[0]);
  if (/console\.(log|debug)|debugger|TODO|FIXME/.test(t)) dbg.push(path.basename(f));
}
check('No external URLs in build (comments naming future SDKs excluded)', ext.length === 0, ext.join('; '));
check('No leftover debug code (console.log/debugger/TODO)', dbg.length === 0, dbg.join(', '));
const secretRe = '(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|api[_-]?key\\s*[:=]\\s*[\'"][^\'"]{8,}|password\\s*[:=]\\s*[\'"][^\'"]{4,})';
const wt = sh(`git grep -nIE "${secretRe}" -- . ":!package-lock.json"`);
const hist = sh(`git log -p --all -G "${secretRe}" --oneline`);
check('No secrets in working tree', wt.status !== 0 && !wt.stdout.trim(), wt.stdout.trim().slice(0, 200));
check('No secrets in git history', !hist.stdout.trim(), hist.stdout.trim().slice(0, 200));

// 5. subfolder path + throttled load
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/game\/v1\//, '');
  let f = path.join(dist, rel === '' ? 'index.html' : rel);
  if (!req.url.startsWith('/game/v1/') || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(f)] || 'text/plain' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
const cdp = await page.createCDPSession();
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200 * 1024, uploadThroughput: 100 * 1024 }); // ~1.6 Mbit "slow 3G+"
const t0 = Date.now();
await page.goto(`http://127.0.0.1:${server.address().port}/game/v1/`, { waitUntil: 'load' });
await page.waitForFunction('window.__bondwork');
const ms = Date.now() - t0;
check('Works from a subfolder (relative paths)', errs.length === 0 && await page.evaluate(() => !!window.__bondwork), errs.join('; '));
check('Loads in under 3 s on throttled connection', ms < 3000, ms + ' ms');
const live = await page.evaluate(() => document.getElementById('ver').textContent);
check('Version string matches package (' + VERSION + ')', live === VERSION, live);
await browser.close(); server.close();

// 6. licences
check('Only original assets; no third-party runtime libraries', fs.existsSync(path.join(root, 'LICENSES.md')), 'see LICENSES.md');

const md = `# PRE-FLIGHT\n\nRun: ${new Date().toISOString()}  \nVersion: ${VERSION}\n\n| Result | Check | Detail |\n|---|---|---|\n` + rows.map(x => `| ${x.ok ? 'PASS' : 'FAIL'} | ${x.name} | ${String(x.detail).replace(/\|/g, '/')} |`).join('\n') + '\n';
fs.writeFileSync(path.join(root, 'deploy/PRE-FLIGHT.md'), md);
process.exit(rows.every(x => x.ok) ? 0 : 1);
