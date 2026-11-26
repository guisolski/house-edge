# QA chapter jumps

Hidden URL parameter for playtesting late story beats without a full run:

```text
/?chapter=feira
/?chapter=avenida
/?chapter=torre
/?chapter=vip
/?chapter=epilogue
```

| Value      | Starts at                     | District         | Notes                         |
| ---------- | ----------------------------- | ---------------- | ----------------------------- |
| `feira`    | After Seu Zé unlocks the Fair | Feira Central    | ~280 cr                       |
| `avenida`  | After Luna’s pendrive leak    | Odds Avenue      | ~360 cr                       |
| `torre`    | After Margin hearing          | Casa Tower foyer | ~480 cr                       |
| `vip`      | After elevator skill          | Casa Tower VIP   | VIP floor map                 |
| `epilogue` | Post-Augusto free roam        | Morro Neon       | Victory flags; no ending gate |

Opens a **new game**, completes prior story beats, unlocks districts, seeds credits/reputation, and lands in play. Intended for agents and humans verifying late content — not a player-facing feature.

Also available on the harness as `session.debugStartChapter('feira')`.
