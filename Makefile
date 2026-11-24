.PHONY: install dev test e2e mutation lint build docker deploy preview typecheck ci clean

BASE_PATH ?= /
PORT ?= 43123

install:
	npm ci
	npx playwright install --with-deps chromium

dev:
	npm run dev -- --port $(PORT)

test:
	npm test

e2e:
	npm run e2e

mutation:
	npm run mutation

lint:
	npm run lint

typecheck:
	npm run typecheck

build:
	BASE_PATH=$(BASE_PATH) npm run build

preview:
	npm run preview

deploy: build
	@echo "Build estático pronto em dist/ (base=$(BASE_PATH))."
	@echo "O deploy para GitHub Pages é feito pelo workflow .github/workflows/pages.yml."
	@echo "Para publicar: faça push na branch main (ou dispare o workflow manualmente)."
	@echo "Defina BASE_PATH=/<repo>/ ao construir para project pages, ex.:"
	@echo "  make build BASE_PATH=/odds-neon/"

docker:
	docker build -t odds-neon:local .
	@echo "Imagem opcional pronta. Use apenas se não for hospedar no GitHub Pages."
	@echo "  docker run --rm -p 8080:80 odds-neon:local"

ci:
	npm run ci

clean:
	rm -rf dist coverage reports playwright-report test-results .stryker-tmp
