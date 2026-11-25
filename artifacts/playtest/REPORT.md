# Playtest REPORT — House Edge v1.21.0

Independent playtest #25 of live v1.20.2: completed to credits, keyboard only (~67 min inflated by automation lag; Neon Snap ~9 min / 16–17 resets). PASS: E-prompt names, 4× Enter gate, Neon Snap beatable + steady cones, Casa pad label, epilogue closing, Augusto 3 phases. Ship **v1.21.0**.

## Verdict: PASS (fixes landed)

## Bugs fixed

| #   | Issue                                            | Result                                                                  |
| --- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| 1   | Name tags overlap / trail; E-prompt naming wrong | PASS — sprite-anchored tags, objective always shown, quest NPCs planted |
| 2   | Neon Snap rematch after clear; NPCs in lane      | PASS — completed line; lane empty; longer safe dwell                    |
| 3   | First Enter after dialog open dropped            | PASS — modal held-key gate + 150ms; close rematch still 400ms           |
| 4   | Casa/Augusto needles too generous                | PASS — tighter windows; assist only after 2+ misses                     |
| 5   | Foyer objective arrow wanders to elevator        | PASS — fixed Guard target on Casa floor                                 |
| 6   | FPS ~30 with dialogs on Odds/VIP                 | PASS — freeze/cull actors under modals; e2e ≥50 @4× with dialog open    |

## Measured

| Metric               | Value                          |
| -------------------- | ------------------------------ |
| Unit                 | 253 tests; branches 90.24%     |
| E2e                  | 50/50 desktop+mobile           |
| E2e:prod             | 6/6                            |
| Story-walk           | ~18s wall                      |
| Paced prod           | ~0.33 min (`v210-timing.json`) |
| Neon Snap prod clear | ~5.7s real KeyD                |
| Commit               | `9ed3d38`                      |

## Verification (real input)

- Neon Snap clear: prod e2e KeyD adaptive walk (no `completeSkillPerfect`)
- Neon Snap done: prod e2e talks after `drone_ok` → completed line, no stealth
- Spawn prompt: prod e2e text contains `Dona Nair`
- Enter gate: prod e2e Close + 4× Enter @80ms → no dialog
- FPS: e2e 4× throttle walk + Odds dialog open ≥50 avg

## CI

- GitHub `CI` + `GitHub Pages` green on `915e2fd` (v1.21.0).

## Gaps

- Human confirm of tag stacking under live Odds crowd density.
