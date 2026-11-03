// Builds the four small games into dist-games/<slug>/, zips each into deploy/builds/, and assembles site/
// (a portal index plus every game, Bondwork included) for GitHub Pages. Run `node tools/build.mjs` first for Bondwork.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const gamesDir = path.join(root, 'games');
const out = path.join(root, 'dist-games');
const site = path.join(root, 'site');
const date = new Date().toISOString().slice(0, 10);
export const slugs = fs.readdirSync(gamesDir).filter(d => fs.existsSync(path.join(gamesDir, d, 'game.json')));
const tpl = fs.readFileSync(path.join(gamesDir, '_shared', 'page.tpl.html'), 'utf8');
const fill = (s, m) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(m[k] ?? ''));

fs.rmSync(out, { recursive: true, force: true });
fs.rmSync(site, { recursive: true, force: true });
const metas = [];
for (const slug of slugs) {
  const meta = JSON.parse(fs.readFileSync(path.join(gamesDir, slug, 'game.json'), 'utf8'));
  metas.push(meta);
  const d = path.join(out, slug);
  fs.mkdirSync(d, { recursive: true });
  for (const f of ['kit.js', 'kit.css', 'platform.js']) fs.copyFileSync(path.join(gamesDir, '_shared', f), path.join(d, f));
  fs.cpSync(path.join(gamesDir, slug, 'src'), d, { recursive: true });
  fs.writeFileSync(path.join(d, 'index.html'), fill(tpl, meta));
  let bytes = 0;
  for (const f of fs.readdirSync(d)) bytes += fs.statSync(path.join(d, f)).size;
  if (bytes > 2 * 1024 * 1024) throw new Error(slug + ' too large');
  const zip = path.join(root, 'deploy', 'builds', `${slug}-v${meta.version}-${date}.zip`);
  fs.mkdirSync(path.dirname(zip), { recursive: true });
  fs.rmSync(zip, { force: true });
  if (process.platform === 'win32') execFileSync('powershell', ['-NoProfile', '-Command', `Add-Type -A System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory('${d}', '${zip}', 'Optimal', $false)`], { stdio: 'inherit' });
  else execFileSync('zip', ['-r', zip, '.'], { cwd: d, stdio: 'inherit' });
  console.log(`built ${path.relative(root, zip)} (${bytes} bytes)`);
}

// Portal site: one repo, one Pages deploy, five games.
const bondDist = path.join(root, 'dist');
const all = [{ slug: 'bondwork', title: 'Bondwork', tagline: 'A free idle game about building matter: balance reactions, bond molecules, phase-change.' }, ...metas];
fs.mkdirSync(site, { recursive: true });
if (fs.existsSync(bondDist)) fs.cpSync(bondDist, path.join(site, 'bondwork'), { recursive: true });
for (const slug of slugs) fs.cpSync(path.join(out, slug), path.join(site, slug), { recursive: true });
const cards = all.map(g => `<a class="card" href="${g.slug}/"><h2>${g.title}</h2><p>${g.tagline}</p></a>`).join('\n');
fs.writeFileSync(path.join(site, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Smartgames</title><meta name="description" content="Five small free browser games: no ads, no tracking, no sign-up.">
<style>:root{color-scheme:dark}body{margin:0;background:#10141c;color:#eef2f8;font:16px/1.45 system-ui,sans-serif}main{max-width:720px;margin:0 auto;padding:24px 16px}h1{margin:0 0 4px}p.s{color:#9aa7bd;margin-top:0}.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}.card{display:block;background:#1b2230;border:2px solid #2d3850;border-radius:14px;padding:14px 16px;color:inherit;text-decoration:none;min-height:44px}.card:hover,.card:focus{border-color:#ffd166}.card h2{margin:0 0 4px;font-size:19px}.card p{margin:0;color:#9aa7bd;font-size:14px}</style></head>
<body><main><h1>Smartgames</h1><p class="s">Five small free browser games. No ads, no tracking, no sign-up. Progress saves on your device.</p>
<div class="grid">
${cards}
</div></main></body></html>
`);
fs.writeFileSync(path.join(site, '.nojekyll'), '');
console.log('site assembled:', ['index.html', ...all.map(g => g.slug + '/')].join(', '));
