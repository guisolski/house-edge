# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.19.1] — 2026-11-25

### Fixed

- ATM Hacker clear of `avenida-to-torre` pad (`INTERACT_RANGE`); was overlapping after Neon Snap asphalt relocate.
- `make check` / `npm run check` now runs `npm test` (same unit command as CI quality).

## [1.19.0] — 2026-11-25

### Fixed

- **Neon Snap (3rd round)**: full-width solid south/north tile walls + wall buildings (integer styles); free-path uses real collision; e2e Shift-run asserts stop; ATM Hacker relocated onto asphalt.
- Fair→Morro objective arrow follows a walkable path waypoint (not straight through buildings).
- Odds `> Central Fair` pad moved to the west edge; Mensageiro cleared off the pad route.
- Lockpick: Enter on a pin or Tab submits; hint text matches; e2e.
- Feira lockbox clue rewritten + audit.
- Epilogue: 500ms Enter-ignore on choices; closing line Close held ≥2s.
- Free roam after duel points at Dona Nair (or the hop toward her).
- Negotiate: any of the three offers wins (hush chip no longer a false miss).
- E-prompt sits under the player (no tag cover); nearest NPC when closer than objective; NPC tags clamped below HUD.
- Timing miss shows an on-panel hint.
- Stealth drone cones cheaper (fewer wedges, every other frame) for Odds Avenue FPS.

### Tests

- Unit: full-width walls + slideStep, path waypoints, free-roam pointer, negotiate any-offer, lockbox clue.
- E2e: `neon-snap-wall` Shift-run south stop + barricade screenshot.

## [1.18.1] — 2026-11-25

### Fixed

- **P0 softlock**: after VIP ↓, duel objective no longer shows `missing target`; foyer elevator re-rides up to Augusto.
- Neon Snap: full south/north construction walls on the real collision map + visible BARRICADE signs; free-path test ignores start/goal cone sweeps.
- Pad chain-travel: arrival while holding Run blocks walk-in exits until Run is released.
- Elevator ↓ shows **Pit Foyer · Floor 1** (▼); ↑ keeps Floor 42.
- Odds influencer clue re-audit (no “Bought likes” leak).
- Cage lockpick: on-screen control hint matched to keyboard / gamepad / touch.
- Tower lobby FPS: skip indoor rain; throttle lobby lights.

### Tests

- Unit: floor/objective invariant, VIP down→up duel, barricade walkability, run-release latch, influencer clue.
- E2e: `vip-down-duel` rides down then completes Augusto.

## [1.18.0] — 2026-11-25

### Added

- Neon Snap: south/north barricades + extra patrol drones; on-screen EXIT arrow; `droneFreePathExists` invariant.
- Pad arrivals spawn **off-pad** facing inward; leave/re-enter gate + 1.6s cooldown.
- VIP floor: visible elevator pad, `Elevator ↓` marker arrow, ride-down prompt.
- Sequence keydown input buffer (no dropped taps at ~150ms).
- Elevator fade ~1.2s with **VIP Salon · Floor 42** indicator.
- Hush chip consequence: Augusto line + −20% duel stake.

### Fixed

- Tag/sprite vs sign AABB coverage (all districts + VIP); elevator cars no longer duplicate neon labels.
- Seu Zé / Catador / Antena / VIP layout cleared of neon; BOTECO / FEIRA / ODDS / ELEVATOR repositioned.
- Epilogue: no Close on mandatory choices; choices stay visible; Saúde holds ≥3.5s.
- Cage lockpick + Pit Dealer dialogue/clue re-audit (no dog-eared leak).
- Pad bounce Odds↔Fair from held run.

### Tests

- Unit: extended label/sprite overlap, drone-free path, pad 1.5s walk, sequence buffer, hush stake, elevator 1.2s.
- E2e: exit leave/re-enter after cooldown.

## [1.17.0] — 2026-11-25

### Added

- **Real Neon Snap stealth** on Odds Avenue — patrolling drones with visible sight cones; spotted → checkpoint reset (no credit loss); e2e/debug skip via `completeStealthPerfect`.
- Sequence tension: time limits + `maxMisses` fail the encounter (chase/hack).
- Varied timing needle zones/speeds across story gates.
- Ambient steam particles (Feira / Odds) + pulsed neon signs; stronger NPC idle bob.
- Pad latch hysteresis (`EXIT_CLEAR_RANGE` > stand range) + short time latch.
- Elevator ride fade (~1.1s) before VIP floor swap.
- Automated per-district NPC-tag vs sign bounding-box non-intersection test.
- Clue audit: unique answer tokens + near-synonym ban; lockpick clues must be deducible.

