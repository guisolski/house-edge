# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] — 2026-11-24

### Added

- Research docs under `docs/research/` (game design, level design, UX/input) with cited guidelines (GD/LD/UX/LT).
- Input-adaptive HUD: keyboard hints, touch analog stick + actions, gamepad hints + menu focus nav; live device switching.
- Proximity interactions, bet modal with stake/odds/roll, camera-follow district maps, objective markers.
- `make playtest` Playwright golden path with keyboard / touch / gamepad screenshots.

### Fixed

- Stacked menus, free bets without NPC range, missing travel/jobs flows, placeholder-only streets.

## [1.1.0] — 2026-11-24

### Changed

- Renamed the game from **Odds Neon** to **House Edge** across UI, package name (`house-edge`), docs, and save-key namespace.
- GitHub Pages base path fixed to `/house-edge/` for https://guisolski.github.io/house-edge/.

## [1.0.0] — 2026-11-24

### Added

- Playable House Edge campaign (~20 minute story) across four Brazilian cyberpunk districts.
- Betting-centric gameplay loop with grind jobs and upgrades.
- Excalibur.js shell, procedural pixel art, procedural synthwave audio.
- Keyboard, touch, and gamepad input.
- Typed event bus architecture with strict TypeScript.
- Vitest coverage gates (>90%), Playwright e2e, Stryker mutation testing.
- CI workflow and GitHub Pages deploy workflow with configurable `BASE_PATH`.
- English documentation set under `docs/`, plus `AGENTS.md` / `INIT.md`.
- Optional Docker/nginx packaging.

### Notes

- Language policy: English for code, UI, and docs; Brazilian flavor in setting/art/music/slang.
- Pre-corp informal street lotteries are lore-dead; corporations own every licensed draw.
