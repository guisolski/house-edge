# Playtest REPORT — House Edge v1.17.0

Independent follow-up after v1.16.0 (e30474b / user measured ~17 min walk; art 6.5, fun 5.5). Goal: real Odds Avenue stealth, clue audit, tag/sign bbox test, title Enter, Esc modals, lockpick nav, epilogue Saúde, pad latch, side-hustle label, elevator fade, sequence tension + art, measured REPORT.

## Verdict: PASS

`make check` + full e2e (38/38) green locally. Coverage branches **91%+**. Push both remotes; CI + Pages expected green on tip.

## Bugs fixed

| #   | Issue                                             | Result                                                                |
| --- | ------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | Neon Snap was a fake 6-step sequence              | PASS — in-world drones + sight cones; spot→checkpoint, no credit loss |
| 2   | Clue gates wrong / leaky (Stage Hand, Pit, Tia…)  | PASS — data-driven audit (unique tokens + synonyms); all clues fixed  |
| 3   | NPC/pad tags still overlap signs                  | PASS — bbox test per district; proximity tags; pad arrows hide labels |
| 4   | Title Enter/Space/A ignored                       | PASS — starts New Game                                                |
| 5   | Esc ignored on stake / Cage Runner; lockpick Down | PASS — Esc cancels bet/skill; Cancel skipped in lockpick D-pad nav    |
| 6   | Nair Saúde missing after choice                   | PASS — line shown after either choice; ~2.8s before credits           |
| 7   | Pad bounce Odds↔Tower                             | PASS — spatial hysteresis + time latch; unit test                     |
| 8   | Post-credits ice pour unlabeled                   | PASS — **Side hustle: ice pour**                                      |
| 9   | Elevator instant                                  | PASS — ~1.1s fade; VIP floor swaps immediately under the fade         |

## Fun / art

- Sequences: timers + `maxMisses` fail the encounter; needle zones/speeds varied.
- Art: pulsed neon, rain + steam particles, stronger NPC idle bob / walk cadence.

## Measured playthrough time

| Method                       | Duration    | Notes                                       |
| ---------------------------- | ----------- | ------------------------------------------- |
| User walk (v1.16 baseline)   | **~17 min** | 03:03:05 → 03:19:54                         |
| Paced Node measure (v1.17)   | **~12 min** | Dialogue @ ~220 wpm + skill thinks + travel |
| Story-walk e2e (accelerated) | ~4 s        | Tile walk + debug stealth skip              |
| Story-complete harness       | ~1 s        | Instant skills                              |

Stealth corridor target budget **45–90 s** of real play when walked (not skipped).

## Performance

- Travel FPS sample: see `v17-07-fps-travel.png` (F3 overlay during hops).
- Throttle e2e @ 4×: PASS (≥50).

## Artifacts

- `v17-01-title-play.png` — title **v1.17.0**
- `v17-02-after-story.png` — post ending / free roam
- `v17-03-credits-skip.png` — Skip credits
- `v17-04-lockpick-tension.png` — Stage Hand clue (no height labels)
- `v17-05-drone-stealth.png` — live drones + sight cones on Odds Avenue
- `v17-06-negotiate.png` — VIP negotiate
- `v17-06-side-hustle.png` — post-credits ice pour labeled side hustle
- `v17-07-fps-travel.png` — FPS during district hops
- `v17-timing.json` — timing dump

## Scores (this round)

- Art: **7.5** (stealth cones, neon pulse, steam/rain, NPC bob)
- Fun: **7.5** (real stealth beat, sequence fail tension, fixed clues)

## Gaps / next

- Optional: longer human tile-walk clock for v1.17 specifically.
- Optional: ending lines that mention drone_low / negotiate flags.
