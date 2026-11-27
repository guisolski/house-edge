# Changelog

## [1.22.27] — 2026-11-27

### Fixed
- **Type scale (P0)**: shared `--type-*` tokens — buttons ≥16px, meta ≥14px, body ≥16px; dialogue choices, lockpick pins, credits, status lines included. E2e walks every visible text node in panels/dialogues/cards/credits.
- **Lockpick timer (P0)**: fixed timer slot above pins; soft-miss retry resets to the frozen scaled budget (no 42→116 double-scale).
- **Lockpick solvability (P0)**: per-pin pista bullets; pickDurability 5/7; pin click selects then raises; perfect-info + chip-follower unit tests.
- **Needle focus (P1)**: Para! stays focusable (aria-disabled while arming); open/retry focus lands on Stop, not Cancel.
- **Win/fail height (P2)**: skill panel + result cards share exact `height: min(52vh, 420px)`.

## [1.22.26] — 2026-11-27

### Fixed
- **Panel helper text (P1)**: sequence/hack hints, meta, and status ≥15/14px; Sequência glyphs ≥28px.
- **Dialogue boxes (P1)**: same `clamp(520px, 60vw, 960px)` width as skill panels; body ≥17px.
- **Win/fail cards (P1)**: share panel width + `min-height` so the card does not jump shorter.
- **QA timescale (P1)**: `?timescale=` survives `?chapter=` / `startNew` (was wiped); duel hack input timer e2e-asserted.
- **Title screen (P2)**: chrome ≥16px rendered at 1280×720 and 1920×1080.

### Added
- Rendered-metrics e2e for dialogue / title / win card / glyphs at 1280, 1920, 390.

## [1.22.25] — 2026-11-26

### Fixed
- **Augusto duel (P0)**: QA timescale slows needle sweep + every duel phase; hack uses the same reveal→hold→input; duel needle matches regular tier (~0.8); Leave / maxMisses show a lose result card (never silent world drop); clear duel win/lose headlines.
- **Lockpick clarity (P1)**: selected pin gets ▶ + strong border; per-pin chips are ↑ subir / ↓ descer / ✓ certo; last-test chips stay separate from heights; lockpick timer already respects timescale.
- **Panel width (P1)**: desktop `clamp(520px, 60vw, 960px)`; buttons ≥44px; win/fail cards share panel size; title logo/tagline/buttons scaled up.
- **Sequence hold (P2)**: fixed slot height — hold uses glow, not a larger font.

### Added
- Duel win + lose e2e at timescale 0.33 (real key timing) → `artifacts/panels-v1.22.25/`.

## [1.22.24] — 2026-11-26

### Fixed
- **Panel readability (P0)**: viewport-clamped body/title fonts (≥15/20 rendered CSS px via computed × scale); layout e2e asserts at 1024×576, 1280×720, and 390×844; dialogue + HUD hints match.
- **Sequence/hack hold (P0)**: after reveal, all glyphs stay full-size for 2.0s (× 1/timescale) with a visible Memorize bar; input timer starts only after hold; duel phase-3 hack uses the same reveal+hold + `timerMs`.
- **Stale Anfitrião objective (P1)**: `story:beat-completed` refreshes the HUD objective immediately after the offer resolves.
- **Needle feedback (P1)**: greener zone with stronger outline; tick + flash on zone enter kept.

### Added
- Per-minigame first-open howto line in the skill panel (one sentence how to win).
- `artifacts/panels-v1.22.24/` (keyboard, Português) + hold-duration e2e.

## [1.22.23] — 2026-11-26

### Fixed
- **Panel size / readability**: skill panels are `min(720px, 92vw)` wide with body ≥15px, title ≥20px, buttons ≥40px tall; layout e2e asserts width + fonts and no-scroll at 1280×720 and 390×844.
- **Sequence fail flow**: wrong key shows `Errou n/max — rever?` miss card (Tentar de novo / Sair, never auto-closes); R pauses the timer instead of adding time; fixed pattern slot; full-sequence hold (~2s) verified via `sequence-hold` artifact.
- **Offer / dialogue**: drop duplicate title=prompt subtitle; VIP dialogue no longer scrolls with clipped/repeated lines.
- **Needle**: starts outside the green zone (random side) so the first armed E is not an instant win.
- **Title menu**: ArrowDown/Up move focus among primary actions; language changes only with Left/Right (or Enter) on the language row.
- **QA `?minigame=`**: after a win, return to the world — never open story dialogue.

