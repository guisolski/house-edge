# Playtest REPORT — House Edge v1.20.1

Independent playtest #23 of v1.20.0 (Neon Snap fixed; boss 3 phases; credits; ~29 min incl. test overhead; art 7 / fun 6). Ship **v1.20.1**.

## Verdict: PASS

Epilogue closing line is its own scrolled panel (≥3s) with required Close. Objective E-prompt wins in-range clusters. Prod/dev e2e green.

## Bugs fixed

| #   | Issue                                         | Result                                                          |
| --- | --------------------------------------------- | --------------------------------------------------------------- |
| 1   | Epilogue closing below fold / auto-credits    | PASS — own panel, scroll, ≥3s, key/Close required; e2e viewport |
| 2   | E-prompt neighbour before objective; tag pile | PASS — objective-first + nearest-2 stacked tags; unit cluster   |
| 3   | Enter chains rematch after lockbox/dialog     | PASS — 400ms + key-release gate                                 |
| 4   | Needle Stop late; Enter ignored               | PASS — keydown sample; Enter/Space/A                            |
| 5   | Lobby Cam Enter chose Walk away               | PASS — focus `.btn-take-bet`                                    |
| 6   | Fio sequence ≠ pad                            | PASS — `↑ → ↓ ←`                                                |
| 7   | Elevator west → Odds; no Casa enter label     | PASS — exit (5,18); `Enter Casa Tower →`                        |
| 8   | Odds mid-lane block ~x305                     | PASS — floor tiles + re-assert y11–12 asphalt                   |
| 9   | Checkpoint idling spotted                     | PASS — checkpoint (12,11) cone-free                             |
| 10  | Nair under Boteco / behind tenement           | PASS — (14,16) forward plaza                                    |
| 11  | Odds FPS ~30                                  | PASS — cheaper cones + tag cap                                  |

## Measured

| Metric                      | Value                                    |
| --------------------------- | ---------------------------------------- |
| User playtest #23 (walking) | ~29 min (v1.20.0, incl. overhead)        |
| Story-walk e2e (desktop)    | ~17.8s wall (objective walk + E only)    |
| Paced scripted beats (prod) | ~32s / 0.53 min (`v201-timing.json`)     |
| Epilogue closing hold       | ≥3s before Close arms                    |
| E2e                         | 48/48 desktop+mobile; prod Neon Snap 2/2 |
| Unit coverage branches      | 90.14% (988/1096)                        |

## Artifacts

- `v201-epilogue-closing-line.png` — Saúde line visible in viewport (e2e)
- `v201-epilogue-closing-line-prod.png` — same on vite preview of `dist`
- `v201-credits-prod.png` — credits after Close
- `v201-timing.json` — paced beat stamps on prod build
- Prior Neon Snap barrier shots remain valid under the sealed corridor

## Scores (playtest #23 baseline → this build)

|     | #23 (v1.20.0) | v1.20.1 target   |
| --- | ------------- | ---------------- |
| Art | 7             | hold             |
| Fun | 6             | lift (prompt/UI) |

## Gaps

- Further Odds FX budget if FPS still dips under heavier drone counts.
