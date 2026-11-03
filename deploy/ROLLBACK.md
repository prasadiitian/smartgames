# ROLLBACK

Every release is tagged (v1.0.0, v1.0.1, ...) and its zip is kept in `deploy/builds/`.

## GitHub Pages
```
git checkout main
git revert <bad-commit>     # or: git reset --hard vX.Y.Z && git push --force-with-lease
git push
```
Pages redeploys from `main` within about a minute. Check the version string in the footer.

## itch.io
Upload the previous `deploy/builds/bondwork-vX.Y.Z-DATE.zip` over the HTML5 file in the project's Edit page (or `butler push <zip> <user>/bondwork:html5`). Tick "This file will be played in the browser".

## Playgama
Upload the previous zip as a new version in the developer portal and resubmit.

Re-run `node tools/preflight.mjs` before any redeploy.
