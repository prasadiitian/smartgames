# Bondwork: Game Design

## Loop
Atoms (H, O, C, N) are generated -> fed into **reactors** -> molecules -> sold/used as **Energy** (the currency) and as inputs to higher tiers -> upgrades -> **Phase Change** (prestige) for permanent Phase Points (PP).

Currency: **Energy (E)** earned from molecules. Atoms are produced by free-tap "Spark" and auto-generators bought with Energy.

## Number handling
Plain JS numbers (doubles) go to 1.79e308, so 1e300 is safe. All costs/production are capped via `fmt()` and guarded with `Number.isFinite`. Format: 1.5K, 2.3M, ... Dc, then scientific (1.23e45).

## Reactions (balanced, tested)
| Tier | Equation |
|---|---|
| 1 | 2H -> H2 ; 2O -> O2 |
| 2 | 2H2 + O2 -> 2H2O ; C + O2 -> CO2 |
| 3 | C + 2H2 -> CH4 ; N2 + 3H2 -> 2NH3 |
| 4 | 6CO2 + 6H2O -> C6H12O6 + 6O2 |

## Ratio dials (twist 1)
Each reactor has one dial per reactant (integer 1-9). Ideal ratio = stoichiometric coefficients. Per cycle the reactor consumes inputs in the dialled ratio; the number of reactions achievable = min over reactants floor-ish (continuous) of available/ideal. Efficiency = 1 - 0.5 * mismatch, where mismatch = L1 distance between normalised dial ratio and ideal ratio. Wasted atoms = consumed amount beyond what the balanced reaction used (lost). Output = reactions * efficiency-adjusted yield. Perfect dials -> 100% yield, no waste.

## Unstable Reaction (twist 2)
Every 60-120 s of active play a reactor glows. Tap within 6 s: +25% reactor output for 20 s and a Stability tick. Ignoring: nothing lost.

## Economy
- Spark tap: +1 H (or the selected atom) per tap, scaled by Tap upgrades.
- Generators (cost grows x1.15 per level): H-Gen base 5 E (0.5/s each level), O-Gen 40 E (0.4/s), C-Gen 400 E, N-Gen 4 000 E.
- Upgrades (one-off/multi-level): Tap Power, Gen Efficiency (x1.5 each), Reactor Speed, Bond Strength (molecule value x2), Auto-Dials (unlocks auto-balance, late).
- Reactors unlocked with Energy: Tier 1 free-ish, Tier 2 at ~300 E, Tier 3 ~20 K, Tier 4 ~2 M.
- Molecule values (E per unit): H2 1, O2 1.5, H2O 12, CO2 14, CH4 160, NH3 150, C6H12O6 12 000.

## Pacing targets (asserted in simulation)
- First upgrade affordable <= 10 s; first auto-generator <= 60 s; first molecule <= 120 s.
- First Phase Change available at 25-40 min with mixed play.
- Never > 60 s with nothing affordable.

## Phase Change
Requires lifetime-this-run Energy >= 5e7 (tuned by simulation). PP gained = floor(sqrt(E_run / 1e6)) (min 1). Each PP: +10% global production (multiplicative-additive). Every 3 PP total unlocks an extra reactor slot (max 4). Resets atoms, molecules, Energy, generators, upgrades. Hook: `state.prestige2` stub, unused.

## Offline progress
Up to 8 h, at 50% of current per-second Energy rate (simple, documented). Welcome-back modal; rewarded hook doubles it.

## Rewarded hooks
"2x production for 5 min" and "2x offline earnings" via platform.js (no-op adapter calls onReward immediately).

## UI
Single page: header (Energy, rate, pause, mute, codex, settings), atom bar, reactors panel (dials), generators/upgrades tabs, Phase Change button. Canvas draws atoms as coloured circles with bond lines. Palette is colourblind-safe (Okabe-Ito) plus distinct shapes/labels per element; checked by script. Buttons >= 44 px.

## Save
localStorage key `bondwork.save`, `version: 1`, autosave 15 s, export/import as base64 text, try/catch around storage.

---

# v1.1.0 fun pass (changes to the numbers above)

- **Phase Change**: threshold 2e8 run Energy (was 2e7); Phase Points = floor(sqrt(runEnergy / 1e7)).
- **H2O reactor** costs 120 (was 250).
- **Perfect reactions**: a two-ingredient reactor at exactly the balanced ratio gets x1.25 yield. While every active two-ingredient reactor is perfect a streak grows: +0.4% Energy per second, max +40%.
- **Reactors start unbalanced** (H2O 1:1, CO2 2:1, CH4 1:1, NH3 1:1, GLU 1:2) so balancing is a real step. The card names the ingredient in excess and the wasted fraction.
- **Unstable Reaction** (every 60-120 s, 8 s window): Stabilise = x1.25 on that reactor for 20 s. Overload = 50% x3 for 15 s, 50% jam for 8 s. Ignoring costs nothing.
- **Rare events**: first lucky bond at 38 s, then every 80-200 s. Lucky bond = 45 s of current income. Catalyst = x3 production for 15 s. Tap the token on the lab canvas within 9 s.
- **Goals**: ordered list of 24 short goals (shown three at a time, then an endless "earn X" goal), reward = max(flat, 25 s of income). Long-term goal: Phase Change progress.
- **Achievements**: 12, each +2% production permanently (kept through Phase Change).
- **Discovery**: 8 molecules on the shelf with locked silhouettes and a reveal on first creation.
- **Visible growth**: pile of molecules in the lab canvas (about floor(made^0.7) tiles per type, capped, shown as a pyramid). Resets on Phase Change.
