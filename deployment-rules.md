# Deployment Rules for Claude Code (autonomous mode)

Paste this after the build prompt (or append it to the end of `bondwork-build-prompt.md`). This is my personal project. Work end to end on your own, all the way through deployment, and come to me only when you need access.

---

## DEPLOYMENT RULES

**Principle:** Do everything yourself: build, test, package, write listings, deploy, verify. Stop only when something needs access you do not have, such as a login, a token, a 2FA code, or an account that does not exist yet. Then ask me once, clearly, and continue after I confirm.

### 1. Work autonomously

- Do not ask for approval at each step. Make sensible decisions, note them in `README.md`, and keep going.
- Use any access already available on this machine (existing `gh` login, git credentials, configured CLIs) without asking.
- Deploy directly to GitHub Pages, and to itch.io (via `butler` or the web upload) when access exists.
- Keep a task list and update it as you go. At the end, report what is live and the URLs.

### 2. When you need access, ask me with an Access Request

Use exactly this format, then pause that deployment target (continue with other work meanwhile):

```
ACCESS NEEDED: <platform>
Why: <what you cannot do without it>
Do this: <the shortest exact steps for me; for example, run `gh auth login` in my own terminal>
Then tell me: "done" (or the public username / repo name if needed)
```

- Never ask me to paste passwords, tokens, API keys or 2FA codes into this chat. I will log in myself in my own terminal or browser, and you then use the resulting session.
- If a command fails for lack of authentication, do not search for credentials or try to work around it. Send an Access Request.

### 3. Things only I do (because they involve my identity, legal terms or money)

- Creating accounts, accepting terms or agreements, and completing payout, tax or KYC forms.
- Spending money or adding paid services. Stay on free tiers.

For these, send an Access Request with the exact steps and the text to paste (listing text, descriptions) from the `/deploy/listing/` files.

### 4. Prepare a /deploy folder

- `DEPLOY.md`: what was deployed where, with URL, date and version; plus any pending Access Requests.
- `listing/`: ready-to-paste text for each portal (title, short and long description, tags, controls) and the cover images.
- `builds/`: versioned zips such as `bondwork-v1.0.0-2026-11-03.zip`.
- `PRE-FLIGHT.md`: results of the checks in rule 5.

### 5. Pre-flight checks (must pass before any deploy)

- All tests pass; no console errors on load in a headless browser.
- Total build under 2 MB; loads in under 3 seconds on a throttled connection.
- No external network requests, leftover debug code, or secrets in the repo (scan the working tree and git history).
- Works at 360x640, 768x1024 and 1280x720 in touch and mouse.
- Only original assets, with licence notes for any library.
- `index.html` at the root of every zip, and relative paths work from a subfolder.

### 6. Deployment order

a. **GitHub Pages**: create the repo (if access allows), push, enable Pages, and check the live URL.
b. **itch.io**: upload the HTML5 zip, set the embed size, fill in the listing, and upload the covers. Publish once the live check in rule 7 passes.
c. **Playgama**: submit through its developer portal as far as access allows (it reviews within about 24 hours, no exclusivity). Integrate its SDK only after an account exists.
d. **CrazyGames and Poki**: prepare notes only, until I ask.

### 7. After each deploy, verify

- Open the live URL in a headless browser: it loads, saves persist after a reload, mute and pause work, no console errors.
- Confirm the live version string matches the zip you built.
- Record the URL, date and version in `DEPLOY.md`.
- If verification fails, fix it or roll back before moving to the next platform.

### 8. Versioning and rollback

- Tag releases (v1.0.0, v1.0.1 ...) and keep every zip in `builds/`.
- Re-run pre-flight before every redeploy. Write `ROLLBACK.md` on how to restore the previous build on each platform.

### 9. Ads and money

- Ship with the no-op platform adapter. Add a real ad SDK only after I confirm a portal approval, as a separate commit.
- Never claim or estimate revenue. Create a `MONITORING.md` template for me to fill in weekly: plays, average session length, day-1 return, portal feedback.

### 10. When unsure

For anything ordinary, pick the simplest option and continue. Ask only when you are blocked by access, or when the action cannot be undone and could reasonably go either way.

### Start

Begin the build now. Create `/deploy/DEPLOY.md` early, and send me all Access Requests you can foresee in a single list at the start, so I can log in to everything once.
