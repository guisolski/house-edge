# Agent instructions — House Edge

Follow these rules for every change.

## Language

- **English only** for in-game text, UI, code identifiers/comments, docs, `AGENTS.md`, `INIT.md`, and `CHANGELOG`.
- Brazilian flavor stays in setting, art, music, and light slang inside English dialogue.
- Do **not** mention or depict "jogo do bicho" or equivalent banned street-lottery lore. Corps wiped those games out; only licensed corporate draws exist.

## Engineering

- TypeScript **strict** mode.
- Event-driven design: systems talk through the typed `EventBus`.
- Keep functions short (≤ ~20 lines) and low complexity — ESLint enforces this.
- Linters/formatters must pass: ESLint, Prettier, markdownlint.
- **`make check` must pass before every push** (`lint` + `typecheck` +
  `npm test` — same unit command CI runs). A `simple-git-hooks` pre-push
  hook runs `npm run lint`; do not bypass it (`--no-verify`) unless
  recovering from a broken hook install.
- After writing `artifacts/playtest/REPORT.md`, run
  `npm run format:playtest-report` (also runs at the end of `make playtest`).

## Testing (TDD)

1. Write/adjust unit tests first.
2. Unit coverage must stay **> 90%** (lines, branches, functions, statements) with thresholds in Vitest config.
3. Keep Playwright e2e covering start, move, bet, menu, mobile viewport.
4. Keep Stryker mutation testing with a defined break threshold (≥ 70%).
5. CI must run lint, typecheck, unit+coverage, e2e, and mutation.

## Product

- Excalibur.js shell + pure logic systems.
- Playable story (~20 min) + grind loop.
- Desktop, mobile touch, gamepad.
- Pixel art must look good in a real browser (readable streets, buildings,
  neon, NPCs); credit any external permissive assets in docs.
- Ship as a static site for **GitHub Pages** with configurable `BASE_PATH`.

## Playtest (mandatory)

Before claiming any gameplay/UI/art change is done, follow
[`.cursor/skills/playtest/SKILL.md`](.cursor/skills/playtest/SKILL.md).
Run `make playtest`, play the game yourself in a browser, and keep console clean.
**If it does not work in the browser, it is not done — do not push.**

## Releases

- Semantic versioning + Conventional Commits + `CHANGELOG.md` updates.

## Quick commands

```bash
make install
make dev
make test
make e2e
make playtest
make mutation
make lint
make check          # lint + typecheck + unit tests — required before every push
make build BASE_PATH=/house-edge/
make deploy
```
