.PHONY: install dev test e2e playtest mutation lint build docker deploy preview typecheck ci clean

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

playtest:
	mkdir -p artifacts/playtest
	npx playwright test e2e/playtest.spec.ts e2e/perf-throttle.spec.ts e2e/story-complete.spec.ts e2e/story-walk.spec.ts --project=desktop-chromium

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
	@echo "Static build ready in dist/ (base=$(BASE_PATH))."
	@echo "GitHub Pages deploy runs via .github/workflows/pages.yml."
	@echo "Push main (or dispatch the workflow) to publish."
	@echo "For this repo use:"
	@echo "  make build BASE_PATH=/house-edge/"

docker:
	docker build -t house-edge:local .
	@echo "Optional image ready (prefer GitHub Pages for hosting)."
	@echo "  docker run --rm -p 8080:80 house-edge:local"

ci:
	npm run ci

clean:
	rm -rf dist coverage reports playwright-report test-results .stryker-tmp
