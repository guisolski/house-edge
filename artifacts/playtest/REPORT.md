# Playtest REPORT — House Edge v1.15.0

Independent follow-up after v1.14.1 (35b0b22). Goal: dialogue keyboard/gamepad/touch, VIP elevator vs Augusto, epilogue→credits auto + scrolling roll, Nair choice clarity, Morro Fair path, +3 story beats + lockpick mini-game, ~20 min direct path.

## Verdict: PASS

## Bugs fixed

| #   | Issue                                                    | Result                                                                       |
| --- | -------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | Dialogue choices mouse-only; Enter always option 1       | PASS — arrows/WASD cycle; Enter/E/Space confirm; e2e selects option 2        |
| 2   | VIP: Augusto on elevator; E → Not now                    | PASS — Augusto at (32,14); pad prefers Elevator; prompt `E — Use (Elevator)` |
| 3   | Epilogue stuck; credits after Close+E; text over buttons | PASS — choice → closing → auto credits; scrolling roll; Skip + buttons below |
| 4   | Nair choices loop until Take the bet                     | PASS — labels say “then Take the bet”; Take bet only after pick              |
| 5   | Morro boteco house blocks Fair corridor                  | PASS — street y=16 clear east to Fair pad                                    |

## Content

- **Lockpick** mini-game (set tumbler pins → Submit) — not needle/tap/choice.
- Beats: `feira-lockbox`, `avenida-server`, `avenida-betrayal` (choices that matter).
- Story-walk + story-complete e2e updated; `docs/story-script.md` timing ~18–22 min.

## Measured playthrough time

- **Paced content proxy** (read dialogue + ~12s/skill, `travelTo` hops, no tile walking): **11.8 min** (128 lines, 31 skills, ending + epilogue).
- **Direct-player estimate with walking** (add ~15s average between objectives across ~34 beats): **~19–20 min** (was ~12 min wall-clock in v1.14.1).
- Accelerated completeness harness: ~3.1 min.
- No padding/backtracking — lockbox heist, server infiltration, betrayal beat only.

## Performance

- FPS e2e @ 4× throttle: PASS (≥50 avg).
- Scripted walk budget: PASS.

## Artifacts

- `v15-01-title.png` … `v15-09-credits-roll.png` (+ prior golden-path shots from `make playtest`)
- VIP prompt verified: `E — Use (Elevator)` while standing on VIP car

## Scores (this round)

- Art: 7
- Fun: 7 (lockpick + betrayal lift agency)

## Gaps / next

- Optional: more lockpick difficulty curve; betrayal flags surfacing in Margin/ending lines.
