# Fun Audit: Bondwork v1.0.0 (before the fun pass)

Method: a scripted player (4 taps/s for 8 minutes, then idle-ish, buys the cheapest thing it can afford) was run to 0s, 30s, 2min, 10min and 30min. Each state was loaded into the real page in headless Chrome and screenshotted at 360x640 and 1280x720 (`design/audit/before/`). Purchase timeline: `design/audit/before/timeline.json`.

## Moment by moment

| Time | What the player sees | What they do | What they feel |
|---|---|---|---|
| 0s | A short list of cards, one empty strip with a few faint dots, a yellow Spark button, "0" Energy. | Taps Spark. | Mild curiosity. The number goes up slowly. Nothing explains *why* this is interesting. The canvas shows ghostly dots that vanish. |
| 30s | Energy ~15. Hydrogen Source level 3. Same strip with 2-3 dots. | Taps, buys a green button when it lights up. | Purchases arrive every ~5s, but each purchase is only a number changing in a row: no sound variation, no burst, no animation. Feels like a spreadsheet. |
| 2min | Energy 65, "per sec 7.5". H2 and O2 cards "On". Three greyed cards. A 100px strip with three atoms. The H2O reactor (the first real chemistry) is still 250 Energy away because the cheapest-first order keeps buying Hydrogen Sources. | Taps. | Bored. The game promised chemistry, but at 2 minutes the player has only turned H into H2. No molecule was ever *shown* being built. |
| 10min | Energy 2.8K, 545/s. Five cards, four shop rows, chips with big numbers. The canvas still shows three or four particles. | Mostly watches numbers; the shop buttons turn green. | Numbers grow, but nothing on screen has *grown*. After 10 minutes there is no sign of the 1,000+ molecules that were built. |
| 30min | Energy tens of millions. Every shop row is a pale green button; Phase Change available. | Presses Phase Change. | Relief rather than excitement. The prestige is a button, not a moment. |

## Where it is boring (harsh version)

1. **No visible growth.** The core fantasy is *building matter*, yet the screen never shows matter accumulating. 1,000 molecules and 10 molecules look identical. This is the worst problem.
2. **Zero juice.** Purchases, reactions and taps have one weak beep. No particles, no number pop-ups, no shake, no bounce, no rising pitch. Every action feels the same.
3. **No discovery.** The Codex is a list that quietly fills with text. Making water for the first time is a non-event. There is nothing to want to unlock because locked content is "???".
4. **No goals.** The player is never told what to do next. There is no short-term target, no long-term target, no achievements.
5. **Passive play.** Ratio dials are set once and forgotten (many default to the right answer or are trivially fixed). Unstable Reactions are a minor bonus with no decision and no risk, so ignoring them is correct.
6. **No surprise.** Every minute is identical to the last; nothing random happens.
7. **First 60 seconds are quiet.** The purchase timeline is `3s gen, 6s tap upgrade, 9s, 12s, 16s, 21s, 26s...` (all identical-feeling Hydrogen Source purchases). Only numbers change. The first genuinely new thing (H2O) is later than 2 minutes for this player.
8. **Mid-game is a number treadmill.** The bot's longest gap between purchases is only 13.5s, so the economy is fine; the *experience* of each purchase is the problem.

## What the fun pass must achieve
Visible, physical growth; juice on every action; a reveal for every molecule; always-visible goals; dials as a puzzle with a streak; Unstable Reactions with a real choice; random rare events; something satisfying every 5-10 seconds in the first minute, and the first big visual payoff before 45 seconds.

---

# After the fun pass (v1.1.0)

Screenshots: `design/audit/after/` (scripted player at 0s/30s/2min/10min/30min), `design/audit/live-after/` (a bot playing the first 50 s through the real UI), `design/audit/events/` (rare event, unstable reaction, shelf). I looked at each, and kept or reverted changes by what the pictures showed.

## Change log with honest verdicts

| Change | Verdict |
|---|---|
| **Visible growth**: lab canvas where atoms drift, fly together, flash a bond, then the molecule drops onto a pyramid-shaped heap that grows with every molecule made | **Kept. The single biggest improvement.** First version was cluttered (big ambient atoms hid the heap; tiles were tiny); I shrank and dimmed the ambient atoms and enlarged the tiles. The pile is thinned evenly so it never grows off-screen. |
| **Juice**: purchase bursts, number pop-ups, rising pentatonic combo sounds, bounce on press, screen shake on big events, bond flash/ring | **Kept.** Popups at 30 min were unreadable stacks, so landing pop-ups are throttled to one per 260 ms. Shake respects reduced-motion and has an off switch. |
| **Discovery**: shelf with locked silhouettes, reveal card with animation, name and real fact | **Kept, but the first design failed**: a centered modal blocked the Spark button right when the player starts. Replaced with a compact click-through card that auto-hides after 5.5 s. |
| **Goals**: 3 short goals always visible (2 on short phones) plus a long-term bar, rewards, 12 achievements giving +2% production each | **Kept.** |
| **Dial puzzle**: reactors start unbalanced, text says which ingredient is in excess and by how much, PERFECT badge with +25% yield, perfect streak up to +40% Energy | **Kept.** |
| **Unstable Reaction as a choice**: Stabilise (safe +25%) or Overload (50% x3 for 15 s, 50% 8 s jam). Never permanent | **Kept.** |
| **Surprises**: lucky bond (about 38 s in, then every 80-200 s, pays about 45 s of income) and catalyst (x3 for 15 s), as a token you tap on the canvas | **Kept.** |
| **First 60 s**: goal rewards chain quickly, first lucky bond near 38 s, H2O cost cut from 250 to 120 | **Kept.** |
| Toasts at the top of the screen | **Reverted**: they covered the reveal card and the lab. Moved to the bottom, max one at a time. |
| Auto-select the needed atom, plus a pulsing "needs atoms" hint | **Added after the live play-through exposed a real hole**: after building the O2 reactor nothing told the player to spark Oxygen, so only H2 was ever discovered. |

## Measured (scripted player, `tests/fun.mjs`)
- First water reveal (first big visual payoff) at about 7 s for a player who follows the goals (limit 45 s).
- Something happens (purchase, goal, reveal, achievement) at least every 3 s in the first minute (limit 10 s).
- Economy still holds: first Phase Change at 33.3 min, longest stretch with nothing affordable 34.8 s.
- The Phase Change threshold had to move from 2e7 to 2e8 because goals, perfect bonuses and achievements make the economy faster.

## Remaining weaknesses (not fixed)
- A purely idle player sees the heap grow, but the interactive moments (rare tokens, Overload, dial puzzles) only reward people who tap. That is intended.
- The late game (10-30 min) is still mostly "buy things as they go green"; the new goals, rare events and achievements make it livelier but it is not deep.
- The first 10 s may now be too busy: several goals can complete within one second for a fast player. I left it, but it is the first thing to tune if playtesting says it feels noisy.
- I can verify visuals and pacing headless, but I cannot hear the sound, so audio balance is unchecked by a human.
