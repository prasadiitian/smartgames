// Verifies the public itch.io pages: page loads, "Run game" starts the embedded build, no console errors in the game frame, version shown.
import puppeteer from 'puppeteer-core';
const user = 'prasady', slugs = { bondwork: ['__bondwork', 'Bondwork'], moonmerge: ['__game', 'Moonmerge'], skyline: ['__game', 'Skyline'], floodgate: ['__game', 'Floodgate'], lanedrift: ['__game', 'Lane'] };
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] });
for (const [slug, [probe, word]] of Object.entries(slugs)) {
  const pg = await (await b.createBrowserContext()).newPage(); await pg.setViewport({ width: 1100, height: 900 });
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  pg.on('console', m => m.type() === 'error' && !/itch|google|doubleclick|analytics|favicon|Failed to load resource/i.test(m.text()) && errs.push(m.text()));
  const o = { slug };
  try {
    await pg.goto(`https://${user}.itch.io/${slug}`, { waitUntil: 'networkidle2', timeout: 45000 });
    o.title = (await pg.title()).slice(0, 50);
    await pg.mouse.click(553, 260);   // the "Run game" button in the default 640x480 embed
    let frame = null;
    for (let i = 0; i < 40 && !frame; i++) { await new Promise(r => setTimeout(r, 500)); frame = pg.frames().find(f => f !== pg.mainFrame()); }
    o.runButton = true;
    o.frame = !!frame;
    if (frame) {
      await frame.waitForFunction(`window.${probe}`, { timeout: 20000 }).then(() => { o.gameLoaded = true; }).catch(() => { o.gameLoaded = false; });
      o.version = await frame.$eval('#ver', e => e.textContent).catch(() => null);
      o.helpCard = await frame.evaluate(() => { const h = document.getElementById('help') || document.getElementById('modal'); return !!h && !h.hidden; }).catch(() => null);
    }
    await new Promise(r => setTimeout(r, 800));
    await pg.screenshot({ path: `design/itch/${slug}.png` });
  } catch (e) { o.error = String(e).slice(0, 120); }
  o.errors = errs.slice(0, 3); console.log(JSON.stringify(o)); await pg.close();
}
await b.close();
