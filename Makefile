.PHONY: lint format check build build\:frontend build\:backend down clean clean\:all help
.PHONY: ci lint\:ci test\:ci security\:ci cache\:clean

# ─── Docker Cache Volumes ──────────────────────────────────────────────────────
# Named volumes persist Go/Node downloads across ephemeral 'docker run --rm'
# containers. First run downloads everything; subsequent runs use cache.
GO_CACHE_VOLS  := -v disablarr-gomod:/go/pkg/mod -v disablarr-gobuild:/root/.cache/go-build
NODE_CACHE_VOLS := -v disablarr-pnpm:/root/.local/share/pnpm/store

# ─── Code Quality (local tools, auto-fix mode) ────────────────────────────────

## Run ESLint (auto-fix) + golangci-lint
lint:
	@echo "→ Linting frontend (auto-fix)..."
	cd web && pnpm lint:fix
	@echo "→ Formatting backend (gofmt)..."
	gofmt -w .
	@echo "→ Linting backend (golangci-lint via Docker)..."
	mkdir -p internal/web/dist && touch internal/web/dist/.gitkeep
	docker run --rm --pull missing -v $(CURDIR):/app $(GO_CACHE_VOLS) -w /app \
		golangci/golangci-lint:v2.11.4 sh -c "golangci-lint run ./..."
	@echo "✓ Lint complete"

## Run Prettier (auto-fix)
format:
	@echo "→ Formatting frontend..."
	cd web && pnpm format
	@echo "→ Formatting backend (gofmt)..."
	gofmt -w .
	@echo "✓ Format complete"

## Verify code quality (no auto-fixes — CI-safe)
check:
	@echo "→ Checking frontend lint..."
	cd web && pnpm lint
	@echo "→ Checking frontend format..."
	cd web && pnpm format:check
	@echo "→ Checking backend (golangci-lint via Docker)..."
	mkdir -p internal/web/dist && touch internal/web/dist/.gitkeep
	docker run --rm --pull missing -v $(CURDIR):/app $(GO_CACHE_VOLS) -w /app \
		golangci/golangci-lint:v2.11.4 sh -c "golangci-lint run ./..."
	@echo "✓ All checks passed"

# ─── CI-Equivalent Checks (Docker-based, matches CI exactly) ──────────────────

## Lint all code (same Docker images + commands as CI pipeline)
lint\:ci:
	@echo "═══ CI Lint Stage ═══"
	@echo "→ [lint:go] golangci-lint (Docker: golangci/golangci-lint:v1.64.5)..."
	mkdir -p internal/web/dist && touch internal/web/dist/.gitkeep
	docker run --rm --pull missing -v $(CURDIR):/app $(GO_CACHE_VOLS) -w /app \
		golangci/golangci-lint:v2.11.4 sh -c "golangci-lint run ./..."
	@echo "→ [lint:frontend] ESLint + Prettier (Docker: node:24-alpine)..."
	docker run --rm --pull missing -e CI=true -v $(CURDIR)/web:/app -v /app/node_modules $(NODE_CACHE_VOLS) -w /app \
		node:24-alpine sh -c "\
			npm install -g pnpm@10.32.1 --silent && \
			pnpm install --frozen-lockfile && \
			pnpm lint && \
			pnpm format:check"
	@echo "✓ CI lint stage passed"

## Run all tests (same Docker images + commands as CI pipeline)
test\:ci:
	@echo "═══ CI Test Stage ═══"
	@echo "→ [test:go] go test (Docker: golang:1.26.2-alpine)..."
	mkdir -p internal/web/dist && touch internal/web/dist/.gitkeep
	docker run --rm --pull missing -v $(CURDIR):/app $(GO_CACHE_VOLS) -w /app \
		golang:1.26.2-alpine sh -c "go test -v ./... -count=1"
	@echo "✓ CI test stage passed"

