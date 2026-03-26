FROM node:22-alpine AS frontend

WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM golang:1.24.0-alpine AS builder

WORKDIR /app

# Install git for downloading dependencies
RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Copy built frontend into the embed location
COPY --from=frontend /app/web/dist ./internal/web/dist

# Build statically without CGO. modernc/sqlite handles the DB without C
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o disablarr main.go

FROM scratch

# Default environment variables
ENV DISABLARR_MASTER_KEY=""
ENV DISABLARR_BASE_PATH=""

COPY --from=builder /app/disablarr /app/disablarr

# We cannot run chown in scratch, so we rely on the host mapping or just run as root in scratch
# Since scratch has no shell, no coreutils, running as root internal to the container is actually standard practice
# because the attack surface is near zero.

VOLUME ["/app/data"]

EXPOSE 22222 7812

CMD ["/app/disablarr"]
