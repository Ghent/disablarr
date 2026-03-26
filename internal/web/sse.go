package web

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

// handleSSE streams real-time events to the client.
// Auth is via ?token= query parameter (EventSource doesn't support custom headers).
func (s *Server) handleSSE(w http.ResponseWriter, r *http.Request) {
	// Validate JWT from query param.
	token := r.URL.Query().Get("token")
	if token == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "missing token"})
		return
	}

	if _, err := s.verifyJWT(token); err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": err.Error()})
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	slog.Info("SSE client connected", "remote", r.RemoteAddr)

	// Track last known log count to send only new entries.
	lastLogCount := 0

	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-r.Context().Done():
			slog.Info("SSE client disconnected", "remote", r.RemoteAddr)
			return
		case <-ticker.C:
			// Stream engine status.
			status := s.engine.Status()
			statusJSON, err := json.Marshal(map[string]interface{}{
				"isRunning":   status.IsRunning,
				"lastRunTime": formatTimePtr(status.LastRunTime),
				"nextRunTime": formatTimePtr(status.NextRunTime),
				"cycleCount":  status.CycleCount,
			})
			if err == nil {
				fmt.Fprintf(w, "event: engine-status\ndata: %s\n\n", statusJSON)
			}

			// Stream new log entries.
			if s.logs != nil {
				entries := s.logs.Entries()
				currentCount := len(entries)
				if currentCount > lastLogCount {
					newEntries := entries[lastLogCount:]
					logsJSON, err := json.Marshal(newEntries)
					if err == nil {
						fmt.Fprintf(w, "event: logs\ndata: %s\n\n", logsJSON)
					}
					lastLogCount = currentCount
				}
			}

			// Stream settings (for dry run status sync).
			setting, err := s.db.GetSetting(r.Context())
			if err == nil {
				settingsJSON, err := json.Marshal(map[string]interface{}{
					"dryRun":          setting.DryRun,
					"intervalMinutes": setting.IntervalMinutes,
				})
				if err == nil {
					fmt.Fprintf(w, "event: settings\ndata: %s\n\n", settingsJSON)
				}
			}

			flusher.Flush()
		}
	}
}

func formatTimePtr(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.Format(time.RFC3339)
}
