# Playtest report — House Edge 1.10.0

Independent check against v1.9.0 feedback (void edges, stairs collision, dialog highlight, y-sort, art).

## Verdict

**Bugs: PASS.** **Art: ~6.5/10** (void gone; Morro/Casa clearer; still not a polished favela/casino). Console: **0 errors**. FPS ~60.

## Before → After

| Item          | v1.9 / ask                              | v1.10 result                                                                                          |
| ------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Map-edge void | Flat green/blue/magenta beyond world    | Camera clamped to map; dark scenery backdrop (never brand flat fill). E2e edge-flatness assert added. |
| Morro stairs  | Edges not walkable (~100px from center) | 6-tile spine (18–23) + rail columns; climb works across full visible width.                           |
| Dialog focus  | Both Take/Walk highlighted              | Only `:focus` gets yellow/magenta; idle buttons muted grey. Hidden modals clear DOM.                  |
| Y-sort        | Overlap order wrong                     | Actors sorted by tile y; marker drawn with player in the same pass.                                   |
| Morro depth   | Flat bands / grey stair column          | Darker retaining faces + stronger lip/shadow; step-shaded stairs + light rails. Still banded.         |
| Casa Tower    | Same tower look as Odds Avenue          | Carpet floor, gaming tables / VIP booths, chandelier landmark, gold accents. Still simple.            |

## Automated

- `npm test` — pass (coverage ≥90%)
- `npm run lint` — pass
- `make playtest` / `make e2e` — including edge-not-flat assertion

## Honest art note

Void fix is the biggest visual win. Stairs and Casa are readable as distinct from Avenue, but Morro still reads as horizontal terraces more than an organic hillside, and Casa furniture is blocky. Independent art ~6.5/10 — not claiming 8+.

## Shots

- `08-morro-north-no-void.png` — north edge without green void
- `09-avenida-north-no-void.png` — Odds Avenue north
- `10-casa-edges-no-void.png` — Casa left/bottom without magenta bars