### Added
- Panel screenshot set `artifacts/panels-v1.22.23/` (keyboard mode, Português) plus Augusto duel e2e at timescale 0.33.

## [1.22.22] — 2026-11-26

### Fixed

- **Needle countdown (P0)**: Stop/E/Enter/Space/gamepad A/touch are structurally impossible during Em 3…2…1 — Parar stays disabled/greyed; input arms only after the first motion frame + ~150 ms grace. Soft-miss no longer races the countdown toast.
- **Epilogue credits (P0)**: after Nair Fechar the credits roll reliably; Continue Exploring / Skip stay disarmed ~900 ms so Enter cannot flash-dismiss. Esc menu + title gain a **Créditos** entry once the story is complete.
- **Fail card (P1)**: quiz wrong answers and needle soft misses show the same retry/leave fail card as lockpick (not toast-only).

### Added

- **QA sandbox (P1)**: `?minigame=lockpick|sequence|needle|offer|hack|quiz` opens that panel; `?timescale=0.33` slows minigame timers/reveals — see `docs/qa-chapter-jumps.md`.
- **Panel screenshots**: `artifacts/panels-v1.22.22/` for every skill kind × phase at 1280×720 and 390×844.

### Tests

- `session-v12222`, `e2e/playtest-46` (countdown mash + CPU throttle, epilogue credits, fail card, QA screenshots).

### Chore

- Pruned stale `artifacts/playtest/*` from old versions; keep only the current panels set.

## [1.22.21] — 2026-11-26

### Fixed

- **Skill panel (P0)**: taller (~85vh) and wider (≥520px desktop); compact title + one meta line; interactive content + actions fit without scrolling at 1280×720 and 390×844; lockpick pins stay one row with per-pin verdict chips.
- **Sequence (P0)**: after progressive reveal, full sequence held ≥2s before input; free `R: rever sequência` once per attempt; fail always leaves a result card.
- **Lockpick (P1)**: legible `Pista:` hint; timer persists across wrong tests (45s total); plain feedback (`Pino 1 baixo, Pino 2 certo`).
- **Toast (P1)**: `?chapter=` / district jumps toast the live objective (not stale Find Nair).
- **VIP (P1)**: Anfitrião objectives show `1/2` then `2/2` so progress is clear.
- **Credits (P2)**: removed stray `—` line above the pixel/CC0 credit.

### Tests

- `session-v12221`, `playtest-45-skill-layout` (every kind × reveal/input/after-wrong/offer at 1280×720 and 390×844).

## [1.22.20] — 2026-11-26

### Fixed

- **Skill panel overlap (P0)**: actions are no longer sticky — lockpick Testar no longer paints over Pino 1/2/3; sequence pattern row has reserved height and the arrow pad sits in body flow (no clip/shift).
- **Lockpick heights (P1)**: pin bars + numeric height shown from the first paint, not only after Testar.
- **Fail card (P1)**: never shows `— cr`; omits the credits segment when delta is 0, or shows a signed loss (e.g. `−40 cr`).
- **District banner (P2)**: big centered zone-name banner ~1.5s after travel fade (Feira Central arrival included).

### Added

- **QA `?chapter=` (P2)**: `feira|avenida|torre|vip|epilogue` starts a new game at that beat with seeded credits/rep — see `docs/qa-chapter-jumps.md` and the playtest skill.
- **E2e**: `playtest-44-skill-layout` opens every skill panel kind at 1280×800 and 390×844 and asserts no overlapping interactive/text rows.

### Tests

- `session-v12220`, `playtest-44-skill-layout`.

## [1.22.19] — 2026-11-26

### Fixed

- **Needle gauge (P0)**: skill meter no longer flex-shrinks to ~2px — visible green zone + needle at 1280×800; E/Stop ignored during Em 3…2…1 (no miss toast).
- **Pirateiro sequence (P0)**: reveal ≥1.4s/glyph with a guaranteed full-glyph paint before input; input timer ≥2s/key; win/lose result card always shown.
- **Re-open Enter (P0)**: Esc-cancel clears modal arm so the first Enter on Take bet works after E → skill → Esc → E; `noteModalOpened` no longer starts a post-release quiet (choice→Take bet); empty-held bump does not clear the time arm.
- **Lockpick (P1)**: timer above pins (no Testar overlap); hint at body text size.
- **Credit floater (P1)**: suppressed while the result card owns the delta.
- **Objective (P1)**: arrow label includes distance (`Antena Tech · 42 m`).
- **Title keyboard (P1)**: clearer focus ring; Arrow/Enter e2e covered.
- **Result Continuar (P2)** + **zone-enter pulse (P2)** ~1.5s with banner.

