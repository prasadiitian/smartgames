// Pre-flight for the four small games + the combined site (deployment rule 5). Writes deploy/PRE-FLIGHT-GAMES.md.
// Run `node tools/build.mjs && node tools/build-games.mjs` first.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const gamesDir = path.join(root, 'games'), out = path.join(root, 'dist-games'), builds = path.join(root, 'deploy/builds');
const slugs = fs.readdirSync(gamesDir).filter(d => fs.existsSync(path.join(gamesDir, d, 'game.json')));
const rows = [];
const check = (name, ok, detail = '') => { rows.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' - ' + detail : '')); };
const sh = (cmd) => spawnSync(cmd, { shell: true, cwd: root, encoding: 'utf8' });
const last = (r) => r.stdout.trim().split('\n').pop();

let r = sh('node tests/games.mjs'); check('Game logic tests', r.status === 0, last(r));
r = sh('node tests/games-browser.mjs'); check('Browser tests (2 viewports each, console, network, layout, persistence)', r.status === 0, last(r));
const secretRe = '(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|api[_-]?key\\s*[:=]\\s*[\'"][^\'"]{8,}|password\\s*[:=]\\s*[\'"][^\'"]{4,})';
const gitOk = sh('git rev-parse --is-inside-work-tree').status === 0;
if (gitOk) { const wt = sh(`git grep -nIE "${secretRe}" -- . ":!package-lock.json"`); check('No secrets in working tree', wt.status !== 0 && !wt.stdout.trim(), wt.stdout.slice(0, 200)); }

for (const slug of slugs) {
  const meta = JSON.parse(fs.readFileSync(path.join(gamesDir, slug, 'game.json'), 'utf8'));
  const d = path.join(out, slug);
  let bytes = 0; const ext = [], dbg = [];
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f); bytes += fs.statSync(p).size;
    const t = fs.readFileSync(p, 'utf8');
    for (const m of t.matchAll(/https?:\/\/[^\s"'`)<>]+/g)) if (!/^https?:\/\/(www\.w3\.org)/.test(m[0]) && !/bridge\.playgama|crazygames|poki/.test(m[0])) ext.push(f + ': ' + m[0]);
    if (/console\.(log|debug)|debugger|TODO|FIXME/.test(t)) dbg.push(f);
  }
  check(`${slug}: under 2 MB`, bytes < 2 * 1024 * 1024, bytes + ' bytes');
  check(`${slug}: no external URLs`, ext.length === 0, ext.join('; '));
  check(`${slug}: no leftover debug code`, dbg.length === 0, dbg.join(', '));
  const zip = fs.readdirSync(builds).filter(f => f.startsWith(`${slug}-v${meta.version}-`) && f.endsWith('.zip')).sort().pop();
  let names = [];
  if (zip) names = sh(`python -c "import zipfile,sys;print('\\n'.join(zipfile.ZipFile(sys.argv[1]).namelist()))" "deploy/builds/${zip}"`).stdout.trim().split(/\r?\n/);
  check(`${slug}: zip has index.html at root, no backslash paths`, names.includes('index.html') && !names.some(n => n.includes('\\')), zip || 'no zip');
  const html = fs.readFileSync(path.join(d, 'index.html'), 'utf8');
  check(`${slug}: version ${meta.version} in page matches game.json`, html.includes(`<span id="ver">${meta.version}</span>`));
}
check('Only original assets; no third-party runtime libraries', fs.existsSync(path.join(root, 'LICENSES.md')), 'see LICENSES.md');

const md = `# PRE-FLIGHT (small games)\n\nRun: ${new Date().toISOString()}  \nGames: ${slugs.join(', ')}\n\n| Result | Check | Detail |\n|---|---|---|\n` + rows.map(x => `| ${x.ok ? 'PASS' : 'FAIL'} | ${x.name} | ${String(x.detail).replace(/\|/g, '/')} |`).join('\n') + '\n';
fs.writeFileSync(path.join(root, 'deploy/PRE-FLIGHT-GAMES.md'), md);
process.exit(rows.every(x => x.ok) ? 0 : 1);
