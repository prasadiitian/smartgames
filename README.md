# Bondwork

A free HTML5 idle game about building matter. Plain JavaScript (ES modules), no dependencies, no network calls. The whole game is under 100 KB.

## Run
- Play: open `dist/index.html` through any static server (ES modules need http, not file://), e.g. `npx serve dist` or `python -m http.server -d dist`.
- Develop: edit `src/`, then `node tools/build.mjs` copies it to `dist/` and writes the zip into `deploy/builds/`.
- Test: `node tests/run.mjs` (unit + economy simulation), `node tests/fun.mjs` (fun-pass mechanics and first-minute pacing), `node tests/browser.mjs` (headless Chrome/Edge at 360x640, 768x1024, 1280x720). Run `npm install` once for the browser tests.
- Pre-flight: `node tools/preflight.mjs` writes `deploy/PRE-FLIGHT.md`.
- Media: `node tools/media.mjs` regenerates screenshots and covers. Fun audit: `node tools/audit.mjs <tag>` and `node tools/liveplay.mjs <tag>`.

## How the economy works
Full numbers are in `design/GAME_DESIGN.md`; the code is in `src/data.js` and `src/engine.js`.
- You spark atoms (tap) and buy atom sources with Energy. Reactors turn atoms into molecules; each molecule gives Energy when made and also stays in stock as an ingredient for higher tiers (a deliberate simplification).
- Reactors with two ingredients have ratio dials. Each second a reactor consumes a fixed amount of atoms, split in the dial ratio. The reaction runs as often as the scarcer ingredient allows; surplus ingredient is wasted. Efficiency is 100% only at the balanced ratio.
- Upgrades: Spark Power, Catalysis (sources), Reactor Speed, Bond Strength (molecule value), Auto-Balance (sets dials automatically).
- Phase Change: available at 2e8 run Energy. Gives floor(sqrt(runEnergy / 1e7)) Phase Points, each +20% production, and every 3 points add a reactor slot (5 base, 8 max). `state.prestige2` is an unused hook for a future second layer.
- Offline: up to 8 hours, simulated at 50% speed, with a welcome-back summary.
- Fun layer (v1.1.0): perfect balance (+25% yield, streak up to +40%), Overload gamble, rare lucky bond / catalyst tokens, 24 short goals, 12 achievements (+2% each), a shelf of 8 molecules with reveals, and a lab scene where molecules visibly bond and pile up. See `design/GAME_DESIGN.md` and `design/FUN_AUDIT.md`.
- The scripted-player simulation (`tests/sim.mjs`) checks the pacing targets: first upgrade at about 3 s, first auto-generator under 1 s, first molecule under 1 s, first water reveal about 7 s for a goal-following player, an event every few seconds in the first minute, first Phase Change at about 33 min, and never more than about 35 s with nothing affordable.

## Platform adapter
`src/platform.js` exposes `init()`, `gameplayStart()`, `gameplayStop()`, `showRewarded(onReward, onFail)`, `showInterstitial()`. The shipped build is a no-op that calls callbacks immediately. Rewarded hooks are used by "2x production for 5 minutes" and "2x offline earnings". Commented spots mark where the Playgama Bridge, CrazyGames and Poki SDKs go; none are included and each needs its own approval.

## Decisions I made (you can change any of them)
- Nitrogen gas (2N -> N2) is an extra Tier 1 reaction because ammonia needs N2.
- No bundler: `src/` is copied as is (small enough, ES modules work from subfolders).
- Version is shown in the footer and matches the zip name.
- Ratio dials are limited to 1-9 per ingredient; Auto-Balance removes the need to set them.
- Molecules give Energy at creation and also stay available as ingredients.
- Colourblind palette: Okabe-Ito colours plus a letter on every atom, so colour is never the only cue.
- Chemistry facts are short, plain statements.

## Manual checklist for you
- [ ] `gh auth login` in your own terminal (GitHub CLI is installed) so I can enable Pages.
- [ ] Create or log in to your itch.io account and accept terms; run `butler login` (or upload the zip by hand using `deploy/listing/itch.md`).
- [ ] Create a Playgama developer account and accept terms.
- [ ] Play one full session on your phone and desktop and tell me what feels off.
- [ ] Fill `deploy/MONITORING.md` weekly from each portal's own dashboard.
