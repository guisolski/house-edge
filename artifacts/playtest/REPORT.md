# Playtest REPORT — House Edge v1.20.0

Independent playtest #22 of v1.19.1 (~22 min, no softlock; art 7.5 / fun 6.5). Ship **v1.20.0** under the same rules.

## Verdict: PASS

Neon Snap south/north asphalt strips sealed with solid tiles + police barrier / container props. Prod-build Playwright holds Shift+Right 4s and asserts the player never clears the segment (`endX` stayed **11** on both strips).

CI (`8c877f2`): GitHub **quality** / **build** / **deploy (Pages)** all success.

## Bugs fixed

| #   | Issue                                      | Result                                                             |
| --- | ------------------------------------------ | ------------------------------------------------------------------ |
| 1   | Neon Snap Shift+D south bypass (4th time)  | PASS — seal y13–14 / y9–10 x12–34; prod e2e + barrier screenshots  |
| 2   | Drone cones tiny cyan dots                 | PASS — translucent cyan fill + yellow outline every frame          |
| 3   | Foyer Guard / Mole / Luna behind buildings | PASS — plaza leash in front of buildings; depth sort               |
| 4   | E-prompt wrong NPC; tags clipped / overlap | PASS — objective-first in range; clamp tags + prompt to safe inset |
| 5   | Epilogue closing ~1s greyed Close          | PASS — ≥3s hold + auto-credits after Saúde                         |
| 6   | Extra Enter chains rematch bets            | PASS — 450ms interact lock after dialog close                      |
| 7   | Courier “match 4” shows 3 buttons          | PASS — four distinct arrows on pad                                 |
| 8   | Morro/Fair pads next to Seu Zé / spawn     | PASS — Morro pad (38,22); Fair arrival (3,12)                      |
| 9   | Lockpick hint never mentions Space raise   | PASS — hint + Space on focused pin                                 |
| 10  | Elevator needle hard to time               | PASS — window 0.2 / needleSpeed 0.62                               |
| 11  | F3 FPS not mentioned in pause/controls     | PASS — menu hints + docs/controls                                  |

## Measured

| Metric                      | Value                                          |
| --------------------------- | ---------------------------------------------- |
| User playtest #22 (walking) | ~22 min (v1.19.1 baseline)                     |
| Prod south Shift hold       | **4008ms**; startX 11 → endX **11**; won false |
| Prod north Shift hold       | **4015ms**; endX **11**; won false             |
| Neon Snap free-path         | only through drone cones (no strip bypass)     |
| E2e                         | 46/46 + 2/2 prod                               |
| Unit coverage branches      | 90%+                                           |

## Artifacts

- `v20-neon-snap-south-barrier.png` — south police barrier stopping Shift-run (prod build)
- `v20-neon-snap-north-barrier.png` — north barrier strip (prod build)
- `v20-south-walk-time.json` / `v20-north-walk-time.json` — hold duration + end x

## Scores (playtest #22 baseline → this build)

|     | #22 (v1.19.1) | v1.20.0 target         |
| --- | ------------- | ---------------------- |
| Art | 7.5           | lift (solid barriers)  |
| Fun | 6.5           | lift (no strip bypass) |

## Gaps

- None for this ship list.
