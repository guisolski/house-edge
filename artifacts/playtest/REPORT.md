# Playtest REPORT — House Edge v1.12.0

Independent follow-up after v1.11 (~11m40s story, Fair east exit dead, stale post-ending objective).

## Verdict

**PASS** for ship gates (exits e2e, story e2e, 4× throttle FPS ≥50, lint/unit). Art still ~7/10. Story careful estimate **~20.5 min** main / **~24.8 min** with sides.

## Fixes vs playtest findings

| #   | Issue                                 | Result                                                                                                    |
| --- | ------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | Fair EAST exit dead; sign clipped     | Pads inset; `EXIT > ODDS AVE` fully visible; prompt `E — Travel to Odds Avenue`; e2e walks **every** exit |
| 2   | Post-ending stale Travel → Nair       | Free-roam objective; epilogue optional                                                                    |
| 3   | Travel menu when walkable exit exists | Multi-hop `firstHopExit` prefers walking                                                                  |
| 4   | E wrong NPC                           | Facing + distance score; prompt shows name                                                                |
| 5   | Dialogue vs flow                      | Lavador / Mensageiro / Margin lines audited                                                               |
| 6   | Default stake all-in                  | `defaultStake` ≈12% of credits, never all                                                                 |
| 7   | Morro nav                             | Side ramps + plaza approaches + RAMP/STAIRS signs                                                         |
| 8   | Signs under modals                    | Live signs only while `ui === play`                                                                       |
| 9   | Story ~12 min                         | Tipster + foyer/pit/elevator Casa beats → ~20.5 min careful                                               |
| 10  | NPC clones                            | 4 body/hair/outfit variants + idle bob; cyan side markers                                                 |

## Measured

| Metric                       | Value                                              |
| ---------------------------- | -------------------------------------------------- |
| Desktop 4× throttle avg FPS  | **~60.0** (budget ≥50)                             |
| Scripted paced harness       | ~5 min (sleep-accelerated; not human pace)         |
| Careful estimate (main path) | **~20.5 min** (98 lines ×5.5s + 23 bets + travels) |
| Careful + side quests        | **~24.8 min**                                      |
| Default stake @ 100 credits  | **12**                                             |

## Automated

- `npm test` — pass (coverage gates)
- `npx playwright test` — 26/26 pass (incl. `e2e/exits.spec.ts`)
- e2e golden path / story-complete — pass

## Gaps (honest)

- NPC variants are still blocky CC0-style silhouettes — readable variety, not full sprite sheets.
- Crowds remain mostly baked silhouettes (NPCs idle-bob; crowds do not).
- West EXIT signs can leave frame when the camera is far east (expected); on the pad they read fully.
