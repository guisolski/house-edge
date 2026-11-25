# Playtest REPORT — House Edge v1.14.1

Independent follow-up after v1.14.0 (056a753). Goal: P0 needle/duel judge fix, phase-only retries, no credit lockout, skill pity clarity, real epilogue + credits, art variants.

## Verdict

**PASS** for ship gates. Drawn green zone == judged zone (deterministic); Stop captures needle at input; phase miss retries current phase only with no stake drain; story skills top up credits so the path cannot softlock; epilogue is a short scene with NPC callbacks + choice + credits roll. Coverage branches **≥90%**. Story-walk e2e + duel-in-zone e2e + 4× FPS ≥50.

## Fixes vs ask

| #   | Ask                                             | Result                                                                                               |
| --- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | P0 needle/duel zone inverted                    | `timingZone` draws + `judgeTimingStop` judges the same lo/hi; Stop uses `needle.style.left` at click |
| 1b  | Unit tests every needle gate + duel e2e in-zone | `allTimingPhases` edges/centre; `e2e/duel-needle.spec.ts` Stop in zone                               |
| 1c  | Audit other needle gates                        | Same path for agua, samba, forró, pixo, return, elevator, VIP, dancer, duel                          |
| 2   | Duel fail too punishing                         | Phase miss → retry same phase; stake only on full win; `ensureStoryCredits`                          |
| 2b  | Never credit-lock story                         | Unit: 0 credits still accepts + clears story skill                                                   |
| 3   | Retry odds +N% past 100%                        | Removed on skills; miss widens/slows zone with toast; RNG pity capped +16%                           |
| 4   | Epilogue only a toast                           | Multi-NPC callbacks + final choice → credits roll panel                                              |
| 5   | NPC/building art repetitive                     | Body variants 0–5 (cap, afro, sash…); more favela/avenida facades                                    |

## Automated

- `make check` — pass
- `npm test` — branches ≥90%
- full Playwright e2e — pass (story-walk, duel-needle, exits, golden path, 4× FPS)
- Version from `package.json` / semver (never hardcoded in e2e asserts)

## Screenshots

- `14-duel-needle-in-zone.png` — duel phase 1 with needle parked in the drawn green zone before Stop
- `15-morro-variants-v141.png` — Morro world with NPC/building variants
- `16-epilogue-credits-v141.png` — epilogue credits roll after Nair’s laje scene
- Prior v1.14.0 set retained under `artifacts/playtest/` for regression compare

## Gaps (honest)

- Credits roll is a short animated panel, not a full cinematic cutscene.
- RNG side hustles still use soft pity; only skill gates dropped the misleading +N% climb.
- Next: v1.15.0 content pass (per ask).
