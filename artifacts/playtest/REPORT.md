# Playtest REPORT — House Edge v1.22.0

Independent playtest #26 of live v1.21.0 (~28 min, art 7, fun 6.5). FAIL tags + Enter rematch/auto-choice; Neon Snap too easy; VIP arrow/camera; Odds Fair path; pads; Nair reach/bet-lose text; needle curve. Folded into **v1.22.0**.

## Verdict: PASS (playtest #26 fixes landed)

## Bugs fixed

| #   | Issue                                                         | Result                                                                  |
| --- | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | Duplicate / floating tags (objective + nameplate / waypoints) | PASS — one sprite nameplate; arrow-only objectives; e2e labels == 1     |
| 3   | Enter rematch after Nair close; Enter auto-picks choices      | PASS — 500ms rematch + 250ms choice arm; e2e:prod real keyboard on Nair |
| —   | Neon Snap cleared in ~15s first try                           | PASS — faster/wider drones; walk solver still ≥1.2s safe dwell          |
| —   | VIP exit arrow fixed on screen; ~43px camera jump             | PASS — elevator arrow at pad; soft-follow camera                        |
| —   | Odds→Fair blocked by NPC crowd                                | PASS — west lane cleared; NPCs off Fair approach                        |
| —   | Edge pads accidental                                          | PASS — stand range 1.15 + 220ms dwell + facing                          |
| —   | Nair hard to reach; lose advanced objective                   | PASS — spawn plaza; lose keeps `falou_nair` unset; copy matches         |
| —   | Dancer Sol harshest vs Augusto easy                           | PASS — Sol eased; Augusto phase-1 tightened                             |

## Measured

| Metric     | Value                       |
| ---------- | --------------------------- |
| Unit       | 298 tests; branches ≥90%    |
| E2e        | 52/52 desktop+mobile        |
| E2e:prod   | 7/7 (incl. Enter×2 on Nair) |
| Story-walk | ~20s wall                   |
| Commit     | `5d7802a`                   |

## Verification (real input)

- Labels: e2e `npc-labels` — each district name count == 1
- Enter rematch: prod E → close → Enter×4 @80ms → no dialog
- Enter choice: prod E → Enter×3 within 250ms → choices still visible
- Neon Snap: prod clear with real walk (no debug skip)

## CI

- Pushed `5d7802a` to origin + github `main`.
