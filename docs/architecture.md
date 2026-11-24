# Architecture

## Overview

```text
UI / Input / Audio / Excalibur tick
            │
            ▼
     typed EventBus
            │
            ▼
 GameSession → Player / Story / World / Betting / Grind / Save
```

## Rules

- TypeScript strict mode.
- Systems communicate through `EventBus` (`src/core/event-bus.ts`).
- Pure logic lives under `src/systems` and `src/content` (unit tested).
- Rendering/UI (`src/rendering`, `src/ui`, `src/game`) are thin adapters.
- Functions stay ≤ ~20 lines (ESLint `max-lines-per-function` + `complexity`).

## Key modules

| Module          | Responsibility                                             |
| --------------- | ---------------------------------------------------------- |
| `GameSession`   | Orchestrates bets, story, travel, audio prefs, persistence |
| `StorySystem`   | Flags + beats                                              |
| `WorldSystem`   | District unlocks + bounds                                  |
| `betting.ts`    | Odds math                                                  |
| `createGameApp` | Wires Excalibur loop, HUD, touch, keyboard, gamepad        |

## Engine

Excalibur.js provides the frame loop and pixel-art canvas. World pixels are drawn by a custom procedural view for deterministic art without external atlases.
