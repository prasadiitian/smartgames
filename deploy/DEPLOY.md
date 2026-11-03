# DEPLOY.md

## Status (2026-11-03)
GitHub Pages is live for all five games (repo https://github.com/prasadiitian/smartgames, branch `gh-pages`, deployed 2026-11-03). Verified headless on the live URLs: loads, no console errors, no external requests, saves persist after reload, mute and pause work, live version string matches the zip. itch.io and Playgama are waiting on logins.

| Game | Version | Live URL (GitHub Pages) | itch.io | Playgama |
|---|---|---|---|---|
| Portal | - | https://prasadiitian.github.io/smartgames/ | - | - |
| Bondwork (idle) | 1.2.1 | https://prasadiitian.github.io/smartgames/bondwork/ | waiting | waiting |
| Moonmerge (merge puzzle) | 1.0.0 | https://prasadiitian.github.io/smartgames/moonmerge/ | waiting | waiting |
| Skyline Stack (arcade) | 1.0.0 | https://prasadiitian.github.io/smartgames/skyline/ | waiting | waiting |
| Floodgate (puzzle) | 1.0.0 | https://prasadiitian.github.io/smartgames/floodgate/ | waiting | waiting |
| Lane Drift (arcade) | 1.0.0 | https://prasadiitian.github.io/smartgames/lanedrift/ | waiting | waiting |

Zips are in `builds/` (`<slug>-v<version>-2026-11-03.zip`). Bondwork 1.2.0 was live for a few minutes and replaced by 1.2.1 (first-run help flag was not being saved); redeploy is a push of `site/` to `gh-pages`.

Pre-flight: `PRE-FLIGHT.md` (Bondwork, 14/14 pass) and `PRE-FLIGHT-GAMES.md` (other four, all pass). Listings: `listing/` (Bondwork at the top level, the others in `listing/<slug>/`). CrazyGames / Poki: notes only (`listing/crazygames-poki-notes.md`, applies to all five).

## How each target will be deployed (once access exists)
1. **GitHub Pages** (done): one repo `smartgames`. `node tools/build.mjs && node tools/build-games.mjs` assembles `site/` (portal index + the five games). `site/` is pushed to the `gh-pages` branch and Pages serves it. Verify each URL headless: `node tests/games-browser.mjs https://prasadiitian.github.io/smartgames/` for the four small games, plus a load / save / version check for Bondwork.
2. **itch.io**: five HTML projects; `butler push deploy/builds/<zip> <username>/<slug>:html5` for each; text in `listing/**/itch.md`.
3. **Playgama**: five submissions using `listing/**/playgama.md` and the zips.

## Pending Access Requests

ACCESS NEEDED: itch.io
Why: Publishing five HTML5 games needs your itch.io account.
Do this: Create or log in to your itch.io account and accept its terms. In your own terminal run `C:\Users\prasa\tools\butler\butler.exe login`. Then either create five HTML projects titled Bondwork, Moonmerge, Skyline Stack, Floodgate and Lane Drift, or tell me to try butler, which creates a project on first push.
Then tell me: "done" and your itch.io username

ACCESS NEEDED: Playgama
Why: Submitting the games needs a Playgama developer account.
Do this: Create an account at https://developer.playgama.com, accept the terms, and stay logged in in your browser.
Then tell me: "done"

(CrazyGames and Poki: nothing needed from you until you ask.)

## Ads (AdSense)
The shipped builds contain no ad code. AdSense needs your own approved account and a site it has reviewed (an AdSense account and its terms are yours to set up); once you confirm approval I add the ad code as a separate commit per the deployment rules, and update the privacy/consent text at the same time. Note: AdSense often will not approve sites on free subdomains such as `github.io`, so you may need your own domain for the GitHub Pages site.