### Tests

- `e2e/playtest-43`, `session-v12219`, reveal step ≥1400.

## [1.22.18] — 2026-11-26

### Fixed

- **Enter arm regression (CI)**: offer-bet / Take bet keeps a short time arm + mash re-arm so post-choice Enter cannot auto-start the skill; `bumpModalConfirmArm` still refuses to invent a held Enter (Antena first-press).
- **Skill harness**: `completeSkillPerfect` dismisses an orphan result banner so story-walk cannot soft-lock on `ui=skill` with no phase.

### Tests

- offer-bet arm unit; story-walk step budget for reveal/result ticks.

## [1.22.17] — 2026-11-26

### Fixed

- **Build / Pages**: e2e harness uses `forceStorySkill()` instead of an invalid cast on `pendingStoryBeat` (tsc Pages failure on 1.22.16).

## [1.22.16] — 2026-11-26

### Fixed

- **Sequence reveal (P0 BLOCKER)**: remounting the skill panel orphaned memorize timers (`!isConnected` forever). Clock-driven reveal + skip remount while the same phase is live; every sequence minigame arms input after reveal.
- **Antena dialogue Enter (P0)**: offer-bet / Take bet no longer re-arms on blocked Enter; bump never adds fresh keys to the held set.
- **Result card (P1)**: single `+` on credits/rep; suppress floating `+N cr` while the card is up.
- **Edge objective (P1)**: invalidate marker when the objective changes; off-screen shows name + distance (`42 m`).

### Tests

- `sequence-reveal` unit (fake clock), `e2e/sequence-win-all`, `e2e/story-feira-keyboard`, Antena dialogue Enter.

## [1.22.15] — 2026-11-26

### Fixed

