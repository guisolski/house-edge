# Playtest REPORT — House Edge v1.20.2

Independent playtest #24 of v1.20.1 (live tab title confirmed): **REGRESSION** — Neon Snap unbeatable (cone flicker/bursts, no readable safe window; never reached Casa/epilogue). PASS on #24: Fio=pad, needle Enter, Take-bet focus, checkpoint idle 15s, Odds FPS 56–61. Ship **v1.20.2**.

## Verdict: PASS (fixes landed)

Neon Snap readable + walk-solvable; spawn E-prompt is Dona Nair; Enter rematch gated; crowded tags de-overlapped. Prod e2e clears Neon Snap with real keys.

## Bugs fixed

| #   | Issue                                       | Result                                                                  |
| --- | ------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | Neon Snap unbeatable (flicker + lane sweep) | PASS — steady cones, alternating patrols + cover, ≥1.2s walk windows    |
| 2   | E-prompt Antena/DJ/Margin steals objective  | PASS — spawn beside Nair; NPCs spaced; live `nearbyNpc` objective-first |
| 3   | Enter spam rematch after Close              | PASS — input-layer release + 400ms gate                                 |
| 4   | Crowded tags overlap (Bia/Catador)          | PASS — nearest-2, larger stack, screen nudge                            |

## Measured

| Metric                      | Value                                                         |
| --------------------------- | ------------------------------------------------------------- |
| Story-walk e2e (desktop)    | ~18.1s wall (objective walk + E only)                         |
| Paced scripted beats (prod) | ~21.4s / 0.36 min (`v202-timing.json`)                        |
| Neon Snap prod clear        | ~5.0s real KeyD adaptive walk; `drone_ok`                     |
| E2e                         | desktop+mobile + prod (`neon-snap-clear` / prompt / debounce) |
| Unit coverage branches      | 90.16% (1008/1118)                                            |

## Artifacts

- `v202-neon-snap-cleared-prod.png` — corridor cleared on prod build (real inputs)
- `v202-epilogue-closing-line-prod.png` — Saúde closing line on prod
- `v202-credits-prod.png` — credits after Close
- `v202-timing.json` — paced beat stamps on prod preview
- `v202-01-title-play.png` / `v202-neon-snap-start.png`

## Scores (playtest #24 baseline → this build)

|     | #24 (v1.20.1) | v1.20.2 target      |
| --- | ------------- | ------------------- |
| Art | hold          | hold                |
| Fun | blocked       | restore (Neon Snap) |

## CI

- GitHub `CI` + `GitHub Pages` green on `0d17ba8` (v1.20.2).

## Gaps

- Human playtest of v1.20.2 still needed to confirm cone readability + tag spacing under real walking FPS.
