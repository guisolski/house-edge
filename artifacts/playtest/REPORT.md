# Playtest report — House Edge 1.5.2

Date: 2026-11-24

## Summary

**PASS** — five post-1.5.1 polish items verified in browser (desktop + mobile) and `make playtest` (7/7).

## Checks

| Item                   | Result                                                       |
| ---------------------- | ------------------------------------------------------------ |
| Continue exploring     | PASS — returns to play with save intact; Side Jobs open      |
| Play again confirm     | PASS — separate confirm step before wipe                     |
| Exit pad hitbox        | PASS — Travel prompt only on exit tiles; off-pad hidden      |
| Broke hint             | PASS — objective names nearest odd-job NPC under stake floor |
| Mobile objective size  | PASS — computed `16px` on touch                              |
| aria-hidden focus warn | PASS — zero console warnings on title → New Game             |
| FPS / playtest         | PASS — `make playtest` 7/7                                   |

## Gaps

- Art direction unchanged (owner deciding); no new art pass this release.
