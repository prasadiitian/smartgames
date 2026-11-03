# Bondwork: Claude Code Build Prompt

Paste everything below the line into Claude Code in an empty folder. Then also paste `deployment-rules.md` (or append it to this prompt) so Claude Code follows the manual-step rules when publishing.

---

Build, test and prepare for publishing a free HTML5 idle game. Working title: "Bondwork". Do not copy any existing game: no names, text, art, sounds or layouts from other idle games.

## CONCEPT

An idle/incremental game about building matter. The player generates atoms, bonds them into molecules, then compounds, and prestiges with a "Phase Change".

Twist 1 (balance): reactions must be balanced. Each reactor has ratio dials; output is highest when the ratio matches the real balanced equation, and mismatched atoms are wasted.

Twist 2 (active check-ins): occasional "Unstable Reaction" events can be stabilised with a quick tap for a bonus. Ignoring one only forfeits the bonus. It never costs permanent progress.

## CHEMISTRY (must be accurate; add an automated test)

- Tier 1: H2 and O2 from H and O atoms.
- Tier 2: 2H2 + O2 -> 2H2O; C + O2 -> CO2.
- Tier 3: C + 2H2 -> CH4; N2 + 3H2 -> 2NH3.
- Tier 4: 6CO2 + 6H2O -> C6H12O6 + 6O2.

Write a test that every reaction conserves atoms. Add a small "codex" screen that shows each unlocked reaction and one plain-language fact. Keep facts correct and short.

## CORE LOOP AND PACING (verify with a simulation script)

- First upgrade affordable within 10 seconds, first auto-generator within 60 seconds, first molecule within 2 minutes.
- First Phase Change available after about 25 to 40 minutes of mixed active and idle play.
- Never leave the player with nothing affordable for more than 60 seconds.
- Phase Change resets atoms and molecules but gives permanent Phase Points (production multiplier and a new reactor slot). Leave a clean hook for a second prestige layer, but do not build it.
- Offline progress, capped at 8 hours, with a "welcome back" summary.
- Make the first 3 minutes the best part of the game: fast early upgrades, visible growth, satisfying feedback.

## TECH

- Plain JavaScript (ES modules), HTML and CSS, bundled to a single folder under 2 MB. No frameworks needed, no CDN, no external network calls, no analytics, no third-party fonts.
- Handle large numbers safely up to at least 1e300 with a small formatting helper (1.5K, 2.3M, scientific after that).
- Save to localStorage with a version number, autosave every 15 seconds, plus export/import of the save as text. Wrap storage in try/catch.
- Touch-first, responsive for portrait and landscape phones and desktop, and playable inside a 16:9 iframe. Buttons at least 44 px. Pause and mute buttons. Pause when the tab is hidden.
- Visuals: original, drawn with CSS, SVG or canvas (atoms as colored circles with bond lines). Audio: short synthesized sounds with Web Audio, no files. Include a colorblind-friendly palette check.
- No tutorial wall: at most three short tooltips on first run.

## PLATFORM ADAPTER (no real ads yet)

Create platform.js exposing: init(), gameplayStart(), gameplayStop(), showRewarded(onReward, onFail), showInterstitial(). The default build implements them as no-ops that call the callbacks immediately. Use rewarded hooks for "2x production for 5 minutes" and "2x offline earnings". Leave clearly commented places for the Playgama Bridge, CrazyGames and Poki SDKs, each of which needs its own approval. Do not add any real ad code.

## TESTS (run them and report the results)

1. Atom-conservation test for every reaction.
2. Economy simulation: a scripted player for 60 simulated minutes; check the pacing targets above and that no dead end exists.
3. Save/load round trip, offline-progress calculation, and large-number formatting tests.
4. Browser check at 360x640, 768x1024 and 1280x720: no overflow, no overlapping text, readable contrast.

## PUBLISHING PREP

1. Zip a build for itch.io HTML5 upload (index.html at the root) and keep a copy ready for portal upload.
2. Write listing text: title, short description, long description, tags, controls, and a screenshot list. Generate screenshots yourself from the running game if you can.
3. Create a cover image at 315x250, 630x500 and 1280x720.
4. Deploy a copy to GitHub Pages (free), following the deployment rules.
5. Write README.md with: how to run, how the economy works, the platform adapter, and a manual checklist for me.

## WORKFLOW

First write design/GAME_DESIGN.md (loop, numbers, upgrade tables, reaction list, pacing targets) and show me a summary. Then build in phases: core loop, reactors and ratios, prestige, events, polish, tests, publishing prep. Commit after each phase. Keep a task list.

## CONSTRAINTS

- This is my personal project: work autonomously from start to deployment. Use access already available on this machine. Ask me only when you need access (a login, token, 2FA code, or an account that does not exist yet); never ask me to paste secrets into the chat, I will log in myself. Creating accounts, accepting terms and payout or tax forms are mine to do. Follow the deployment rules for the exact format.
- Do not claim or estimate any revenue.
- If a design choice is unclear, pick the simplest option, note it in the README, and continue.
