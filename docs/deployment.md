# Deployment

Primary host: **GitHub Pages** (static site). Docker/nginx is optional/secondary.

## Configurable base path

Vite reads `BASE_PATH` (default `/`).

This repo is published as a project site at `/house-edge/`:

```bash
make build BASE_PATH=/house-edge/
# or
BASE_PATH=/house-edge/ npm run build
```

The Pages workflow hardcodes:

```bash
BASE_PATH=/house-edge/
```

Live URL: <https://guisolski.github.io/house-edge/>

## GitHub Pages setup

**One-time owner action required:** open
[Settings → Pages](https://github.com/guisolski/house-edge/settings/pages)
and set **Source** to **GitHub Actions**. The Cursor/GitHub App token cannot
create the Pages site (`403 Resource not accessible by integration`). After
that, every push to `main` deploys automatically.


1. Push to `main` on <https://github.com/guisolski/house-edge>.
2. In the GitHub repo: **Settings → Pages → Source = GitHub Actions**.
3. Workflow `.github/workflows/pages.yml` builds and deploys the `dist/` artifact
   using `actions/configure-pages`, `actions/upload-pages-artifact`, and `actions/deploy-pages`.
4. Site URL: <https://guisolski.github.io/house-edge/>

Manual dispatch is enabled (`workflow_dispatch`).

```bash
make deploy
```

`make deploy` builds the static site and prints the Pages instructions (actual publish is the Actions workflow).

## Optional Docker

If you need a container instead of Pages:

```bash
make build BASE_PATH=/
make docker
docker run --rm -p 8080:80 house-edge:local
```

## Local preview of production build

```bash
make build BASE_PATH=/house-edge/
make preview
```
