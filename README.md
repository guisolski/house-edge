# House Edge

Top-down cyberpunk bets in a Brazilian megacity. Story gates are skill encounters (timing, choice, chase, hack, lockpick, negotiate) plus an in-world **drone stealth** corridor on Odds Avenue. Play Rita Odds from Morro Neon to Casa Suprema Tower (v1.22.1: tutorial advances by action/Tab, full pt-BR UI + native story voices, title language keyboard nav, Enter arms both ways, Morro clues narrow).

## Quick start

```bash
make install
make dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123). Language defaults from `navigator.language` (pt → pt-BR); switch on the title screen or in Menu → Settings.

## Commands

| Target             | Purpose                                               |
| ------------------ | ----------------------------------------------------- |
| `make install`     | npm ci + Playwright Chromium                          |
| `make dev`         | Vite dev server (port 43123)                          |
| `make test`        | Unit tests + coverage gates                           |
| `make e2e`         | Playwright flows                                      |
| `npm run e2e:prod` | Playwright vs vite preview of `dist/` (Neon Snap)     |
| `make playtest`    | Golden-path playtest + FPS budgets (desktop + 4× CPU) |
| `make mutation`    | Stryker mutation tests                                |
| `make lint`        | ESLint + Prettier + markdownlint                      |
| `make build`       | Production static build (`BASE_PATH` aware)           |
| `make deploy`      | Build + print GitHub Pages instructions               |
| `make docker`      | Optional nginx image from `dist/`                     |

## GitHub Pages

```bash
make build BASE_PATH=/house-edge/
```

Repo: [guisolski/house-edge](https://github.com/guisolski/house-edge) — site: [guisolski.github.io/house-edge](https://guisolski.github.io/house-edge/)

Enable **Settings → Pages → GitHub Actions**. Workflow: `.github/workflows/pages.yml`.

Details: [docs/deployment.md](docs/deployment.md).

## Docs

See `INIT.md` → `AGENTS.md` and the `docs/` folder (story, world, betting, art, audio, architecture, testing, ADRs).

Design research that drove the 1.2 rework:

- [docs/research/game-design.md](docs/research/game-design.md)
- [docs/research/level-design.md](docs/research/level-design.md)
- [docs/research/ux-input.md](docs/research/ux-input.md)
- [docs/controls.md](docs/controls.md)

## Stack

- TypeScript (strict)
- Excalibur.js 1.x
- Vite
- Vitest + Playwright + Stryker
