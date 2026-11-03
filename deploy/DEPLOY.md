# DEPLOY.md

## Deployed
| Target | URL | Date | Version |
|---|---|---|---|
| (none yet) | | | |

## Pending Access Requests

ACCESS NEEDED: GitHub (repo + Pages)
Why: Repo creation and push work through the connected GitHub integration as `prasadiitian`. Enabling GitHub Pages needs repo admin through a CLI/token, which is not on this machine.
Do this: Install GitHub CLI and run `gh auth login` in your own terminal (or `winget install GitHub.cli`, then `gh auth login`). If you prefer, once the repo exists, enable Pages manually: Settings > Pages > Deploy from branch > `main` / root.
Then tell me: "done"

ACCESS NEEDED: itch.io
Why: Publishing the HTML5 upload requires your itch.io account.
Do this: Create/log in to your itch.io account, accept terms, then install butler (https://itchio.itch.io/butler), run `butler login` in your own terminal, and tell me your itch.io username. Or upload `deploy/builds/*.zip` manually using `deploy/listing/itch.md`.
Then tell me: "done" and your itch.io username

ACCESS NEEDED: Playgama
Why: Submission requires a developer account.
Do this: Create an account at https://developer.playgama.com, accept terms, and log in in your browser. I will submit using `deploy/listing/playgama.md`, or you paste it in.
Then tell me: "done"

(CrazyGames and Poki: notes only, nothing needed from you until you ask.)