### Fixed

- Stage Hand lockpick clue matches mid / raised / sunk without height labels.
- Pit Dealer / Barraca Tia / Kiko / Catador clues no longer leak answer labels or synonyms.
- NPC/pad tags no longer overlap ODDS 24h, CASA SUPREMA, or EXIT destination signs; tags proximity-only (~1.8 tiles); travel pads are arrow-only.
- Title: Enter / Space / gamepad A starts New Game.
- Esc closes stake + skill modals (Cage Runner lockpick included).
- Lockpick: Down no longer jumps to Cancel (`data-skip-nav`).
- Nair epilogue **Saúde** shows after either choice before credits (~2.8s).
- Post-credits ice pour labeled **Side hustle: ice pour**.

### Tests

- Unit: cone detection, stealth progress, clue synonym audit, label bbox overlap, latch hysteresis, epilogue both choices, sequence fail.
- E2e: story-complete / story-walk skip in-world stealth via `completeSkillPerfect`.

## [1.16.0] — 2026-11-25

### Added

- **Evade** skill — drone sight-cone path on Odds Avenue (`avenida-drone`).
- **Negotiate** skill — timed VIP Host offers with consequences (`torre-negotiate`).
- Lockpick tension: countdown timer, hidden pin, decoy clue, pick durability (snap on 0).
- Choice/puzzle clues are **indirect** (must not name the answer token).
- Build injects `<title>House Edge v{version}</title>` from `package.json`.
- Proximity NPC name tags; objective labels offset/hide near neon signs.
- Map layer prewarm cache + longer fade/elevator cover for district swaps.

### Fixed

- Credits **Skip credits** dismisses the roll (same as Continue exploring).
- Epilogue “Saúde…” line only appears after the final choice.
- All exit pads walk-in with latch (Central Fair in Morro included).
- Arrival spawn lands on the reciprocal pad (Torre → Avenida no longer mid-street).
- E-prompt anchors above the player; dropped the “also …” alt list.
- Sequence gates: arrows/WASD/A-B are sequence-only; Cancel via Esc.
- Stage Hand / long dialogue wraps and paginates in a scroll body.

### Tests

- Unit: title build, walk-in all pads, pad spawn, lockpick tension, indirect clues, evade/negotiate.
- E2e: Skip credits; document title matches package version; story-complete includes new beats.

## [1.15.0] — 2026-11-25

### Added

- **Lockpick** mini-game (set tumbler pins, then Submit) — used in Fair lockbox + Odds Avenue server-cage heist.
- Three main-path beats: Casa lockbox under the stage, server-cage infiltration, betrayal on the boulevard (choices that matter).
- Dialogue choice navigation: arrows / WASD + Enter / E / Space (also gamepad + touch); choices strip after pick so they cannot loop.
- Scrolling credits roll with Skip; buttons stay below the viewport.
- Title version reads from `package.json` (no hardcoded UI version string).

### Fixed

- VIP: Augusto Casa moved off the elevator pad; standing on the car prefers Elevator over NPC “Not now”.
- Every exit / elevator pad stays outside NPC interact radii (unit-tested).
- Epilogue: choice → closing line → credits automatically (Close no longer required; ending no longer bounces to play).
- Dona Nair first talk: choice labels point at Take the bet; reply confirms the loop is done.
- Morro Neon: clear east asphalt corridor to the Central Fair pad (blocking boteco house removed).

### Tests

- Unit: dialogue choice strip, VIP elevator priority, pad/NPC clearance, lockpick encode/judge, epilogue credits.
- E2e: keyboard selects dialogue option 2; story-complete / story-walk include new beats.

## [1.14.1] — 2026-11-25

### Fixed

- P0: timing/duel needle — drawn green zone matches judge; Stop captures needle at input (no frame delay); deterministic, no hidden RNG in skill gates.
- Skill phase miss retries the **current phase only** (duel no longer restarts); stake charged only on full win; story credits topped up so players cannot be credit-locked.
- Removed misleading “Retry odds +N%” on skill gates; misses widen/slow the timing zone with a clear toast. RNG soft pity toast capped at +16%.
- Epilogue is a short scene (NPC callbacks + final choice) ending in a credits roll.
- More NPC silhouette variants (0–5 palette/accessories) and building facade variety (free/CC0 procedural).

