# Playtest REPORT — House Edge v1.13.0

Fresh-player follow-up after v1.12.2 PASS. Goal: replace coin-flip story loop with skill/choice encounters, stretch story toward ~20 min, elevator feedback, prompt/art polish.

## Verdict

**PASS** for ship gates. Story gates are skill encounters (timing/choice/puzzle/chase/hack; Augusto duel = 3 phases). Woven copper + dancer + courier/stealth beats added. Elevator fades to VIP floor. Desktop e2e story-walk + F3 + 4× FPS ≥50. Coverage branches **90.3%**.

## Measured story time

| Method                                                               | Result                    |
| -------------------------------------------------------------------- | ------------------------- |
| Content estimate (31 main beats, 110 lines, 28 skills, human pacing) | **~19–21 min**            |
| Scripted walk+E with short sleeps (auto perfect skills)              | ~4 min (not a human read) |
| Prior v1.12.2 human playtest                                         | 13–14 min                 |

Target ~20 min via meaningful beats/skills/choices — not padding loops.

## Browser playtest (computer-use, fresh player)

| Check                            | Result                         |
| -------------------------------- | ------------------------------ |
| Skill UI (not coin-flip) on Nair | **PASS** — timing meter, Stop! |
| Dialogue choices                 | **PASS** — loud/quiet          |
| Unique Catador marker after Nair | **PASS**                       |
| F3 FPS ~60                       | **PASS**                       |
| Esc open/close                   | **PASS**                       |
| North ridge head below HUD       | **PASS** (clamp at y=4)        |
| Elevator fade → VIP (30,8)       | **PASS**                       |
| Console errors                   | **None**                       |

Artifacts: `v130-*.png`, `v130-walkthrough.webm`.

## Fixes vs ask

| #   | Ask                                       | Result                                                              |
| --- | ----------------------------------------- | ------------------------------------------------------------------- |
| 1   | Skill/choice mini-games; duel multi-phase | Story bets open skill UI; losses cost stake, retry is skill not RNG |
| 2   | ~20 min meaningful story                  | +copper weave, dancer, courier, stealth; dialogue choices           |
| 3   | Elevator move + FX/SFX                    | Fade + VIP relocate; flash/credits/SFX on interact/resolve          |
| 4   | E prioritizes objective                   | Objective NPC wins over exit/nearest; alt name shown                |
| 5   | Edge pointer label clip                   | Shorten + clamp label box on-screen                                 |
| 6   | NPCs block paths                          | Off-lane Fair/Odds placements + visual step-aside                   |
| 7   | Camera north head clip                    | HUD inset 140px + min tile Y headroom                               |
| 8   | Art                                       | Accessories/variants, Morro depth layers, Casa tables/crowd         |

## Automated

- `npm test` — pass (branches ≥90%)
- `npm run lint` / `typecheck` — pass
- `e2e/story-walk` — PASS (unique marker + skill perfect)
- `e2e/story-complete` — PASS (skill perfect + woven beats)
- `e2e/playtest` golden path — PASS (skill panel, not bet panel)
- `e2e/fps-overlay` — PASS
- `e2e/perf-throttle` — PASS (≥50 FPS @ 4×)

## Gaps (honest)

- Skill UIs are functional DOM panels (not full arcade sprites).
- Credit feedback is primarily the toast (fx flash is brief).
- Off-screen marker label can still crowd the FPS strip.
- Grind-side jobs remain RNG (intentional).
