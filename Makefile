.PHONY: build fmt lint vuln check clean web dev ci test

BINARY := disablarr
GO     := go
LINT   := golangci-lint

## web: build the React frontend
web:
	cd web && npm ci && npm run build
	rm -rf internal/web/dist
	mkdir -p internal/web/dist
	cp -r web/dist/* internal/web/dist/


## build: build the docker image without cache (with version tags)
build:
	docker build --no-cache \
		--build-arg APP_VERSION=$$(git describe --tags --always 2>/dev/null || echo "dev-local") \
		--build-arg COMMIT_SHA=$$(git rev-parse --short HEAD 2>/dev/null || echo "unknown") \
		--build-arg BUILD_DATE=$$(date -u +%Y-%m-%dT%H:%M:%SZ) \
		-t disablarr:latest .

## ci: run all tests, checks, and perform a build
ci: check test build

## test: run all go tests
test:
	$(GO) test -v ./...

## build-go: compile only the Go binary (frontend must already be built)
build-go:
	CGO_ENABLED=0 $(GO) build -ldflags="-s -w" -o $(BINARY) .

## dev: run the Vite dev server (proxy API to localhost:8080)
dev:
	cd web && npm run dev

## fmt: format all Go source files
fmt:
	gofmt -w .

## fmt-check: fail if any files need formatting (used in CI)
fmt-check:
	@unformatted=$$(gofmt -l .); \
	if [ -n "$$unformatted" ]; then \
		echo "Files need formatting:"; \
		echo "$$unformatted"; \
		exit 1; \
	fi

## lint: run golangci-lint
lint:
	$(LINT) run ./...

## vuln: run govulncheck vulnerability scan
vuln:
	govulncheck ./...

## check: run all quality checks (fmt, lint)
check: fmt-check lint

## clean: remove build artefacts
clean:
	rm -f $(BINARY)
	rm -rf web/dist web/node_modules internal/web/dist

## help: print this help
help:
	@sed -n 's/^## //p' $(MAKEFILE_LIST) | column -t -s ':' | sed -e 's/^/ /'
