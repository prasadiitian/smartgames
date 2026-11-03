# CrazyGames and Poki: notes only (not submitted until you ask)

- Both require their SDK for ads and gameplay events; `src/platform.js` has commented integration points (gameplayStart/Stop, rewarded, midgame/commercial break).
- Both need an approved developer account and review. CrazyGames usually wants basic-launch quality plus a 16:9 and mobile check (done); Poki is stricter on polish and exclusivity terms, so read their current terms before applying.
- Likely requests: add SDK in a separate commit, test with their QA tools, remove the "Save export" text-box if asked, localise if asked.
- Do not enable ads until approval is confirmed.