## Run security scans (same Docker images + commands as CI pipeline)
security\:ci:
	@echo "═══ CI Security Stage ═══"
	@echo "→ [security:govulncheck] (Docker: golang:1.26.2-alpine)..."
	docker run --rm --pull missing -v $(CURDIR):/app $(GO_CACHE_VOLS) -w /app \
		golang:1.26.2-alpine sh -c "\
			go install golang.org/x/vuln/cmd/govulncheck@latest && \
			govulncheck ./..."
	@echo "→ [security:pnpm-audit] (Docker: node:24-alpine)..."
	docker run --rm --pull missing -e CI=true -v $(CURDIR)/web:/app -v /app/node_modules $(NODE_CACHE_VOLS) -w /app \
		node:24-alpine sh -c "\
			npm install -g pnpm@10.32.1 --silent && \
			pnpm audit"
	@echo "→ [security:trivy] Filesystem vulnerability scan..."
	docker run --rm --pull missing -v $(CURDIR):/src ghcr.io/aquasecurity/trivy:0.59.1 \
		fs --exit-code 1 --severity HIGH,CRITICAL --scanners vuln /src
	@echo "→ [security:gitleaks] Secret scanning..."
	docker run --rm --pull missing -v $(CURDIR):/src zricethezav/gitleaks:v8.24.0 \
		detect --source /src --config /src/.gitleaks.toml --verbose
	@echo "→ [security:semgrep] SAST scan..."
	docker run --rm --pull missing -v $(CURDIR):/src semgrep/semgrep:1.106.0 \
		semgrep scan --config=auto --error /src
	@echo "✓ CI security stage passed"

## Scan the built Docker image for CVEs
security\:image:
	@echo "═══ Container Image Scan ═══"
	docker run --rm --pull missing -v /var/run/docker.sock:/var/run/docker.sock \
		ghcr.io/aquasecurity/trivy:0.59.1 image --exit-code 1 --severity HIGH,CRITICAL --scanners vuln \
		disablarr:latest
	@echo "✓ Container image scan passed"

## Run the full CI pipeline locally
ci: lint\:ci test\:ci security\:ci
	@echo "✓ Full CI pipeline passed locally"

# ─── Standalone Builds ────────────────────────────────────────────────────────

## Build the frontend SPA
build\:frontend:
	@echo "→ Building frontend..."
	cd web && pnpm install --frozen-lockfile && pnpm run build
	@echo "✓ Frontend built"

## Build the backend binary with embedded frontend
build\:backend: build\:frontend
	@echo "→ Building backend..."
	CGO_ENABLED=0 go build \
		-ldflags="-w -s \
		-X main.version=$$(git describe --tags --always 2>/dev/null || echo "dev") \
		-X main.commit=$$(git rev-parse --short HEAD 2>/dev/null || echo "unknown") \
		-X main.buildDate=$$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
		-o disablarr main.go
	@echo "✓ Backend built"

# ─── Docker ───────────────────────────────────────────────────────────────────

## Build the docker image (no-cache)
build:
	docker build --no-cache \
		--build-arg APP_VERSION=$$(git describe --tags --always 2>/dev/null || echo "dev-local") \
		--build-arg COMMIT_SHA=$$(git rev-parse --short HEAD 2>/dev/null || echo "unknown") \
		--build-arg BUILD_DATE=$$(date -u +%Y-%m-%dT%H:%M:%SZ) \
		-t disablarr:latest .

## Stop and remove containers
down:
	docker compose down || true

## Safe clean
clean:
	rm -f disablarr
	rm -rf web/dist internal/web/dist
	docker builder prune -f

## Remove CI cache volumes
cache\:clean:
	@echo "→ Removing CI cache volumes..."
	-docker volume rm disablarr-gomod disablarr-gobuild disablarr-pnpm 2>/dev/null
	@echo "✓ CI cache volumes removed"

# ─── Help ─────────────────────────────────────────────────────────────────────

help:
	@echo "Disablarr Commands (Aligned with Capacitarr Gold Standard)"
	@echo "=========================================================="
	@echo ""
	@echo "  make ci             - Run full CI pipeline (lint + test + security)"
	@echo "  make build          - Build production Docker image"
	@echo "  make lint           - Run local linting"
	@echo "  make format         - Run local formatting"
	@echo "  make security:ci    - Run all security scans"
	@echo "  make clean          - Remove build artefacts"
	@echo ""
	@echo "Workflow: make lint format → make ci → commit → push"
