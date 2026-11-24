# Playtest — House Edge

Mandatory for any agent changing gameplay, UI, art, audio, input, or story.

## Rule

If the game does not actually work and look acceptable in a real browser,
the change is **NOT done**. Do not push. Do not claim success.

Unit tests alone are never enough.

## Workflow

1. `make install` (if deps changed) then `make dev`.
2. Open the local URL in a real browser (computer-use / Playwright).
3. Play the golden path on **desktop**:
   - Title → New Game
   - Walk to a visible NPC (interaction prompt must appear)
   - Dialogue → real bet (stake/odds/outcome, can lose)
   - Travel to another district via exit or Travel UI
   - Progress at least one story beat
   - Open/close Menu without stacking over dialogue
4. Repeat critical steps on **mobile viewport** (touch controls visible).
5. Simulate **gamepad** inputs (Playwright / Gamepad API stub).
6. Capture screenshots of each step into `artifacts/playtest/`.
7. Assert browser console has **zero** errors and **zero** 404s.
8. Compare screenshots to art direction in `docs/art-and-lighting.md`.
9. Write `artifacts/playtest/REPORT.md` (pass/fail per step + gaps).
10. Run `make playtest` (automated) and `make e2e` (includes golden path).
11. Only then run quality gates and push.

## Commands

```bash
make dev
make playtest          # Playwright playthrough + screenshots + console check
make e2e               # includes golden-path story completion
```

## Performance (mandatory)

1. Toggle FPS overlay with **F3** (or `setShowFps(true)` in the harness).
2. Walk for several seconds on desktop; avg FPS must stay **≥ 50** (target 60).
3. Repeat with Chrome DevTools **4× CPU slowdown** (mobile throttle); avg FPS **≥ 50**.
4. `make playtest` includes a scripted-walk FPS budget assertion **and** a 4× CPU throttle budget (≥50 avg) — failing either fails the playtest.
5. Causes of stutter to watch for: per-frame procedural `fillRect` tile painting, recreating canvases, regenerating sprites, heavy glows, DOM HUD writes every frame, AudioNode churn on move.

## Fail conditions (any one blocks done)

- Interact/bet works with no NPC in range
- Menu stacks over dialogue
- Camera does not follow / player stuck at screen edge with no scroll
- Travel/story dead-end with no visible next objective
- Placeholder-only repeating tile soup with no readable streets/buildings
- Console errors or 404s
- Golden-path e2e fails
- FPS budget fails (desktop avg < 50 during scripted walk)
- You did not personally verify in a browser

## Artifacts

Save under `artifacts/playtest/`:

- `01-title.png` … numbered step shots (desktop + `mobile-*.png`)
- `REPORT.md`
