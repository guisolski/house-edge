# Playtest REPORT — House Edge v1.12.2

Fresh-player Morro follow-up after v1.12.1: lost at step 3 (Luna / cyan arrows), camera north clip, F3 dead, ramp wedge, Esc, stale E, fake climb, harsh first bet.

## Verdict

**PASS** for ship gates. Large yellow objective marker + name on the current target only; HUD `Talk to Name (District)` + flavour detail; north HUD clamp; F3 DOM FPS; wall-slide; Esc toggles menu; stale E cleared; antena reworded; first bet ~72% (pity no longer caps friendly bases down). Desktop e2e 15/15.

## Fixes vs findings

| #   | Issue                                  | Result                                                            |
| --- | -------------------------------------- | ----------------------------------------------------------------- |
| 1   | Cyan arrows on many NPCs; Luna unclear | Big yellow arrow + name on objective only; side quests = dim dots |
| 2   | “Pixo alley” read as a place           | Primary: `Talk to Luna Pixel (Morro Neon)`; detail: `Pixo alley`  |
| 3   | North ridge player under HUD           | Camera HUD inset + min walkable Y                                 |
| 4   | F3 FPS missing                         | DOM `.fps-meter`; e2e toggle                                      |
| 5   | Ramp corner wedge                      | `slideStep` wall-slide / corner-slip                              |
| 6   | Esc doesn’t close menu                 | Esc toggles menu → play; submenus return to menu                  |
| 7   | Stale `E (Antena Tech)`                | Prompt refreshes on every `player:moved`                          |
| 8   | “Climb the LED antenna” with no climb  | Reworded to **Jack the LED antenna**                              |
| 9   | First bet lost 3× / ~46–62%            | `agua-gelada` ~72%; pity never pulls base below itself            |

## Browser playtest (computer-use, fresh player)

| Check                        | Result                                 |
| ---------------------------- | -------------------------------------- |
| Unique yellow marker + label | **PASS** (enlarged after first pass)   |
| HUD name (district) + detail | **PASS**                               |
| F3 FPS toggle                | **PASS**                               |
| First bet ~72%               | **PASS** (`Win chance 72% · Odds 1:3`) |
| North ridge below HUD        | **PASS**                               |
| Esc closes menu              | **PASS**                               |
| Stale E clears               | **PASS** (~200 ms)                     |
| Console errors               | **None**                               |

Artifacts: `v122-*.png`, `v122-morro-ux.webm` under `/opt/cursor/artifacts/` (copied into `artifacts/playtest/` when present).

## Timed scripted run

| Run                                    | Result           |
| -------------------------------------- | ---------------- |
| `e2e/story-walk.spec.ts` (walk+E only) | **PASS** (~3.4s) |
| `e2e/fps-overlay.spec.ts`              | **PASS**         |
| Desktop Chromium e2e                   | **15/15**        |
| 4× throttle FPS                        | **≥50**          |

## Automated

- `npm test` — pass (coverage ≥90% branches)
- `npm run lint` / `typecheck` / `make check` — pass

## Gaps (honest)

- Objective arrow is large but still procedural (not a sprite sheet).
- North ridge can draw the player over building windows (y-sort / footprint).
- Hint line can be hard to read over bright neon signs.
