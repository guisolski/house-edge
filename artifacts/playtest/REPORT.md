# Playtest report — House Edge 1.2.0

Date: 2026-11-24

## Summary

**PASS** — golden path + three input modes verified via `make playtest` / Playwright desktop Chromium. Console clean (no errors / 404s asserted in golden path).

## Steps

| Step                     | Result | Evidence                                         |
| ------------------------ | ------ | ------------------------------------------------ |
| Title → New Game         | pass   | `01-title-play-keyboard.png`                     |
| Proximity prompt at NPC  | pass   | `02-prompt-npc.png`                              |
| Dialogue                 | pass   | `03-dialogue.png`                                |
| Bet modal (stake/odds)   | pass   | `04-bet.png`                                     |
| Travel UI                | pass   | `05-travel.png`                                  |
| World / camera / streets | pass   | `06-world-art.png`                               |
| Touch stick + actions    | pass   | `mobile-01-touch.png`, `mobile-02-menu.png`      |
| Gamepad hints + menu nav | pass   | `gamepad-01-play.png`, `gamepad-02-menu-nav.png` |

## Guidelines applied (cites)

- Proximity + prompt — **GD-4**
- Bet stake/odds/roll — **GD-3**
- Objective strip + marker — **GD-1**
- Paths/landmarks/camera — **LD-1…LD-6** (see research docs)
- Input-adaptive chrome — **UX-1…UX-7**
- Neon lighting pass — **LT-1 / LT-2**

## Gaps / follow-ups

- Pixel art is procedural (readable streets/buildings/neon) but not hand-painted atlas quality.
- Mutation suite not re-ground after every UI split; run `make mutation` before release tags.
