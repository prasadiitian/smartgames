# DEPLOY.md

## Status (2026-11-03)
Build v1.1.0 (fun pass) is complete; v1.0.0 was never deployed. Build: all tests pass, pre-flight passes (`PRE-FLIGHT.md`), zip is in `builds/`, listings and covers are in `listing/`. Nothing is deployed yet; every target is waiting on a login.

| Target | URL | Date | Version | State |
|---|---|---|---|---|
| GitHub Pages | https://prasadiitian.github.io/bondwork/ (planned) | - | v1.1.0 | waiting on `gh auth login` |
| itch.io | (planned) | - | v1.1.0 | waiting on butler login + username |
| Playgama | (planned) | - | v1.1.0 | waiting on developer account |
| CrazyGames / Poki | - | - | - | notes only (`listing/crazygames-poki-notes.md`) |

## Pending Access Requests

ACCESS NEEDED: GitHub
Why: Creating the repo, pushing the full git history and enabling Pages needs an authenticated GitHub CLI. `gh` is now installed but not logged in.
Do this: In your own terminal run `& "C:\Program Files\GitHub CLI\gh.exe" auth login` (GitHub.com, HTTPS, login with browser). Open a new terminal afterwards if `gh` is not found.
Then tell me: "done"

ACCESS NEEDED: itch.io
Why: Uploading the HTML5 build and filling in the listing needs your itch.io account.
Do this: Create or log in to your itch.io account and accept its terms. Then in your own terminal run `C:\Users\prasa\tools\butler\butler.exe login` (butler is already installed there). Create a project page titled Bondwork (kind: HTML) so the URL exists; the text to paste is in `deploy/listing/itch.md`.
Then tell me: "done" and your itch.io username

ACCESS NEEDED: Playgama
Why: Submitting the game needs a Playgama developer account.
Do this: Create an account at https://developer.playgama.com, accept the terms, and stay logged in in your browser. Submission text is in `deploy/listing/playgama.md`.
Then tell me: "done"

(CrazyGames and Poki: nothing needed from you until you ask.)
