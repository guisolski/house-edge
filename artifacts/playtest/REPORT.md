# Playtest report — House Edge 1.3.0

Date: 2026-11-24

## Summary

**PASS** — golden path, three input modes, desktop FPS budget, and 4× CPU throttle FPS budget verified. Browser profile held ~60 FPS desktop and under 4×/6× CPU throttle. Console clean.

## Performance

| Scenario                                | Avg FPS | Frame ms | Result     |
| --------------------------------------- | ------- | -------- | ---------- |
| Desktop scripted walk (`make playtest`) | ~60     | ~16      | PASS (≥50) |
| 4× CPU throttle walk                    | ~59–60  | ~16–17   | PASS (≥50) |
| 6× CPU throttle (extra)                 | ~60     | ~16–17   | PASS       |

F3 FPS overlay sits bottom-left (clear of the play HUD).

## Steps

| Step                              | Result | Evidence                                   |
| --------------------------------- | ------ | ------------------------------------------ |
| Title + version `v1.3.0`          | pass   | title / browser                            |
| New Game → play HUD               | pass   | `01-title-play-keyboard.png`               |
| Walk / Shift run                  | pass   | browser video                              |
| Proximity prompt at NPC           | pass   | `02-prompt-npc.png` (+ trailing flush fix) |
| Dialogue Take the bet / Walk away | pass   | `03-dialogue.png`                          |
| Bet stake +/− + win chance        | pass   | `04-bet.png`                               |
| Travel UI                         | pass   | `05-travel.png`                            |
| World / camera                    | pass   | `06-world-art.png`                         |
| Touch stick + actions             | pass   | `mobile-01-touch.png`                      |
| Gamepad hints + menu nav          | pass   | `gamepad-01-play.png`                      |
| FPS walk budget                   | pass   | `07-fps-walk.png`                          |

## Gaps / follow-ups

- District art can still deepen beyond procedural tiles.
- Mutation suite optional before release tags (`make mutation`).
