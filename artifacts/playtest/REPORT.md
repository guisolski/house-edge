# Playtest REPORT — House Edge v1.18.0

Independent playtest #19 of v1.17.0 (ratings art 7, fun 6; story ~20 min; FPS ~60 / min 52 in Augusto). Goal: tag/sprite/sign bbox coverage, Neon Snap no free path, pad leave/re-enter, VIP exit, epilogue choices, sequence buffer, elevator 1.2s, clue re-audit, hush chip consequence.

## Verdict: PASS

`make check` + full e2e (38/38) green. Coverage branches **91%+**. Paced New Game → ending wall-clock **10:01** (user walking playtest #19 ~20 min). FPS travel sample min ~60 / avg ~60.

## Bugs fixed

| #   | Issue                                              | Result                                                                 |
| --- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | Tag/sign overlaps (Seu Zé, Catador, Elevator, VIP) | PASS — bbox covers tags+sprites+all districts+VIP; elevator unlabeled  |
| 2   | Neon Snap south bypass                             | PASS — barricades + 5 drones; EXIT arrow; no drone-free path test      |
| 3   | Pad bounce Odds↔Fair                               | PASS — off-pad spawn, arrival-only gate, 1.6s cooldown; e2e clear wait |
| 4   | VIP no visible exit                                | PASS — elevator pad + `Elevator ↓` arrow + Ride down prompt            |
| 5   | Epilogue choices below scroll / Close / Saúde      | PASS — no Close on choices; sticky actions; Saúde ≥3.5s                |
| 6   | Sequence drops keys ~150ms                         | PASS — keydown buffer; rapid-input unit test                           |
| 7   | Elevator fade too fast                             | PASS — ~1.2s + Floor 42 indicator                                      |
| 8   | Cage / Pit clues                                   | PASS — lockpick positional grease; Pit dialogue no dog-eared           |
| 9   | Hush chip no consequence                           | PASS — Augusto line + −20% duel stake                                  |

## Fun / art

- Neon Snap EXIT beacon + player→exit arrow; south/north barricades force the drone corridor.
- Elevator ride shows `VIP Salon · Floor 42` during the fade.

## Measured

| Metric                          | Value                                    |
| ------------------------------- | ---------------------------------------- |
| User playtest #19 (walking)     | ~20 min                                  |
| Paced harness (v18-timing.json) | **10:01** wall (07:57:08 → 08:07:09 UTC) |
| Ending / epilogue               | true / true                              |
| FPS travel sample               | min ~60, avg ~60                         |
| E2e                             | 38/38 desktop + mobile                   |
| Unit coverage branches          | 91%+                                     |

## Artifacts

- `v18-01-title-play.png` … `v18-07-fps-travel.png`
- `v18-timing.json`
- Desktop district stills (`v18-desktop-*.png`)

## Scores (playtest #19 baseline → this build)

|     | #19 (v1.17.0) | v1.18.0 target |
| --- | ------------- | -------------- |
| Art | 7             | hold / lift    |
| Fun | 6             | hold / lift    |

## Gaps

- Optional: ending lines that mention drone_low / negotiate flags beyond hush.
- CI tip SHA noted after GitHub quality/build/deploy green.
