# Playtest REPORT — House Edge v1.19.1

Independent playtest #21 of v1.18.1 (art 8, fun 6, ~23 min, FPS 56–60 with one Odds dip to 30). P0 VIP softlock already fixed. Ship **v1.19.0** then **v1.19.1** (ATM clear of torre pad; `make check` includes `npm test`).

## Verdict: PASS

`make check` (lint + typecheck + **npm test**) + e2e **46/46** green. Coverage branches **90%+**. Neon Snap south Shift-run hits physical wall (e2e + screenshot).

## Bugs fixed

| #   | Issue                                               | Result                                                               |
| --- | --------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | Neon Snap south/north open (neon labels only)       | PASS — full-width blocked tiles + wall buildings; e2e Shift-run stop |
| 2   | Fair→Morro arrow through buildings                  | PASS — BFS `nextPathWaypoint` along walkable path                    |
| 3   | Odds Fair pad on Mensageiro route                   | PASS — pad at west edge (2,12); Mensageiro mid-boulevard             |
| 4   | Lockpick hint Tab Submit but Tab no-op              | PASS — Enter on pin + Tab submit; e2e                                |
| 5   | Feira lockbox clue not deducible                    | PASS — rewritten clue + audit                                        |
| 6   | Epilogue Enter-spam / Close flash                   | PASS — 500ms choice arm + ≥2s closing hold                           |
| 7   | Post-duel “Free roam” with no Nair pointer          | PASS — points at Nair or hop toward her                              |
| 8   | Negotiate hush chip marked miss after “Deal sealed” | PASS — any of three offers wins                                      |
| 9   | E-prompt covers tags / wrong NPC; Antena HUD clip   | PASS — nearest NPC; prompt under feet; tags clamped                  |
| 10  | Needle miss with no hint                            | PASS — on-panel miss hint                                            |
| 11  | Odds Avenue instant FPS dip ~30                     | PASS — cheaper cones (fewer wedges, every other frame)               |

## Fun / art

- Physical south/north wall buildings + BARRICADE / NO PASS / WALL signs on Odds Avenue.
- Objective arrow follows corridors instead of cutting through terraces.

## Measured

| Metric                          | Value                                      |
| ------------------------------- | ------------------------------------------ |
| User playtest #21 (walking)     | ~23 min (v1.18.1 baseline)                 |
| Paced harness (v19-timing.json) | **10:01** wall                             |
| Ending / epilogue               | true / true                                |
| FPS travel sample (Odds incl.)  | min ~60, avg ~60                           |
| E2e                             | 46/46 desktop + mobile                     |
| Unit coverage branches          | 90%+                                       |
| Neon Snap free-path             | only through drone cones (no south bypass) |

## Artifacts

- `v19-neon-snap-barricade.png` — physical south barricade + BARRICADE label (Shift-run stop)
- `v19-01-title-play.png` … `v19-07-fps-travel.png` (paced harness)
- `v19-04-lockpick-tension.png` — Feira lockbox
- `v19-05-drone-stealth.png` — Neon Snap cones
- `v19-timing.json`

## Scores (playtest #21 baseline → this build)

|     | #21 (v1.18.1) | v1.19.0 target        |
| --- | ------------- | --------------------- |
| Art | 8             | hold / lift barricade |
| Fun | 6             | lift (route clarity)  |

## Gaps

- Optional: further Odds FX budget if FPS dips under heavier drone counts.
