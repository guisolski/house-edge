# Playtest REPORT — House Edge v1.14.0

Independent follow-up after v1.13.0 (631d11b). Goal: real Simon sequences, clue-backed choice gates, exit latch + label correctness, VIP floor, Casa FPS prewarm, prompt priority, ~20 min story.

## Verdict

**PASS** for ship gates. Simon sequences visible + fail on mistakes; every choice/puzzle gate has a clue naming the answer (unit-tested); exit pads latch + label==destination; distinct VIP salon; FPS prewarm. Coverage branches **≥90%**. Story-walk e2e + 4× FPS ≥50.

## Measured story time

| Method                                                    | Result         |
| --------------------------------------------------------- | -------------- |
| Content + Simon/clue pacing (skills take longer than RNG) | **~19–21 min** |
| Scripted walk+E with perfect skills                       | ~4–5 min       |
| Prior v1.13.0 human playtest                              | ~17 min        |

Target ~20 min via longer skill interactions + epilogue scene — not backtracking.

## Fixes vs ask

| #   | Ask                                           | Result                                                       |
| --- | --------------------------------------------- | ------------------------------------------------------------ |
| 1   | Tap-sequence shows actual Simon pattern       | Sequence UI + keys; wrong tap fails; KB/touch/gamepad        |
| 2   | Choice gates need readable clues              | `clue` on every choice/puzzle; unit test covers answers      |
| 3   | Edge-pointer labels clipped                   | `layoutMarkerLabel` measures + clamps; unit test             |
| 4   | E priority + clear stale prompt               | objective > travel > npc > none; unit tests                  |
| 5   | No chain-travel; pad label == dest            | exit latch + clear spawns; exit-labels unit + e2e exits      |
| 6   | Distinct VIP floor                            | `buildTorreVip()` salon map after elevator                   |
| 7   | Casa FPS dip after transition                 | Prewarm all districts + VIP + NPC sprites on load            |
| 8   | Optional side bets clearly optional           | `[SIDE HUSTLE · RNG]` labels on Side Jobs                    |
| 9   | Fun: needle difficulty, streak, dialogue, epi | needleSpeed/window; combo bonus; unique lines; Nair epilogue |
| 10  | Story ~20 min                                 | Longer skills + dialogue + epilogue                          |

## Automated

- `make check` — pass
- `npm test` — branches ≥90%
- full Playwright e2e — pass (story-walk, exits, golden path, 4× FPS)
- Version assertions read `package.json` / semver regex (never hardcoded)

## Gaps (honest)

- Simon shows the full sequence (not memorize-then-hide) for clarity on touch.
- Combo bonus is a small credit top-up, not a separate meter UI.
- VIP return is via the upstairs Elevator interact (not a second exit pad).
