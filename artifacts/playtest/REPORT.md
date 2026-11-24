# Playtest report — House Edge 1.7.0 (art cleanup)

Date: 2026-11-24

## Summary

**PASS** for cleanup vs v1.6.0 owner screenshots. Muddy AI sprites removed. Signs use a 5×7 bitmap font at integer scale and are readable (`BOTECO NAIR`, `LAJE BET`, `FEIRA`, `ODDS 24h`, `CASA SUPREMA`). Buildings are hand 3/4 facades (doors/windows/roofs/shadows). Player and NPCs share one 22×38 base. Exit pads are cyan stairs + lit doorway (not a green rectangle). Morro has terraces, stair spines, stacked houses, wires, tanks. FPS ~60. Honest: Morro reads as terraced neon hillside more than photographic favela; ground tiles still look procedural.

## Before (v1.6.0 — owner screenshots)

| Issue      | Observed                                                              |
| ---------- | --------------------------------------------------------------------- |
| Signs      | Garbled / bloomed (`BOT N`, `CAS SUPR`) — downscaled AI images        |
| Decor      | Muddy grey mound (Morro), brown stall blobs (Feira)                   |
| Buildings  | Flat magenta/teal striped rectangles (atlas road GIDs as "buildings") |
| Exit       | Bright green placeholder rectangle                                    |
| Floor      | Large empty dark voids                                                |
| Scale      | Large player vs tiny NPC clusters                                     |
| Morro read | Floating blocks in space — not a hillside favela                      |

## After (v1.7.0)

| Check                  | Result                                                                    |
| ---------------------- | ------------------------------------------------------------------------- |
| No muddy AI in runtime | PASS — AI sprite files removed; atlas unused                              |
| Readable signs         | PASS — crisp bitmap font; occasional NPC/player occlusion                 |
| 3/4 buildings          | PASS — houses/stalls/towers with facade, roof, shadow, side face          |
| Character scale        | PASS — same 22×38 base @ SCALE 3                                          |
| Exit pads              | PASS — stair steps + magenta/yellow doorway (not green rect)              |
| Floor fill             | PASS — wires, tanks, lamps, crates; Feira cobble softened                 |
| Morro hillside         | PASS with caveat — terraces + stairs readable; silhouette variety limited |
| FPS                    | PASS — 59–60 avg (desktop + mobile shot)                                  |
| Gates / story          | PASS — unit + e2e gates                                                   |

## Screenshots

- Before: owner `morro.png`, `feira.png` (v1.6)
- After: `v17-desktop-morro.png`, `v17-desktop-feira.png`, `v17-desktop-avenida.png`, `v17-desktop-torre.png`, `v17-mobile-morro.png`

## Honest gaps remaining

- Hand-pixel buildings beat muddy AI, but denser CC0 sheet drops (Kenney/LPC) would still raise quality.
- Signs can be occluded by actors; z-order/placement polish left.
- Feira/Avenida grounds are better than barcode stripes but still tile-procedural, not painted market floors.
