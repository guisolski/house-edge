# Odds Neon

Top-down cyberpunk bets in a Brazilian megacity. Every interaction is a wager. Play Rita Odds from Morro Neon to Casa Suprema Tower.

## Quick start

```bash
make install
make dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

## Commands

| Target          | Purpose                                     |
| --------------- | ------------------------------------------- |
| `make install`  | npm ci + Playwright Chromium                |
| `make dev`      | Vite dev server (port 43123)                |
| `make test`     | Unit tests + coverage gates                 |
| `make e2e`      | Playwright flows                            |
| `make mutation` | Stryker mutation tests                      |
| `make lint`     | ESLint + Prettier + markdownlint            |
| `make build`    | Production static build (`BASE_PATH` aware) |
| `make deploy`   | Build + print GitHub Pages instructions     |
| `make docker`   | Optional nginx image from `dist/`           |

## GitHub Pages

```bash
make build BASE_PATH=/<repo-name>/
```

Enable **Settings → Pages → GitHub Actions**. Workflow: `.github/workflows/pages.yml`.

Details: [docs/deployment.md](docs/deployment.md).

## Docs

See `INIT.md` → `AGENTS.md` and the `docs/` folder (story, world, betting, art, audio, architecture, testing, ADRs).

## Stack

- TypeScript (strict)
- Excalibur.js 1.x
- Vite
- Vitest + Playwright + Stryker
