# Playtest REPORT — House Edge v1.18.1

Independent playtest #20 of v1.18.0 (art 8, fun 6) hit a **P0 softlock** after VIP ↓. Ship v1.18.1 ASAP: duel target across floors, Neon Snap real barricades, run-release pad latch, elevator direction, influencer clue, lockpick hints, lobby FPS.

## Verdict: PASS

`make check` + full e2e (**40/40**) green. Coverage branches **90%+**. P0 softlock fixed: VIP ↓ → lobby objective points at elevator ↑ → Augusto duel completes.

CI (`26db882`): GitHub **quality** / **build** / **deploy (Pages)** all success.

## Bugs fixed

| #   | Issue                                            | Result                                                                 |
| --- | ------------------------------------------------ | ---------------------------------------------------------------------- |
| P0  | VIP ↓ → `missing target` / elevator refuses duel | PASS — floor-aware objective + foyer elevator re-ride to VIP           |
| 2   | Neon Snap south bypass still open                | PASS — full south/north walls on collision map; free-path ignores ends |
| 3   | Hold-run Odds → Fair → Morro chain               | PASS — arrival while Run held blocks walk-in until release             |
| 4   | Elevator ↓ showed Floor 42 ↑                     | PASS — ▼ Pit Foyer · Floor 1 / ▲ VIP Salon · Floor 42                  |
| 5   | Influencer clue leaked “Bought likes”            | PASS — Inflated metrics + indirect overnight/cold-walls clue           |
| 6   | Cage lockpick controls unclear                   | PASS — on-screen hint for keyboard / gamepad / touch                   |
| 7   | Tower lobby FPS ~36                              | PASS — skip indoor rain; throttle lobby lights                         |

## Fun / art

- Visible BARRICADE / NO PASS signs + crate clutter on Odds Avenue south wall.
- Elevator floor card matches travel direction.

## Measured

| Metric                           | Value                                    |
| -------------------------------- | ---------------------------------------- |
| User playtest #20 (walking)      | ~20 min class (v1.18.0 baseline)         |
| Paced harness (v181-timing.json) | **10:01** wall (09:01:39 → 09:11:40 UTC) |
| Ending / epilogue                | true / true                              |
| FPS travel sample                | min ~60, avg ~60                         |
| E2e                              | 40/40 desktop + mobile                   |
| Unit coverage branches           | 90%+                                     |
| P0 path                          | VIP ↓ lobby → ↑ duel (e2e + screenshots) |

## Artifacts

- `v181-vip-down-lobby.png` — foyer after VIP descent (elevator objective)
- `v181-vip-up-duel-marker.png` — back on VIP aiming at Augusto
- `v181-vip-down-then-duel.png` — duel complete / ending
- `v181-01-title-play.png` … `v181-07-fps-travel.png` (paced harness)
- `v181-timing.json`

## Scores (playtest #20 baseline → this build)

|     | #20 (v1.18.0) | v1.18.1 target |
| --- | ------------- | -------------- |
| Art | 8             | hold           |
| Fun | 6             | lift (no P0)   |

## Gaps

- Optional: further lobby FX budget if FPS dips again under heavier throttle.
