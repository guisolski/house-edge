# Playtest report — House Edge 1.4.0

Date: 2026-11-24

## Summary

**PASS** for owner blockers after v1.4. Softlock cleared, story gates completable (Monte Carlo + live playthrough), ending panel sticks, mobile dialogue above controls, FPS ~60.

## Blockers

| #   | Issue                          | Result                                                   |
| --- | ------------------------------ | -------------------------------------------------------- |
| 1   | Softlock 0 credits / neg rep   | PASS — Odd jobs (safe pay) always available              |
| 2   | Gate bet too harsh             | PASS — pixo ~46% + pity; median story bets ≤22 / 80 sims |
| 3   | Dialogue spoilers              | PASS — outcome lines removed / softened                  |
| 4   | Fair edge walk-off             | PASS — sealed borders + exit auto-travel                 |
| 5   | Mobile dialogue under controls | PASS — panel above stick                                 |
| 6   | Favicon / aria                 | PASS — `%BASE_URL%` icons; title blur on New Game        |
| 7   | NPC idle + menu speed          | PASS — bob/blink; shorter bet reveal                     |
| 8   | Visual polish                  | IMPROVED (still procedural ~7/10)                        |

## Performance

Desktop + 4× CPU throttle avg FPS ≥50 (observed ~60).

## Evidence

`make playtest` (golden path, FPS, throttle, full story ending, mobile dialogue).
