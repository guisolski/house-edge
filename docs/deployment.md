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

## GitHub Pages

GitHub Pages is **enabled** on
[guisolski/house-edge](https://github.com/guisolski/house-edge)
with **Source = GitHub Actions**.

Every push to `main` (or a manual `workflow_dispatch`) builds with
`BASE_PATH=/house-edge/` and deploys via
`.github/workflows/pages.yml` using `actions/configure-pages`,
`actions/upload-pages-artifact`, and `actions/deploy-pages`.

Site URL: <https://guisolski.github.io/house-edge/>

```bash
make deploy
```

`make deploy` builds the static site locally and prints Pages instructions
(actual publish is the Actions workflow).

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
