# Playtest REPORT — House Edge v1.12.1

Independent follow-up after v1.12.0 softlock: Casa Suprema objective “Elevator odds — look around…” with no interactable after Pit Dealer.

## Verdict

**PASS** for ship gates. Softlock fixed; walk+E e2e plays New Game → ending via objective markers only; exits use full names + doorway margin; freeroam HUD verified. Desktop 4× throttle FPS still ≥50.

## Fixes vs playtest findings

| #   | Issue                                        | Result                                                                                         |
| --- | -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Elevator softlock (“look around”, no target) | Visible elevator booth NPC + `ELEVATOR` sign + marker; objective `Use Elevator: Elevator odds` |
| 2   | Objectives without concrete targets          | Unit test: every non-intro beat tagged to NPC/object; missing target → bug string              |
| 3   | No e2e for marker-driven progression         | `e2e/story-walk.spec.ts` New Game→ending walk+E only; fails if marker has no interactable      |
| 4   | Tiny exit hotspots (Morro↔Fair, Fair→Odds)   | Plus-shaped exit pads + `EXIT_STAND_RANGE` 2.6; `E — Travel to <full name>`; walk-on on tiles  |
| 5   | Abbreviated exit signs (`ODDS AVE`)          | Full names: Central Fair, Odds Avenue, Morro Neon, Casa Tower                                  |
| 6   | Arrival bounce (spawn on Odds exit pad)      | Avenida/Casa spawns cleared of pads; walk-on travel only on `exit` tiles                       |
| 7   | Post-ending freeroam HUD                     | Verified: `Free roam — grind side jobs…` after continue exploring                              |

## Browser playtest (computer-use)

| Check                        | Result                                                                  |
| ---------------------------- | ----------------------------------------------------------------------- |
| Elevator marker + sprite + E | **PASS** — booth at (24,10); prompt `E — Use (Elevator)`; bet resolves  |
| No “look around” softlock    | **PASS**                                                                |
| Freeroam HUD after ending    | **PASS** — Free roam objective on play HUD                              |
| Fair east full name + Travel | **PASS** — `> Odds Avenue`; `E — Travel to Odds Avenue` within ~2 tiles |
| Console errors               | **None**                                                                |
| FPS overlay (Tower)          | ~59–61                                                                  |

Artifacts: `pt-01-new-game.png`, `pt-02-elevator-marker.png`, `pt-02b-elevator-dialogue.png`, `pt-03-freeroam-hud.png`, `pt-04b-fair-exit-travel-prompt.png`, `pt-critical-checks.webm`.

## Timed scripted run

| Run                                      | Result                                              |
| ---------------------------------------- | --------------------------------------------------- |
| `e2e/story-walk.spec.ts` (walk+E only)   | **PASS** (~4.3s harness / 5.4s wall; marker-driven) |
| `e2e/story-complete.spec.ts` (debug API) | **PASS**                                            |
| Desktop 4× throttle avg FPS              | **≥50** (budget)                                    |

Harness time is not human pace; the walk+E test exercises every main-story marker without travel menu / `runStoryBeat` jumps.

## Automated

- `npm test` — pass (coverage gates)
- `npm run lint` / `typecheck` — pass
- `npx playwright test --project=desktop-chromium` — 14/14 pass (incl. story-walk + exits)

## Gaps (honest)

- From south of the elevator, Augusto can win the E prompt until you enter elevator range (~3.5 tiles) — follow the marker north.
- Freeroam HUD text can overlap the CASA SUPREMA world sign in Tower (sign draws over HUD line).
- Exit Travel prompt yields to nearby NPC prompts beyond ~2 tiles; doorway pad + E on the pad remain reliable.
- NPC art remains blocky procedural silhouettes.
