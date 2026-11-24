# Testing strategy

## TDD

Write failing unit tests first for logic changes under `tests/unit`.

## Unit + coverage

- Runner: Vitest
- Thresholds: **90%** lines, branches, functions, statements (build fails below)
- Scope: core, systems, content, input, audio

## End-to-end

- Playwright boots the Vite app
- Flows: title → new game, move, bet toast, menu, mobile touch controls

## Mutation testing

- Stryker + Vitest runner
- Break threshold: **70%** mutation score on core + critical systems/content
  (grind helpers stay unit-tested for coverage; mutation focuses on betting/story/world/session/save/upgrade)

## Other gates

- ESLint + Prettier + markdownlint
- `tsc --noEmit`
- `npm audit --audit-level=high` (available via `npm run audit`)
- CI workflow runs lint, typecheck, unit+coverage, build, e2e, mutation

## Commands

```bash
make test
make e2e
make mutation
make lint
```
