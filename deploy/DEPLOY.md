# DEPLOY.md

## Status (2026-11-03)
Five games are built, tested and zipped. Nothing is deployed yet; every target is waiting on a login.

| Game | Version | Zip | GitHub Pages URL (planned) | itch.io | Playgama |
|---|---|---|---|---|---|
| Bondwork (idle) | 1.1.0 | `builds/bondwork-v1.1.0-*.zip` | https://prasadiitian.github.io/smartgames/bondwork/ | waiting | waiting |
| Moonmerge (merge puzzle) | 1.0.0 | `builds/moonmerge-v1.0.0-*.zip` | .../smartgames/moonmerge/ | waiting | waiting |
| Skyline Stack (arcade) | 1.0.0 | `builds/skyline-v1.0.0-*.zip` | .../smartgames/skyline/ | waiting | waiting |
| Floodgate (puzzle) | 1.0.0 | `builds/floodgate-v1.0.0-*.zip` | .../smartgames/floodgate/ | waiting | waiting |
| Lane Drift (arcade) | 1.0.0 | `builds/lanedrift-v1.0.0-*.zip` | .../smartgames/lanedrift/ | waiting | waiting |

Pre-flight: `PRE-FLIGHT.md` (Bondwork, 14/14 pass) and `PRE-FLIGHT-GAMES.md` (other four, all pass). Listings: `listing/` (Bondwork at the top level, the others in `listing/<slug>/`). CrazyGames / Poki: notes only (`listing/crazygames-poki-notes.md`, applies to all five).

## How each target will be deployed (once access exists)
1. **GitHub Pages**: one repo `smartgames`. `node tools/build.mjs && node tools/build-games.mjs` assembles `site/` (portal index + the five games). `site/` is pushed to the `gh-pages` branch and Pages serves it. Verify each URL headless: `node tests/games-browser.mjs https://prasadiitian.github.io/smartgames/` for the four small games, plus a load / save / version check for Bondwork.
2. **itch.io**: five HTML projects; `butler push deploy/builds/<zip> <username>/<slug>:html5` for each; text in `listing/**/itch.md`.
3. **Playgama**: five submissions using `listing/**/playgama.md` and the zips.

## Pending Access Requests

ACCESS NEEDED: GitHub
Why: Creating the `smartgames` repo, pushing the history and enabling Pages for all five games needs an authenticated GitHub CLI. `gh` is installed but not logged in.
Do this: In your own terminal run `& "C:\Program Files\GitHub CLI\gh.exe" auth login` (GitHub.com, HTTPS, login with browser).
Then tell me: "done"

ACCESS NEEDED: itch.io
Why: Publishing five HTML5 games needs your itch.io account.
Do this: Create or log in to your itch.io account and accept its terms. In your own terminal run `C:\Users\prasa\tools\butler\butler.exe login`. Then either create five HTML projects titled Bondwork, Moonmerge, Skyline Stack, Floodgate and Lane Drift, or tell me to try butler, which creates a project on first push.
Then tell me: "done" and your itch.io username

ACCESS NEEDED: Playgama
Why: Submitting the games needs a Playgama developer account.
Do this: Create an account at https://developer.playgama.com, accept the terms, and stay logged in in your browser.
Then tell me: "done"

(CrazyGames and Poki: nothing needed from you until you ask.)
