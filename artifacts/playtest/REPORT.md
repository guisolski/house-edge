# Playtest REPORT — House Edge v1.16.0

Independent follow-up after v1.15.0 (5e3fa4f / user measured ~14 min). Goal: title build inject, Skip credits, epilogue line order, walk-in pads + pad spawn, label/prompt fixes, sequence Esc-only cancel, FPS fade/prewarm, lockpick tension, indirect clues, +2 beats (evade/negotiate), side quests woven, measured timing (no inflated estimate).

## Verdict: PASS (pending CI green on push)

## Bugs fixed

| #   | Issue                                        | Result                                                                |
| --- | -------------------------------------------- | --------------------------------------------------------------------- |
| 1   | `index.html` title stuck on v1.14.1          | PASS — Vite injects `House Edge v{package.json}`; unit + e2e assert   |
| 2   | Skip credits no-op                           | PASS — Skip dismisses roll like Continue exploring; e2e click + Enter |
| 3   | Nair “Saúde…” before choice                  | PASS — `dialogueVisibleLines` hides post-choice lines until pick      |
| 4   | Exit pads inconsistent (Morro Fair needed E) | PASS — all pads walk-in + latch; e2e/unit over every exit             |
| 5   | Label overlap + Stage Hand crowding          | PASS — offset/hide near signs; proximity tags; dialogue scroll wrap   |
| 6   | E prompt “also …” + far from player          | PASS — anchored above player; no also-list                            |
| 7   | Sequence arrows wrap to Cancel               | PASS — sequence owns arrows/WASD; Cancel via Esc                      |
| 8   | Avenida from Torre mid-street spawn          | PASS — arrive on reciprocal pad                                       |
| 9   | FPS ~30 on district/elevator                 | PASS — keep prewarmed map layers; longer fade/elevator cover          |

## Content

- Lockpick tension: timer, hidden pin, decoy clue, pick durability (snap).
- Choice/puzzle clues **indirect** (no answer tokens).
- Beats: `avenida-drone` (evade cones), `torre-negotiate` (timed offers).
- Side quests remain one optional per district; drone/negotiate woven on main path.
- Dialogue tightened (less expository Stage Hand / VIP Host).

## Measured playthrough time

Timestamps from paced run (`tools/measure-v160.mjs`, dialogue @ ~220 wpm + skill think delays, `travelTo` hops — **no tile walking**):

| Mark                   | ISO                      | Elapsed   |
| ---------------------- | ------------------------ | --------- |
| New Game               | 2026-11-25T05:42:38.997Z | 0:00      |
| Ending / epilogue wall | 2026-11-25T05:52:39.254Z | **10:00** |

- **Paced content wall-clock: 10:00** (see `v16-timing.json`).
- **With walking** (user’s method): prior v1.15 human path was ~14 min; +drone +negotiate +lockpick tension → expect ~16–18 min real, not a padded 19–20 claim.
- Accelerated story-complete harness remains ~1 min.

## Performance

- Travel/elevator FPS sample: min ~60, avg ~60 (`v16-07-fps-travel.png`).
- Throttle e2e @ 4×: existing suite PASS (≥50).

## Artifacts

- `v16-01-title-play.png` — title v1.16.0
- `v16-02-after-story.png` — post ending
- `v16-03-credits-skip.png` — Skip credits UI
- `v16-04-lockpick-tension.png` — timer / hidden pin
- `v16-05-drone-evade.png` — evade sequence
- `v16-06-negotiate.png` — negotiate offers
- `v16-07-fps-travel.png` — FPS during district hops
- `v16-timing.json` — raw timing + FPS

## Scores (this round)

- Art: 7
- Fun: 7 (lockpick tension + evade/negotiate)

## Gaps / next

- Optional: surface negotiate / drone choice flags in ending lines.
- Optional: tile-walk timed playthrough for a pure human-clock number.
