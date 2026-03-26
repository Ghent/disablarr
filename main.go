package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"

	"gitlab.com/starshadow/software/disablarr/internal/crypto"
	"gitlab.com/starshadow/software/disablarr/internal/db"
	"gitlab.com/starshadow/software/disablarr/internal/engine"
	disablarrssh "gitlab.com/starshadow/software/disablarr/internal/ssh"
	disablarrtui "gitlab.com/starshadow/software/disablarr/internal/tui"
	"gitlab.com/starshadow/software/disablarr/internal/web"
)

func main() {
	// Setup structured JSON logging to os.Stdout, also captured in the TUI log ring buffer.
	logs := disablarrtui.NewLogBuffer(500)
	logger := slog.New(disablarrtui.NewRingHandler(logs))
	slog.SetDefault(logger)

	slog.Info("Starting Disablarr Daemon")

	// 1. Check for MASTER_KEY
	masterKey := os.Getenv("DISABLARR_MASTER_KEY")
	if len(masterKey) != 64 {
		slog.Error("Fatal: DISABLARR_MASTER_KEY environment variable must be a 64-character hex string (32 bytes). Exiting.")
		os.Exit(1)
	}

	cm, err := crypto.NewCryptoManager(masterKey)
	if err != nil {
		slog.Error("Failed to initialize crypto manager", "error", err)
		os.Exit(1)
	}

	// 2. Ensure data directory exists (Relies on docker volume mounting or init container)
	dataPath := "data"
	if _, err := os.Stat("/app/data"); err == nil {
		dataPath = "/app/data"
	} else {
		// Fallback for local testing outside of Docker
		_ = os.MkdirAll("data", 0755)
	}

	// 3. Initialize Database
	dbFile := fmt.Sprintf("file:%s/disablarr.db", dataPath)
	database, err := db.NewDB(dbFile, cm)
	if err != nil {
		slog.Error("Failed to initialize database", "error", err)
		os.Exit(1)
	}
	defer database.Close()

	// 4. Start Engine (Ticker)
	eng := engine.New(database)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go eng.Run(ctx)

	// 5. Start SSH Dashboard
	sshServer, err := disablarrssh.New(database, masterKey, 22222, dataPath, eng.TriggerNow, logs)
	if err != nil {
		slog.Error("Failed to initialize SSH server", "error", err)
		os.Exit(1)
	}

	go func() {
		if err := sshServer.Start(); err != nil {
			slog.Error("SSH server error", "error", err)
		}
	}()

	// 6. Start Web UI Server
	webPort := 7812
	if portStr := os.Getenv("DISABLARR_WEB_PORT"); portStr != "" {
		if p, err := strconv.Atoi(portStr); err == nil {
			webPort = p
		}
	}

	basePath := os.Getenv("DISABLARR_BASE_PATH")
	basePath = strings.TrimRight(basePath, "/")
	if basePath != "" && !strings.HasPrefix(basePath, "/") {
		basePath = "/" + basePath
	}

	webServer := web.New(database, eng, logs, masterKey, webPort, basePath, eng.TriggerNow)
	go func() {
		if err := webServer.Start(); err != nil {
			slog.Error("Web server error", "error", err)
		}
	}()

	// Wait for interrupt signal
	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)

	slog.Info(fmt.Sprintf("Disablarr running. SSH: ssh -p 22222 admin@localhost | Web: http://localhost:%d%s", webPort, basePath))
	<-done

	slog.Info("Shutting down...")
	cancel() // Stop engine
	if err := sshServer.Stop(context.Background()); err != nil {
		slog.Error("Error stopping SSH server", "error", err)
	}
	if err := webServer.Stop(context.Background()); err != nil {
		slog.Error("Error stopping Web server", "error", err)
	}
}
