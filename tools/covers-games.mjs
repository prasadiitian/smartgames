// Covers (630x500, 315x250, 1280x720) and extra screenshots for the four small games -> deploy/listing/<slug>/.
import fs from 'node:fs'; import path from 'node:path'; import puppeteer from 'puppeteer-core';
const root = path.resolve(import.meta.dirname, '..');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => fs.existsSync(p));
const slugs = fs.readdirSync(path.join(root, 'games')).filter(d => fs.existsSync(path.join(root, 'games', d, 'game.json')));
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
const data = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
for (const slug of slugs) {
  const m = JSON.parse(fs.readFileSync(path.join(root, 'games', slug, 'game.json'), 'utf8'));
  const dir = path.join(root, 'deploy/listing', slug), shots = path.join(root, 'design/games');
  fs.mkdirSync(dir, { recursive: true });
  const board = data(path.join(shots, slug + '-board.png'));
  for (const [w, h] of [[630, 500], [315, 250], [1280, 720]]) {
    const k = h / 500, wide = w / h > 1.5;
    const html = `<!doctype html><meta charset=utf-8><style>
      *{box-sizing:border-box;margin:0}body{width:${w}px;height:${h}px;overflow:hidden;font-family:Inter,system-ui,"Segoe UI",sans-serif;color:#f4f6fb;display:flex;align-items:center;justify-content:${wide ? 'space-around' : 'center'};gap:${28 * k}px;padding:0 ${30 * k}px;
      background:radial-gradient(${w}px ${h}px at 20% 0%,color-mix(in srgb,${m.accent} 38%,transparent),transparent 70%),radial-gradient(${w}px ${h}px at 100% 100%,color-mix(in srgb,${m.accent} 18%,transparent),transparent 65%),linear-gradient(160deg,#141b2b,#090c13)}
      .tx{max-width:${wide ? 520 : 270 * k * 1.2}px}.eb{font-weight:800;letter-spacing:.18em;font-size:${13 * k * (wide ? 1.5 : 1)}px;color:${m.accent};text-transform:uppercase}
      h1{font-size:${(wide ? 84 : 52) * k * (wide ? 1 : 1.0)}px;line-height:1;letter-spacing:-.03em;font-weight:800;margin:${8 * k}px 0 ${12 * k}px}
      p{font-size:${(wide ? 24 : 17) * k * (wide ? 1 : 1)}px;line-height:1.35;color:#b9c3d8;font-weight:500}
      .pill{display:inline-block;margin-top:${16 * k}px;background:${m.accent};color:#14161c;font-weight:800;padding:${9 * k}px ${20 * k}px;border-radius:${14 * k}px;font-size:${16 * k * (wide ? 1.4 : 1)}px;box-shadow:0 8px 24px color-mix(in srgb,${m.accent} 40%,transparent)}
      img{height:${h * 0.84}px;max-width:${w * (wide ? 0.34 : 0.42)}px;object-fit:contain;border-radius:${22 * k}px;box-shadow:0 0 0 ${3 * k}px rgba(255,255,255,.1),0 ${20 * k}px ${50 * k}px rgba(0,0,0,.6),0 0 ${60 * k}px color-mix(in srgb,${m.accent} 30%,transparent);transform:rotate(3deg)}
      </style><div class=tx><div class=eb>${m.genre}</div><h1>${m.title}</h1><p>${m.cover || m.tagline.split('. ')[0].replace(/\.$/, '')}</p><span class=pill>Play free</span></div><img src="${board}">`;
    const pg = await b.newPage(); await pg.setViewport({ width: w, height: h }); await pg.setContent(html, { waitUntil: 'load' });
    await pg.screenshot({ path: path.join(dir, `cover-${w}x${h}.png`) }); await pg.close();
  }
  for (const [src, dst] of [[slug + '.png', '01-gameplay.png'], [slug + '-help.png', '02-how-to-play.png'], [slug + '-board.png', '03-board.png']]) fs.copyFileSync(path.join(shots, src), path.join(dir, dst));
  fs.rmSync(path.join(dir, 'screenshot-480x640.png'), { force: true });
}
await b.close(); console.log('covers and screenshots written');
