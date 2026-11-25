# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.11.0] — 2026-11-24

### Fixed

- Casa Suprema west exit is a single visible pad (no hidden aisle teleport to Odds Avenue).
- Exit pads are 1-tile, aligned with EXIT signs; unit test asserts every exit overlaps a visible EXIT sprite/sign.
- Perf: bake static buildings/props/landmark/signs into the map cache; per-frame y-sort is NPCs+player only; cached letterbox backdrop — restores ≥50 FPS under 4× CPU throttle on desktop.

### Changed

- Story toward ~20 min: Odds Avenue mid-story twist, Fair pirate-radio beat, Morro return choice (Nair vs Fio), 1–2 optional side quests per district, short laje epilogue.
- Fair market art: richer stall produce/awnings, goods crates, crowd clusters, calçadão landmark.

## [1.10.0] — 2026-11-24

### Fixed

- Camera clamped to map bounds in every district — no flat green/blue/magenta void at edges; letterbox uses dark themed scenery.
- Morro stair collision matches the 6-tile walkable spine (railings mark the edges).
- Dialogue: only the focused button is highlighted; hidden modals clear stale DOM nodes.
- Actor draw order y-sorts so the lower sprite is in front when overlapping.

### Changed

- Morro: darker retaining faces + stronger shadows, houses overlapping terrace heights, stair step shading + railings.
- Casa Suprema: luxury casino interior (carpet, tables/VIP booths, chandelier) instead of glass towers.

## [1.9.0] — 2026-11-24

### Changed

- Art v1.9 (main): Morro tall 3-tile retaining walls + drop shadows, one wide central staircase landmark, stacked irregular houses overlapping terraces; removed left window-dot column; Fair calm asphalt/plaza (no speckled floor / yellow-window bands); building flips + recolor/size variants.
- Story: longer dialogue + Neon radar shop beat (`avenida-radar`) toward ~20 min.

### Fixed

- Camera scrolls at Morro north edge so the player stays on-screen.
- Generous E interaction radius + on-screen `E` prompt; story NPCs preferred over side-job rematches; ATM Hacker moved off Odds Avenue story cluster.
- NPCs are non-blocking (walk-through).
- Esc → Side Jobs → Close returns to the main menu.

## [1.8.0] — 2026-11-24

### Changed

- Art v1.8: hillside Morro terraces/retaining walls, bigger 3/4 buildings, player marker + larger characters, signs on top; Feira/Avenida facade edges; no window-dot fills.
- Bugs: objective uses district/NPC names + redirect toast; Side Jobs [SAFE] / [BET] labels; Feira NPCs on street; bet-panel glow skip for FPS.

## [1.7.0] — 2026-11-24

### Changed

- Art cleanup: drop muddy AI sprites; hand-authored 3/4 buildings, crisp bitmap-font signs, unified character scale, glowing stair exits, denser Morro terraces + props. See `docs/credits.md`.

## [1.6.0] — 2026-11-24

### Changed

- Art direction: CC0 Kenney/OGA packs + AI pixel props, neon atlas, hand-composed Tiled maps per district (Morro hillside favela). See `docs/credits.md`.

## [1.5.2] — 2026-11-24

### Added

- Ending **Continue exploring** keeps the completed save so side jobs/grind stay reachable; **Play again** requires confirm.

### Fixed

- Exit Travel prompt only when standing on the exit pad tile (hitbox matches visual).
- Broke objective/toast points at the nearest odd-job NPC when credits are under the stake floor.
- Mobile objective font size raised for readability.
- Title/touch: drop aria-hidden focus warnings (no aria-hidden on hidden UI).

## [1.5.1] — 2026-11-24

### Fixed

- Mobile bet/dialogue panels: sticky action footer so Place bet / Cancel / Walk away stay fully visible on short viewports.

## [1.5.0] — 2026-11-24

### Added

- Expanded story (~18 beats) with mid-game twist, side quests, and Esc → Upgrades.
- Dense district maps, unique tiles, larger NPC silhouettes, ending art scene.
- World odd-job NPCs with cooldown/cap; NPC tile collision.

### Fixed

- Tower letterbox void; mobile bet clipping / WASD on touch; pity story-only (cap 62%).
- Ending toast overlap; title version; aria focus warning via inert.

## [1.4.0] — 2026-11-24

### Fixed

- Softlock at 0 credits / negative rep: **Odd jobs (safe pay)** always available; story stakes soft-clamp.
- Story-gate odds rebalanced (~even money) with pity on retries; Monte Carlo completion gate.
- Dialogue spoilers removed; map edges sealed + exit pads auto-travel.
- Mobile dialogue sits above touch controls; favicon uses `%BASE_URL%`; title blur avoids aria-hidden focus.
- Canvas focuses on load/click so keyboard always reaches the game; NPC idle bob/blink.

## [1.3.0] — 2026-11-24

### Performance

- Baked tile/sprite atlas + per-district map layer cache; cheap rain/lights; throttled HUD prompt writes with trailing flush.
- F3 FPS overlay (bottom-left); `make playtest` FPS budget + 4× CPU throttle gate (≥50 avg FPS).

### Gameplay / UX

- Stake +/− selection; win chance matches odds + house edge; short roll reveal.
- Story bets require **Take the bet** / **Walk away** (no auto-open); losses no longer advance story.
- Fixed Luna “Manolo” → Rita; removed pre-bet spoilers; menu hints match input mode; title shows `v1.3.0`.
- Faster walk + Shift run; Side Jobs in every district; inert/aria-hidden panels; favicon.

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