### Tests

- Unit: every timing gate edges/centre pass, outside fail; phase-miss retry; credit-lockout guard.
- E2e: duel Stop inside the drawn zone advances phase 1.

## [1.14.0] — 2026-11-25

### Added

- Simon-style sequence gates (visible arrow/color pattern; wrong tap fails) for chase/hack + duel phase 3; keyboard/touch/gamepad.
- Readable clues on every choice/puzzle skill gate; unit test asserts clue names the correct option.
- Distinct Casa VIP salon map (layout/tables/crowd) after the elevator ride.
- Skill combo/streak bonus; needle speed/zone vary by difficulty.
- Side Jobs labeled `[SIDE HUSTLE · RNG]` so optional grind is obvious.

### Fixed

- Edge-pointer / exit sign labels clamp the full measured box inside the viewport.
- E prompt: objective NPC > Travel pad > other NPCs; clears when out of range.
- Exit pads: arrival latch prevents chain-travel; spawns clear of pads; pad label == destination tested.
- Casa FPS hitch on district enter: prewarm/bake all districts + VIP + NPC sprites on load.
- Epilogue with Dona Nair expanded into a satisfying short scene.

## [1.13.0] — 2026-11-25

### Added

- Skill mini-games replace story coin-flips: timing, choice, puzzle, chase, hack; final duel is a 3-phase skill encounter.
- Story length: woven copper weigh-in, fair dancer cue, Odds courier shadow + lobby stealth; dialogue choices on key beats.
- Elevator fade/ride relocates Rita to the VIP floor with transition FX.
- Visual/audio feedback: screen flash, credit popups, travel/elevator SFX.
- NPC accessories + walk bob variants; deeper Morro house layers; fuller Casa pit tables/crowd.

### Fixed

- E prompt prioritizes the objective NPC (shows alt if nearby); edge pointer labels stay fully on-screen.
- Fair/Odds NPCs sit off main lanes and step aside visually; camera north inset raised so heads clear the HUD.

## [1.12.2] — 2026-11-25

### Fixed

- Objective marker is a large bouncing yellow arrow + name on the current target only; side quests are dim dots; off-screen targets get an edge pointer with distance.
- Objective HUD: `Talk to Name (District)` with flavour title on a secondary line.
- Camera/player north clamp keeps the sprite below the HTML HUD (Morro ridge clip regression).
- F3 FPS is a DOM overlay (was covered by `.hud`); e2e asserts toggle.
- Wall-slide on blocked tiles so ramp corners don’t wedge on single-axis keys.
- Esc closes the pause menu (and returns from Travel/Jobs/Upgrades); E prompt clears immediately on move.
- Antena beat reworded to “Jack the LED antenna” (no fake climb).
- First story bet (`agua-gelada`) ~72% win chance for onboarding.

## [1.12.1] — 2026-11-25

### Fixed

- Casa Suprema softlock: Elevator is a visible interactable with world marker + `E — Use` after Pit Dealer (was “look around” with no target).
- Every required story beat is tagged to an NPC/object; unit test + walk+E e2e fail if a marker has no reachable interactable.
- Exit hotspots use a plus-shaped pad + 2.6 tile stand range for `E — Travel to <full name>`; walk-on travel only on exit tiles (no bounce-back near spawns).
- Odds Avenue / Casa spawn cleared of doorway pads so arrival cannot soft-loop to the previous district.
- Exit signs use full destination names (Central Fair, Odds Avenue, …).

## [1.12.0] — 2026-11-25

### Fixed

- Central Fair / all district EXIT pads inset from walls; signs show full destination names and stay on-screen; e2e walks every exit.
- Post-ending HUD is free-roam (epilogue optional); objectives prefer walkable exit hops over Travel menu.
- E picks nearest + facing NPC and shows the name; default stake ≈12% of credits (never all-in).
- World signs hide under dialogue/bet modals; dialogue audited vs objective flow.
- Morro: side ramps + plaza approaches so terraces are reachable without hunting gaps.

### Changed

- Casa Suprema: foyer + pit floor beats before VIP; denser floor art.
- NPC body/hair/outfit variants (4 silhouettes) with idle bob; cyan markers for available side quests.

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
