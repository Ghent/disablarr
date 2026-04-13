# ── Stage 1: Frontend build ────────────────────────────────────────────────────
FROM --platform=$BUILDPLATFORM node:24-alpine AS frontend-builder
WORKDIR /app/web

RUN npm install -g pnpm@10.32.1

# Copy dependency manifests first for layer caching
COPY web/package.json web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY web/ ./
RUN pnpm run build

# ── Stage 2: Backend build ─────────────────────────────────────────────────────
FROM --platform=$BUILDPLATFORM golang:1.26.2-alpine AS backend-builder
WORKDIR /app

# Copy dependency manifests first for layer caching
COPY go.mod go.sum ./
RUN go mod download

COPY . .
# Copy built frontend into the embed location
COPY --from=frontend-builder /app/web/dist ./internal/web/dist

# Build args for version tagging
ARG APP_VERSION=dev
ARG COMMIT_SHA=unknown
ARG BUILD_DATE=unknown
ARG TARGETOS TARGETARCH

# Build statically without CGO. modernc/sqlite handles the DB without C
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build \
    -ldflags="-s -w \
    -X main.version=${APP_VERSION} \
    -X main.commit=${COMMIT_SHA} \
    -X main.buildDate=${BUILD_DATE}" \
    -o disablarr main.go

# ── Stage 3: Runtime (hardened Alpine) ─────────────────────────────────────────
# Digest pinned for reproducible builds. Update periodically.
FROM alpine:3.21@sha256:c3f8e73fdb79deaebaa2037150150191b9dcbfba68b4a46d70103204c53f4709
WORKDIR /app

LABEL org.opencontainers.image.title="Disablarr" \
      org.opencontainers.image.description="Automated media server maintenance" \
      org.opencontainers.image.source="https://github.com/Ghent/disablarr"

# Install only what's needed, then remove the package manager to reduce attack surface
RUN apk add --no-cache ca-certificates tzdata su-exec \
    && rm -rf /sbin/apk /etc/apk /lib/apk /usr/share/apk /var/cache/apk

COPY --from=backend-builder /app/disablarr /app/disablarr

RUN mkdir -p /app/data

# Healthcheck uses busybox wget
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO /dev/null "http://localhost:7812/api/v1/health" || exit 1

VOLUME ["/app/data"]
EXPOSE 7812

ENTRYPOINT ["/app/disablarr"]
