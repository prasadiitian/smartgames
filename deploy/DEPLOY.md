# DEPLOY.md

## Status (2026-11-03)
GitHub Pages is live for all five games (repo https://github.com/prasadiitian/smartgames, branch `gh-pages`, deployed 2026-11-03). Verified headless on the live URLs: loads, no console errors, no external requests, saves persist after reload, mute and pause work, live version string matches the zip. itch.io builds are uploaded via butler (project pages are still drafts, listing text and publishing are the owner's step). Playgama is waiting on a developer account.

| Game | Version | Live URL (GitHub Pages) | itch.io | Playgama |
|---|---|---|---|---|
| Portal | - | https://prasadiitian.github.io/smartgames/ | - | - |
| Bondwork (idle) | 1.2.2 | https://prasadiitian.github.io/smartgames/bondwork/ | https://prasady.itch.io/bondwork (draft, build 1.2.2 uploaded 2026-11-03) | waiting |
| Moonmerge (merge puzzle) | 1.0.0 | https://prasadiitian.github.io/smartgames/moonmerge/ | https://prasady.itch.io/moonmerge (draft, build 1.0.0 uploaded 2026-11-03) | waiting |
| Skyline Stack (arcade) | 1.0.0 | https://prasadiitian.github.io/smartgames/skyline/ | https://prasady.itch.io/skyline (draft, build 1.0.0 uploaded 2026-11-03) | waiting |
| Floodgate (puzzle) | 1.0.0 | https://prasadiitian.github.io/smartgames/floodgate/ | https://prasady.itch.io/floodgate (draft, build 1.0.0 uploaded 2026-11-03) | waiting |
| Lane Drift (arcade) | 1.0.0 | https://prasadiitian.github.io/smartgames/lanedrift/ | https://prasady.itch.io/lanedrift (draft, build 1.0.0 uploaded 2026-11-03) | waiting |

Zips are in `builds/` (`<slug>-v<version>-2026-11-03.zip`). Bondwork 1.2.0 was live for a few minutes and replaced by 1.2.1 (first-run help flag was not being saved), then 1.2.2 (header fits 360 px phones); redeploy is a push of `site/` to `gh-pages`.

Pre-flight: `PRE-FLIGHT.md` (Bondwork, 14/14 pass) and `PRE-FLIGHT-GAMES.md` (other four, all pass). Listings: `listing/` (Bondwork at the top level, the others in `listing/<slug>/`). CrazyGames / Poki: notes only (`listing/crazygames-poki-notes.md`, applies to all five).

## How each target will be deployed (once access exists)
1. **GitHub Pages** (done): one repo `smartgames`. `node tools/build.mjs && node tools/build-games.mjs` assembles `site/` (portal index + the five games). `site/` is pushed to the `gh-pages` branch and Pages serves it. Verify each URL headless: `node tests/games-browser.mjs https://prasadiitian.github.io/smartgames/` for the four small games, plus a load / save / version check for Bondwork.
2. **itch.io**: five HTML projects; `butler push deploy/builds/<zip> <username>/<slug>:html5` for each; text in `listing/**/itch.md`.
3. **Playgama**: five submissions using `listing/**/playgama.md` and the zips.

## Pending Access Requests

ACCESS NEEDED: itch.io page settings (owner)
Why: Builds are uploaded, but the five project pages are drafts and publishing a page is an account action.
Do this: For each page (Edit game): confirm "This file will be played in the browser" is ticked on the html5 upload, set Embed options (viewport from the listing file, Mobile friendly, Fullscreen button), paste the description/tags from deploy/listing, add the screenshots/cover, then set Visibility to Public and Save.
Then tell me: "done"

ACCESS NEEDED: Playgama
Why: Submitting the games needs a Playgama developer account.
Do this: Create an account at https://developer.playgama.com, accept the terms, and stay logged in in your browser.
Then tell me: "done"

(CrazyGames and Poki: nothing needed from you until you ask.)

## Ads (AdSense)
The shipped builds contain no ad code. AdSense needs your own approved account and a site it has reviewed (an AdSense account and its terms are yours to set up); once you confirm approval I add the ad code as a separate commit per the deployment rules, and update the privacy/consent text at the same time. Note: AdSense often will not approve sites on free subdomains such as `github.io`, so you may need your own domain for the GitHub Pages site.