- **Lockpick (P0)**: one short hint (testar/test) that fits without wrapping; legend `certo/baixo/alto`; button **Testar**/**Test**; panel fits at 1280×800.
- **Sequence memorize (P0)**: step-by-step reveal (≥600ms each), input locked, timer starts only after reveal; e2e on Pirateiro + ATM.
- **Skill result (P1)**: win/lose banner with credits/rep delta for ~1.2s or Enter.
- **Tutorial (P1)**: panel moved bottom-left so it no longer overlaps top HUD.
- **Edge objective (P2)**: directional edge arrow with NPC name + distance.

### Tests

- `session-v12215`, `e2e/sequence-reveal`.

## [1.22.14] — 2026-11-26

### Fixed

- **Dialogue Enter (P0)**: arm only keys held at open; a fresh keydown (e.g. Enter after E) advances without needing a keyup we never saw; shorter choice arm; epilogue Fechar hold ~400ms.
- **Needle countdown (P0)**: freeze needle + eat Stop/E until Já!; hide miss hint during countdown; unit gate `canNeedleStop`.
- **Needle zone (P1)**: visual pulse on zone enter (with tick SFX).
- **Torre HUD / lockpick (P1)**: more space under the objective; clear lockpick one-liner.

### Tests

- `session-v12214`, `e2e/dialogue-enter-advance` (DJ/Maquinista/Capitã/Anfitrião/epilogue).

## [1.22.13] — 2026-11-26

### Fixed

- **Avenida collision (P0)**: clear east-west shoulders (no pillar nubs); shrink tower footprints; orthogonal corner-slide around protrusions; wall-push on >1s zero-displacement hold.
- **Dialogue Enter (P1)**: plain lines advance on the next fresh keydown after key-up (mash arm stays on choices only).
- **Torre unlock copy (P1)**: objective/toast name Margin’s hearing — Contato/Hacker alone does not open the tower.
- **Needle accessibility (P1)**: soft tick when the needle enters the green zone.

### Tests

- `session-v12213`, `e2e/avenida-east-lane` hold-D past world x=750 on y10–13.

## [1.22.12] — 2026-11-26

### Fixed

- **Avenida softlock (P0)**: wall-push unstuck after >1s against colliders; west NPC spacing; on-ramp into dual lanes.
- **Sequence input (P0)**: arrows always accepted (color↔arrow aliases); hints/titles match symbols; ATM “setas” not “dígitos”.
- **VIP needle / offer (P0/P1)**: ready countdown before Stop; E+Enter confirm; timeout toast + fail; stable focus.
- **Influencer / credits / Torre (P1)**: skill body scroll; skip world draw on credits; orthogonal no Y-drift.

### Tests

- `session-v12212` wall-push coords + sequence hint/input match.

## [1.22.11] — 2026-11-26

### Fixed

- **Avenida softlock (P0)**: unstuck nudge pushes out of solids; center lanes re-sealed after towers.
- **Viajar Enter (P0)**: focus first destination on open; clear mash arm so Enter works without Esc/reopen.
- **Anfitrião VIP (P0)**: needle Stop/E requires post-Aceitar key-up (same arm as choice minigames).
- **Torre FPS / sticky / needle / memory (P1)**: prewarm backdrops + ease FX on enter; wider plaza aisles; first-try needle window; release scene scratch on travel.

### Tests

- `session-v12211`, travel-keyboard Enter-on-first-focus.

## [1.22.10] — 2026-11-26

### Fixed

- **Memory leak (P0)**: skill/tutorial/dialogue dispose intervals + window listeners on `clearNode`; travel/skill cycle unit + e2e assert bus/DOM/heap stay bounded.
- **Sequence flash (P1)**: first memorize flash ≥2.8s before dots; ATM/Cam Tech no longer blind first try.
- **i18n / Feira / FPS (P1)**: localized miss-hint speakers; Luna ball tip; pt-BR rewrites; elevator as system Painel; short E chip; Lavador/Pirateiro on plaza; dialogue cull; victory Space e2e.

## [1.22.9] — 2026-11-26

### Fixed

- **Contato mash (P0)**: skill choices no longer focusFirst on open; confirm requires allowModalConfirm + post-open key-up; 60ms-burst e2e on Contato.
- **Augusto Fase 2 (P0)**: Enter submits the key target’s `data-choice-index` (not activeElement / stale closure); timing Stop listener dies on repaint; e2e + unit.
- **Lockpick / input / world (P1)**: Space raises, Enter/Tab submit + matching hints; post-modal swallow only while the closing key is held; Feira stalls bh=1; rain/steam skip on slow frames; pt-BR polish; Odds NPCs off Fair exit stand.

## [1.22.8] — 2026-11-25

### Fixed

- **Victory modal (P0)**: focus Continuar explorando on open; Enter/Space/E activate; Esc = continue exploring; clear mash arm so the panel never soft-locks; e2e keyboard dismiss.
- **Dialogue first Enter (P1)**: after arm, always focus option 1; fresh keydown activates (mash guard kept).
- **Clues (P1)**: Augusto Fase 2 points at paper-under-palm (Livro nervoso); Guarda points at public rumor (Segredo aberto), not tourist plastic.
- **pt-BR / focus / tags (P1)**: infinitive choice labels (+ lint); Tab trap in modals; Contato Vira-Casaca nudged off FEIRA CENTRAL sign.

## [1.22.7] — 2026-11-25

### Fixed

- **Gaiola lockpick (P0)**: per-pin certo/baixo/alto feedback persists across retries; decodeable clue; no hidden pin; clamp ←→ selection; hint after 3 misses; e2e solves from on-screen feedback ≤4 tries.
- **Viajar keyboard (P0)**: clear modal arm on menu/travel; Enter/Space activate destinations + Fechar; e2e travels via Esc → Viajar → Enter.
- **Wipe confirm (P0)**: Esc = Voltar on ending + settings; credits Play again uses confirm.
- **Tags / Enter / pt-BR / needle (P1)**: Entregador/Vira-Casaca spacing; tag e2e every district; post-arm focus first choice; puzzle tip; copy polish; rAF needle wrap.

## [1.22.6] — 2026-11-25

### Fixed

- **Choice mash (P0)**: no default focus on option 1 — arrow onto a choice first; Enter/NumpadEnter via `event.key`; Close/Skip/Stop bind the same confirm keys.
- **Anfitrião (P0)**: wrong dialogue offers fail the beat; hush chip only seals; negotiate skill stays target-only.
- **Augusto P3 (P0)**: sequence pad uses fixed RGBY+arrows order (not the answer order after flash).
- **Tags / exits / Esc / pt-BR (P1)**: nearest-only tags with overlap reject; larger exit stand range; Esc dismisses wipe-save confirm; viraliza / miss-zone / clue giveaway copy.

### Tests

- `session-v1226`, `enter-confirm-surfaces`, `tag-overlap` e2e.

## [1.22.5] — 2026-11-25

### Fixed

- **Minigame fairness (P0)**: sequence games flash the pattern (~1.5s, longer on retry) and reveal matched glyphs; Cage lockpick per-pin click/alto/baixo + solvable clue; Neon Snap column gate blocks straight east sprint; choice clues no longer keyword-match answers; Anfitrião negotiate is target-only; reputation clamped at 0 with softer lose (−1).
- **Enter (P0)**: Enter/Space never starts dialogue (KeyE only); choice/credits/epilogue require arm + key-up; credits Skip armed ~900ms; e2e covers 60ms bursts, held Enter, and key-repeat.
- **pt-BR (P1)**: elevator card localized; `a reviravolta`; `trava do ATM`; negotiate tip; distinct miss line; catalog lint for English leftovers + gender bugs.
- **World (P1)**: Odds NPC spacing + nearest-only tags; continuous Avenida shoulders; first WASD after panel; Esc still closes panel before menu; freeze NPC idle bake under skill (Augusto P3 FPS).

### Tests

- `session-v1225`, expanded `enter-leaks` e2e, `ptbr-catalog-scan` English/gender lint.

## [1.22.4] — 2026-11-25

### Fixed

- Fair→Odds arrival east lane, Enter swallow after panels/credits, bet Enter confirms only, rebalanced clues/Neon Snap, pt-BR accents in pixel font, elevator-first Torre objective, heap-safe panel listeners.

## [1.22.2] — 2026-11-25

### Fixed

- **pt-BR (P0)**: epilogue closing, credits, non-objective bets, Nair rematch, travel prompts, world signs, NPC display names/tags; cut anglicisms; distinct retry lines; Seu Zé uses lottery (not Fio gate copy); narrower choice clues; VIP Host clue clearer.
- **Enter (P0)**: after any skill, rematch needs fresh **KeyE** (never Enter/Space); beaten story NPCs show done line; elevator success panel clears on VIP floor; Escape close no longer eats the next KeyE; choice/dialog arms ~400ms.
- **Exits / tags (P1)**: exit pad stand range 1.85; objective-prefer targeting + tags.
- **Neon Snap / Lobby Cam (P1/P2)**: tighter cover (~3–6 tries); Lobby Cam more misses + longer timer; Margin sets `morro_return_ok` so hill return is optional.

### Tests

- Extended no-hardcoded-ui + full-story pt-BR scan + catalog blocklist; `session-v1222`, `exit-pad`, localize-helpers coverage ≥90%.

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.21.0] — 2026-11-25

### Fixed

- **Name tags (P1)**: anchored to sprite blit (aside+bob) every frame; objective always shown; non-objective tags stack/hide; elevator tagged on the car; quest/beat NPCs planted (no marker drift); ambient leash ≤1.1 and never into Neon Snap lane.
- **Neon Snap (P1)**: after `drone_ok`, NPC gives a completed line — never re-offers stealth; Odds NPCs relocated off the cone lane; slower patrols / bigger cover for longer safe dwell (~3–6 first-timer attempts).
- **Dropped Enter (P1)**: modal confirm ignores Interact held at open until key-up + 150ms; Close rematch gate stays 400ms + release; OS key-repeat ignored.
- **Casa/Augusto needles (P2)**: tighter late-game windows; `assistAfterMiss` widens only after 2+ misses.
- **Foyer arrow (P2)**: fixed Foyer Guard target on Casa (no path-waypoint wander onto the elevator).
- **FPS (P2)**: under dialogs/minigames freeze bob and cull far NPCs; e2e asserts ≥50 avg under 4× throttle with Odds dialog open.

### Tests

- Unit: `session-v210` (done line, lane clear, gate, needles, foyer, wander).
- Prod e2e: `neon-snap-done-prod`; clear/prompt/debounce retained.

## [1.20.2] — 2026-11-25

### Fixed

- **Neon Snap (P0)**: cones always visible (steady fill + brightness pulse only — no every-other-frame flicker). Alternating vertical drones + cover crates; ≥1.2s safe dwell at walk speed. North/south barriers still seal bypass; y11–12 corridor stays open. Solvability unit test + prod e2e that clears with real walk keys (no `completeSkillPerfect`).
- **E-prompt (P0)**: Morro spawn sits beside Dona Nair; Antena Tech moved off the spawn bubble. Fair DJ / Dancer / Odds Mole / Margin spaced past `INTERACT_RANGE`. Prod e2e asserts spawn prompt contains `Dona Nair`.
- **Enter debounce (P0)**: input-layer gate — after any dialog closes, ignore Interact until key release **and** 400ms. Prod e2e: Close then 4× Enter @80ms → no dialog.
- **Crowded tags**: nearer tag radius, larger stack offset, screen-space nudge so Bia/Catador/ATM clusters don’t overlap.

### Tests

- Unit: real-spawn Nair prompt, walk solvability + barrier corridor, interact input gate.
- Prod e2e: `neon-snap-clear-prod`, `prompt-spawn-prod`, `enter-debounce-prod`.

## [1.20.1] — 2026-11-25

### Fixed

- **Epilogue**: closing Saúde line is its own panel (≥3s hold), auto-scrolled into view; credits require Close (no auto-open). E2e asserts `.dialogue-closing-line` in viewport.
- **E-prompt**: objective NPC always wins when in interact range (unit test with clustered NPCs); crowded tags show only the nearest 2, stacked.
- **Enter debounce**: 400ms lock + require Interact key release after any dialog/skill close.
- **Needle Stop**: sample at keydown time; Enter / Space / gamepad A stop the elevator (and other timing) needles.
- **Take the bet**: primary button focused by default (not Walk away).
- **Fio chase**: sequence text matches pad (`↑ → ↓ ←`).
- **Casa Tower**: Odds exit moved to (5,18) off the elevator west path; Odds→Casa prompt reads `Enter Casa Tower →`.
- **Odds Avenue**: floor tile lookups; re-assert y11–12 asphalt corridor (smooth mid-lane collision).
- **Neon Snap**: checkpoint `(12,11)` stays outside all cones over a patrol cycle.
- **Dona Nair**: forward plaza (14,16), clear of Boteco sign / tenements; Antena / Fair / Odds NPCs spaced to reduce prompt fights.
- **FPS**: cheaper drone cones (every other frame, fewer wedges); tag draw capped at 2.

### Tests

- Unit: objective cluster preference, checkpoint cone-free, corridor walkability, Fio sequence, torre exit.
- E2e: `epilogue-closing` viewport assert + screenshot.

## [1.20.0] — 2026-11-25

### Fixed

- **Neon Snap (4th)**: seal north (y9–10) and south (y13–14) asphalt strips x12–34 with solid tiles + police barrier / shipping-container props; center lane y11–12 remains the cone path. Prod-build Playwright (`e2e:prod`) holds Shift+Right 4s from the real start approach and asserts x stays left of the wall / segment not cleared (north + south).
- Drone sight cones: translucent cyan fill + yellow outline every frame (readable at a glance).
- Objective NPCs (Foyer Guard, Mole Contact, Luna Pixel) leashed to open plaza tiles in front of buildings; depth-sorted with the player.
- E-prompt prefers the objective NPC whenever it is in range; name tags + E-prompt clamped inside the safe HUD inset.
- Epilogue closing line Close held ≥3s (auto-credits after Saúde).
- Enter-spam after dialog Close: 450ms interact lock blocks rematch bet chain.
- Courier chase: four distinct arrows so the pad shows 4 buttons for “match 4”.
- Morro Fair pad moved to (38,22) clear of Seu Zé; Fair Morro arrival pad at (3,12) clear of spawn.
- Lockpick hint: Space raises a pin (keyboard handler on focused pin).
- Casa elevator needle: wider window / slower first try.
- Pause menu / controls hint lists **F3** for the FPS overlay.

### Tests

- Unit: sealed strips + slideStep stop, barrier props, pad/NPC clearance, courier 4 keys, elevator timing.
- E2e: `neon-snap-wall` east Shift-run stop; `neon-snap-prod` against vite preview of `dist`.

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
