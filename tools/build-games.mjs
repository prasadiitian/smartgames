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
  const stepsHtml = meta.steps.map(s => `<li>${s}</li>`).join('');
  fs.writeFileSync(path.join(d, 'index.html'), fill(tpl, { ...meta, stepsHtml, initial: meta.title[0] }));
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
fs.mkdirSync(path.join(site, 'thumbs'), { recursive: true });
const thumbSrc = { bondwork: path.join(root, 'deploy/listing/covers/cover-630x500.png') };
for (const g of all) { const src = thumbSrc[g.slug] || path.join(root, 'design/games', g.slug + '-board.png'); if (fs.existsSync(src)) fs.copyFileSync(src, path.join(site, 'thumbs', g.slug + '.png')); }
const accents = { bondwork: '#ffd166' };
const kinds = { bondwork: 'Idle', moonmerge: 'Puzzle', skyline: 'Arcade', floodgate: 'Puzzle', lanedrift: 'Arcade' };
const cards = all.map(g => `<a class="card" href="${g.slug}/" style="--a:${g.accent || accents[g.slug]}"><div class="th"><img src="thumbs/${g.slug}.png" alt="" loading="lazy"></div><div class="tx"><span class="k">${kinds[g.slug]}</span><h2>${g.title}</h2><p>${g.tagline}</p><span class="play">Play now</span></div></a>`).join('\n');
fs.writeFileSync(path.join(site, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#0a0d14"><title>Smartgames</title><meta name="description" content="Five small free browser games: no ads, no tracking, no sign-up.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23ffd166'/%3E%3Ccircle cx='16' cy='16' r='6' fill='%2314161c'/%3E%3C/svg%3E">
<style>
:root{color-scheme:dark;--font:Inter,"SF Pro Display",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;color:#f4f6fb;font:500 16px/1.5 var(--font);-webkit-font-smoothing:antialiased;
 background:radial-gradient(900px 480px at 50% -10%,rgba(255,209,102,.18),transparent 70%),radial-gradient(700px 400px at 100% 100%,rgba(86,180,233,.12),transparent 70%),linear-gradient(180deg,#10151f,#0a0d14)}
main{max-width:980px;margin:0 auto;padding:44px 18px 60px}
.hero{text-align:center;margin-bottom:34px}
.hero .eb{font-size:12px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#ffd166}
.hero h1{margin:6px 0 8px;font-size:clamp(34px,6vw,54px);font-weight:800;letter-spacing:-.03em;line-height:1.05}
.hero p{margin:0 auto;max-width:520px;color:#9fabc2}
.pills{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:16px}
.pills span{font-size:12px;font-weight:700;padding:5px 12px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#cfd6e6}
.grid{display:grid;gap:18px;grid-template-columns:repeat(auto-fill,minmax(270px,1fr))}
.card{display:flex;flex-direction:column;border-radius:22px;overflow:hidden;color:inherit;text-decoration:none;background:linear-gradient(180deg,rgba(38,47,68,.7),rgba(20,26,40,.8));border:1px solid rgba(255,255,255,.1);
 box-shadow:0 14px 40px rgba(0,0,0,.45);transition:transform .2s,border-color .2s,box-shadow .2s}
.card:hover,.card:focus-visible{transform:translateY(-5px);border-color:var(--a);box-shadow:0 22px 50px rgba(0,0,0,.55),0 0 40px color-mix(in srgb,var(--a) 25%,transparent);outline:none}
.th{aspect-ratio:4/3;overflow:hidden;background:#0b0f16;position:relative}
.th img{width:100%;height:100%;object-fit:cover;object-position:center;display:block;transition:transform .35s}
.th::after{content:"";position:absolute;inset:auto 0 0 0;height:40%;background:linear-gradient(transparent,rgba(20,26,40,.95))}
.card:hover .th img{transform:scale(1.05)}
.tx{padding:14px 18px 18px;display:flex;flex-direction:column;gap:2px;flex:1}
.k{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--a)}
.card h2{margin:0;font-size:22px;font-weight:800;letter-spacing:-.01em}
.card p{margin:2px 0 12px;color:#9fabc2;font-size:14px;flex:1}
.play{align-self:flex-start;font-weight:800;font-size:14px;color:#14161c;background:var(--a);padding:9px 18px;border-radius:12px;box-shadow:0 6px 18px color-mix(in srgb,var(--a) 35%,transparent)}
footer{text-align:center;color:#6f7b92;font-size:12px;margin-top:40px}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style></head>
<body><main>
<div class="hero"><div class="eb">Free browser games</div><h1>Smartgames</h1><p>Five small, original games you can play in a minute. Nothing to install, nothing to sign up for.</p>
<div class="pills"><span>No ads</span><span>No tracking</span><span>Phone &amp; desktop</span><span>Saves on your device</span></div></div>
<div class="grid">
${cards}
</div>
<footer>Original games · progress is stored only in your browser</footer>
</main></body></html>
`);
fs.writeFileSync(path.join(site, '.nojekyll'), '');
console.log('site assembled:', ['index.html', ...all.map(g => g.slug + '/')].join(', '));
