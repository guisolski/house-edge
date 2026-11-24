# Agent instructions — Odds Neon

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
- Procedural/original pixel art and audio; credit any external permissive assets in docs.
- Ship as a static site for **GitHub Pages** with configurable `BASE_PATH`.

## Releases

- Semantic versioning + Conventional Commits + `CHANGELOG.md` updates.

## Quick commands

```bash
make install
make dev
make test
make e2e
make mutation
make lint
make build BASE_PATH=/<repo>/
make deploy
```
