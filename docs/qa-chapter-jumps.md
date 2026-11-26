# QA chapter jumps

Hidden URL parameters for playtesting late story beats and skill panels without a full run:

```text
/?chapter=feira
/?chapter=avenida
/?chapter=torre
/?chapter=vip
/?chapter=epilogue
/?minigame=lockpick
/?minigame=sequence
/?minigame=needle
/?minigame=offer
/?minigame=hack
/?minigame=quiz
/?timescale=0.33
/?chapter=epilogue&timescale=0.33
/?minigame=needle&timescale=0.33
```

## `?chapter=`

| Value      | Starts at                     | District         | Notes                                 |
| ---------- | ----------------------------- | ---------------- | ------------------------------------- |
| `feira`    | After Seu Zé unlocks the Fair | Feira Central    | ~280 cr                               |
| `avenida`  | After Luna’s pendrive leak    | Odds Avenue      | ~360 cr                               |
| `torre`    | After Margin hearing          | Casa Tower foyer | ~480 cr                               |
| `vip`      | After elevator skill          | Casa Tower VIP   | VIP floor map                         |
| `epilogue` | Post-Augusto free roam        | Morro Neon       | Victory flags; talk to Nair → credits |

Opens a **new game**, completes prior story beats, unlocks districts, seeds credits/reputation, and lands in play. Intended for agents and humans verifying late content — not a player-facing feature.

Also available on the harness as `session.debugStartChapter('feira')`.

## `?minigame=` (playtest #46)

Opens that skill panel directly over the current scene (or a fresh new game if no `?chapter=`).

| Value      | Bet / panel                    |
| ---------- | ------------------------------ |
| `lockpick` | Feira lockbox                  |
| `sequence` | Feira radio (pirateiro)        |
| `needle`   | Samba odds timing needle       |
| `offer`    | Torre negotiate / timed choice |
| `hack`     | Antena sinal puzzle            |
| `quiz`     | Feira tipster quiz             |

Combine with `?chapter=` to land in a district first, then open the panel.

## `?timescale=` (playtest #46)

Slows **all minigame timers and reveals** (needle countdown/grace, sequence reveal, offer/lockpick/sequence clocks). Clamped to `(0, 1]` — never speeds up. Example: `?timescale=0.33` runs clocks at ~33% speed so headless / CPU-throttled playtests can inspect panels frame-by-frame.

QA only — do not expose in player docs beyond this file.
