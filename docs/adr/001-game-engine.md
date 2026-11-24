# ADR 001 — Choose Excalibur.js as the 2D web engine

## Status

Accepted

## Context

Odds Neon needs a TypeScript-first 2D engine for pixel art, neon lighting/glow, tile-like worlds, keyboard + touch + gamepad input, audio hooks, and unit-testable game logic.

Candidates researched:

- **Phaser 4** — excellent WebGL filters (bloom/glow), GPU tilemaps, lighting, large ecosystem; heavier runtime; logic often entangled with scenes.
- **Excalibur.js 1.x** — written in TypeScript, BSD-2, pixel-art mode, 2D lights, glow/bloom postprocessors, Tiled/LDtk support, clean scene/actor model.
- **Kaplay** — great for jams; weaker fit for production lighting, large worlds, and strict testing gates.
- **PixiJS + custom loop** — maximum control; highest implementation cost for input, camera, and tooling.

## Decision

Use **Excalibur.js v1** as the runtime shell (loop, canvas, pixel-art sampling). Keep **all gameplay rules** in pure TypeScript systems behind a typed event bus so logic stays headless-testable without the renderer.

## Consequences

### Pros

- Native TypeScript types and APIs.
- Built-in pixel-art mode, lighting, and shader/postprocess pipelines for neon glow.
- Friendly license and modest bundle for static GitHub Pages hosting.
- Clear separation: Excalibur draws/ticks; `GameSession` owns rules.

### Cons

- Smaller asset/plugin ecosystem than Phaser.
- Some advanced GPU tilemap features require more manual work than Phaser 4.
- Lighting cost must be budgeted on low-end mobile.

## Alternatives considered

Phaser 4 remains the strongest alternative if we later need heavier filter stacks or GPU tilemap layers without custom code.
