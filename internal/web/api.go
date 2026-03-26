package web

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// --- Integration DTOs ---

type integrationDTO struct {
	ID      int    `json:"id"`
	Name    string `json:"name"`
	Type    string `json:"type"`
	URL     string `json:"url"`
	APIKey  string `json:"apiKey,omitempty"`
	Enabled bool   `json:"enabled"`
}

type integrationCreateReq struct {
	Name    string `json:"name"`
	Type    string `json:"type"`
	URL     string `json:"url"`
	APIKey  string `json:"apiKey"`
	Enabled bool   `json:"enabled"`
}

type connectionTestReq struct {
	URL    string `json:"url"`
	APIKey string `json:"apiKey"`
}

// --- Settings DTOs ---

type settingsDTO struct {
	IntervalMinutes int    `json:"intervalMinutes"`
	ThemeName       string `json:"themeName"`
	DryRun          bool   `json:"dryRun"`
}

// --- Engine DTOs ---

type engineStatusDTO struct {
	IsRunning   bool   `json:"isRunning"`
	LastRunTime string `json:"lastRunTime,omitempty"`
	NextRunTime string `json:"nextRunTime,omitempty"`
	CycleCount  int64  `json:"cycleCount"`
}

// --- Integration Handlers ---

func (s *Server) handleListIntegrations(w http.ResponseWriter, r *http.Request) {
	integrations, err := s.db.ListIntegrations(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	dtos := make([]integrationDTO, len(integrations))
	for i, integ := range integrations {
		dtos[i] = integrationDTO{
			ID:      integ.ID,
			Name:    integ.Name,
			Type:    integ.Type,
			URL:     integ.URL,
			Enabled: integ.Enabled,
			// API key intentionally omitted from list response
		}
	}

	writeJSON(w, http.StatusOK, dtos)
}

func (s *Server) handleCreateIntegration(w http.ResponseWriter, r *http.Request) {
	var req integrationCreateReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if req.Name == "" || req.URL == "" || req.APIKey == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name, url, and apiKey are required"})
		return
	}

	if err := s.db.AddIntegration(r.Context(), req.Name, req.Type, req.URL, req.APIKey, req.Enabled); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"status": "created"})
}

func (s *Server) handleUpdateIntegration(w http.ResponseWriter, r *http.Request, idStr string) {
	id, err := strconv.Atoi(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}

	var req integrationCreateReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if err := s.db.UpdateIntegration(r.Context(), id, req.Name, req.Type, req.URL, req.APIKey, req.Enabled); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (s *Server) handleDeleteIntegration(w http.ResponseWriter, r *http.Request, idStr string) {
	id, err := strconv.Atoi(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}

	if err := s.db.RemoveIntegration(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (s *Server) handleTestConnection(w http.ResponseWriter, r *http.Request) {
	var req connectionTestReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if err := testArrConnection(req.URL, req.APIKey); err != nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
	})
}

// testArrConnection tests connectivity to an *arr instance.
func testArrConnection(urlStr, apiKey string) error {
	client := &http.Client{Timeout: 5 * time.Second}

	if len(urlStr) > 0 && urlStr[len(urlStr)-1] == '/' {
		urlStr = urlStr[:len(urlStr)-1]
	}

	req, err := http.NewRequest("GET", urlStr+"/api/v3/system/status", nil)
	if err != nil {
		return err
	}
	req.Header.Add("X-Api-Key", apiKey)
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return fmt.Errorf("unauthorized: invalid API key")
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}
	return nil
}

// --- Settings Handlers ---

func (s *Server) handleGetSettings(w http.ResponseWriter, r *http.Request) {
	setting, err := s.db.GetSetting(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, settingsDTO{
		IntervalMinutes: setting.IntervalMinutes,
		ThemeName:       setting.ThemeName,
		DryRun:          setting.DryRun,
	})
}

func (s *Server) handleUpdateSettings(w http.ResponseWriter, r *http.Request) {
	var req settingsDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	ctx := r.Context()

	if req.IntervalMinutes > 0 {
		if err := s.db.UpdateInterval(ctx, req.IntervalMinutes); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
	}

	if req.ThemeName != "" {
		if err := s.db.UpdateTheme(ctx, req.ThemeName); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
	}

	if err := s.db.UpdateDryRun(ctx, req.DryRun); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// --- Engine Handlers ---

func (s *Server) handleTriggerEngine(w http.ResponseWriter, r *http.Request) {
	if s.triggerFn != nil {
		s.triggerFn()
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "triggered"})
}

func (s *Server) handleEngineStatus(w http.ResponseWriter, r *http.Request) {
	status := s.engine.Status()
	dto := engineStatusDTO{
		IsRunning:  status.IsRunning,
		CycleCount: status.CycleCount,
	}
	if !status.LastRunTime.IsZero() {
		dto.LastRunTime = status.LastRunTime.Format(time.RFC3339)
	}
	if !status.NextRunTime.IsZero() {
		dto.NextRunTime = status.NextRunTime.Format(time.RFC3339)
	}
	writeJSON(w, http.StatusOK, dto)
}

// --- Router ---

// routeAPI handles routing for /api/* paths.
func (s *Server) routeAPI(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, s.basePath+"/api")

	// Public endpoints (no auth).
	if path == "/auth/login" {
		s.handleLogin(w, r)
		return
	}

	// SSE uses token in query string.
	if path == "/events" {
		s.handleSSE(w, r)
		return
	}

	// All remaining API routes require JWT auth.
	if !s.requireAuth(w, r) {
		return
	}

	switch {
	case path == "/auth/check" && r.Method == http.MethodGet:
		s.handleAuthCheck(w, r)

	case path == "/integrations" && r.Method == http.MethodGet:
		s.handleListIntegrations(w, r)
	case path == "/integrations" && r.Method == http.MethodPost:
		s.handleCreateIntegration(w, r)
	case path == "/integrations/test" && r.Method == http.MethodPost:
		s.handleTestConnection(w, r)
	case strings.HasPrefix(path, "/integrations/") && r.Method == http.MethodPut:
		idStr := strings.TrimPrefix(path, "/integrations/")
		s.handleUpdateIntegration(w, r, idStr)
	case strings.HasPrefix(path, "/integrations/") && r.Method == http.MethodDelete:
		idStr := strings.TrimPrefix(path, "/integrations/")
		s.handleDeleteIntegration(w, r, idStr)

	case path == "/settings" && r.Method == http.MethodGet:
		s.handleGetSettings(w, r)
	case path == "/settings" && r.Method == http.MethodPut:
		s.handleUpdateSettings(w, r)

	case path == "/engine/trigger" && r.Method == http.MethodPost:
		s.handleTriggerEngine(w, r)
	case path == "/engine/status" && r.Method == http.MethodGet:
		s.handleEngineStatus(w, r)

	default:
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
	}
}

// --- Helpers ---

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data) //nolint:errcheck
}

// requireAuth extracts and validates JWT from the Authorization header.
// Returns true if auth succeeded, false if it wrote an error response.
func (s *Server) requireAuth(w http.ResponseWriter, r *http.Request) bool {
	authHeader := r.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "missing or invalid authorization header"})
		return false
	}

	token := strings.TrimPrefix(authHeader, "Bearer ")
	claims, err := s.verifyJWT(token)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": err.Error()})
		return false
	}

	// Store claims in context for downstream handlers.
	ctx := context.WithValue(r.Context(), ctxClaimsKey, claims)
	*r = *r.WithContext(ctx)
	return true
}

type contextKey string

const ctxClaimsKey contextKey = "claims"
