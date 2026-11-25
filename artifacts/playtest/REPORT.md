# Playtest report — House Edge 1.11.0

Independent check against v1.10.0 feedback (Casa exit teleport, Fair art, story length, y-sort).

## Verdict

**Bugs: PASS** (Casa west aisle no longer teleports). **Story length: ~21 min careful / ~5–12 min speedrun.** **Art: ~7/10** (Fair stalls/crowds improved; still blocky). Console: **0 errors**. FPS **~60**.

## Before → After

| Item               | v1.10 / ask                            | v1.11 result                                                                                |
| ------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| Casa west teleport | Oversized/hidden exit snags west walks | Single pad at (2,12) + EXIT sign; aisle walks stay in Torre                                 |
| Exit visibility    | Mixed pad sizes / misaligned signs     | 1-tile pads; EXIT signs within 2.5 tiles; unit test asserts overlap                         |
| Fair art           | Weakest district                       | Market stalls with produce/awnings, crates, crowd clusters, calçadão landmark               |
| Y-sort             | Possible Fair glitch                   | Props share foot-y sort with buildings/actors; behind/front stall checks OK                 |
| Story ~20 min      | New player ~10–12 min to ending        | Twist + Fair radio + Morro return choice + sides + epilogue; careful estimate **~21.4 min** |

## Measured story time

| Method                                                                 | Result                                                                       |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Content model (80 main dialogue lines × 5.2s + 20 bets × 22s + travel) | **~21.4 min** main path; **~23.8 min** with half the side quests             |
| Paced harness (scripted delays, no real walking)                       | 4.7 min wall clock (under-counts exploration; 40 bet attempts incl. retries) |
| Prior v1.10 new-player report                                          | ~10–12 min — v1.11 adds meaningful beats, not padding                        |

Honest call: a careful first play should land near the **20 min** target; a known-route speedrun can still finish under 12.

## Automated

- `npm test` — pass (coverage ≥90%)
- `npm run lint` — pass
- `make playtest` — pass (FPS, edge flatness, story+epilogue)
- Browser: Fair market, Casa exit walk, y-sort checks — pass

## Honest art note

Fair now reads as a market (awnings, produce piles, crowds) instead of an empty plaza. Crowds are still silhouette clusters; some stall/kiosk overlaps can muddy. Casa exit is a clear door pad. Pixel signs use `EXIT > DEST` (bitmap font has no `→`).

## Shots

- `11-fair-market.png` — Fair stalls / produce / crowd
- `12-casa-exit-pad.png` — single west EXIT pad
- `13-fair-ysort.png` — player in front of stall
- Video: `/opt/cursor/artifacts/v111-fair-casa-exit.webm`
