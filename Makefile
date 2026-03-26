.PHONY: build fmt lint vuln check clean web dev

BINARY := disablarr
GO     := go
LINT   := golangci-lint

## web: build the React frontend
web:
	cd web && npm ci && npm run build
	rm -rf internal/web/dist
	cp -r web/dist internal/web/dist

## build: compile the production binary (includes frontend)
build: web
	CGO_ENABLED=0 $(GO) build -ldflags="-s -w" -o $(BINARY) .

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

## check: run all quality checks (fmt, lint, vuln)
check: fmt-check lint vuln

## clean: remove build artefacts
clean:
	rm -f $(BINARY)
	rm -rf web/dist web/node_modules internal/web/dist

## help: print this help
help:
	@sed -n 's/^## //p' $(MAKEFILE_LIST) | column -t -s ':' | sed -e 's/^/ /'
