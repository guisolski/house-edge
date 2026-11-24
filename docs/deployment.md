# Deployment

Primary host: **GitHub Pages** (static site). Docker/nginx is optional/secondary.

## Configurable base path

Vite reads `BASE_PATH` (default `/`).

GitHub project pages need the repo subpath, e.g. `/odds-neon/`.

```bash
make build BASE_PATH=/odds-neon/
# or
BASE_PATH=/odds-neon/ npm run build
```

The Pages workflow sets:

```bash
BASE_PATH=/${{ github.event.repository.name }}/
```

## GitHub Pages setup

1. Push to `main`.
2. In the GitHub repo: **Settings → Pages → Source = GitHub Actions**.
3. Workflow `.github/workflows/pages.yml` builds and deploys the `dist/` artifact.
4. Site URL: `https://<user>.github.io/<repo>/`

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
docker run --rm -p 8080:80 odds-neon:local
```

## Local preview of production build

```bash
make build BASE_PATH=/
make preview
```
