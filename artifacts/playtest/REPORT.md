# Playtest report — House Edge 1.5.1

Date: 2026-11-24

## Summary

**PASS** for owner blockers after browser playtest (desktop + mobile) and green CI/Pages on the prior 1.5.0 push; 1.5.1 ships a mobile panel footer fix verified at 393×852 and 360×640.

## Checks

| Area                | Result                                                             |
| ------------------- | ------------------------------------------------------------------ |
| Softlock / odd jobs | PASS — world givers + cooldown/cap                                 |
| Story length        | PASS — 18 beats, mid-twist, upgrades; grind lengthens play         |
| Visuals             | IMPROVED ~6/10 — dense night Morro, unique tiles; still procedural |
| Tower void          | PASS — nightSky letterbox, no black void                           |
| Mobile bet / WASD   | PASS — sticky footer actions; WASD hidden on touch                 |
| Mobile dialogue     | PASS — Take the bet / Walk away both visible above controls        |
| NPC collision       | PASS                                                               |
| Exit pads           | PASS — auto-travel on exit tiles                                   |
| Pity                | PASS — story gates only, hard cap 62%                              |
| Ending              | PASS — illustrated scene; no toast overlap                         |
| FPS                 | PASS — ≥50 desktop + 4× throttle (`make playtest`)                 |
| Console             | PASS — zero errors / non-favicon 404s on local + live smoke        |

## Commands

- `make playtest` — 7 passed (golden path, touch, gamepad, FPS, throttle, story-complete, mobile dialogue)
- Live Pages title: `House Edge v1.5.1` after this deploy

## Gaps (honest)

- Art is denser and night-paletted but still procedural tile soup (alley can read as “rack/window” repeats, not hand-painted favela). Not 8–9/10 owner-bar art.
- Full ~20 min needs exploration/grind/side bets; first-try golden path remains shorter if every story bet wins immediately.
- Minor: some NPC sprites can draw over nearby neon signs.
