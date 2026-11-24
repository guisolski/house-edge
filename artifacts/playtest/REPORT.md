# Playtest report — House Edge 1.8.0

Date: 2026-11-24

## Summary

**PASS** vs independent v1.7.0 playtest (art 4/10). Morro is now terraced hillside with retaining-wall lips and a central stair spine; Feira/Avenida use facade edge bands instead of window-dot alley fills; buildings are larger 3/4 volumes; player has ground ring + arrow and ~1.5× sprites; signs draw above glow. Objective copy names districts/NPCs; Side Jobs labeled [SAFE]/[BET]; Feira NPCs on the street; glow skipped while bet panel open. FPS still ~60 in play. Honest: still hand-pixel, not Kenney-sheet density.

## Before (v1.7 live — owner shots)

| Issue           | Observed                                                                     |
| --------------- | ---------------------------------------------------------------------------- |
| Morro           | Flat grid of identical tiny houses; window-dot / ladder fills between lanes  |
| Feira / Avenida | Large green-dashed / window-dot placeholder bands                            |
| Buildings       | Small icons on a grid                                                        |
| Player          | Hard to spot; no marker; ODDS sign occluded by glow                          |
| Objective       | Stale “Travel to feira-central via exit”; Luna “Come back later” with no tip |
| Side Jobs       | “Boteco water rotation” opens a bet with no SAFE/BET label                   |
| Fair NPCs       | Behind stalls → “Nobody in range”                                            |
| FPS             | Dip to ~47 when bet panel opens                                              |

## After (v1.8)

| Check                 | Result                                                               |
| --------------------- | -------------------------------------------------------------------- |
| Morro hillside        | PASS — dirt fill, terrace lips, central spine, irregular house sizes |
| No placeholder fills  | PASS — blocked tiles are facades; alley quiet; edge bands are walls  |
| Bigger 3/4 buildings  | PASS — favela 48–56px, stalls 56px, towers taller                    |
| Player marker + scale | PASS — yellow ring + arrow; 32×54 sprites                            |
| Signs on top          | PASS — painted after actors/glow                                     |
| Objective             | PASS — “Go to Central Fair — talk to Kiko…”; Luna toast redirects    |
| Side Jobs labels      | PASS — `[SAFE]` / `[BET]` + menu hint                                |
| NPC access            | PASS — Feira NPCs on asphalt; range 2.1                              |
| Bet panel FPS         | PASS — skip world glow/rain while modal open                         |
| Story length          | PASS — added `feira-courier` dialogue beat                           |
| Gates                 | PASS — unit + playtest 7/7                                           |

## Screenshots

- Before: owner `morro-neon.png`, `central-fair.png`, `odds-avenue.png`
- After: `v18-desktop-morro.png`, `v18-desktop-feira.png`, `v18-desktop-avenida.png`

## Honest gaps

- Morro terraces read as hillside better than v1.7, but still a top-down schematic — not a painted isometric favela.
- Character art remains blocky rectangles at larger size.
- Bet-panel FPS fix is “skip glow,” not a full UI perf pass.
