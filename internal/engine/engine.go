package engine

import (
	"context"
	"log/slog"
	"strings"
	"sync"
	"time"

	"gitlab.com/starshadow/software/disablarr/internal/arr"
	"gitlab.com/starshadow/software/disablarr/internal/db"
)

// EngineStatus is a snapshot of the engine's current state.
type EngineStatus struct {
	IsRunning   bool
	LastRunTime time.Time
	NextRunTime time.Time
	CycleCount  int64
}

// Engine represents the background daemon process.
type Engine struct {
	db      *db.DB
	trigger chan struct{}

	mu          sync.RWMutex
	isRunning   bool
	lastRunTime time.Time
	nextRunTime time.Time
	cycleCount  int64
}

// New creates a new background engine.
func New(database *db.DB) *Engine {
	return &Engine{
		db:      database,
		trigger: make(chan struct{}, 1), // buffered: never blocks the caller
	}
}

// Status returns a snapshot of the engine's current state.
func (e *Engine) Status() EngineStatus {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return EngineStatus{
		IsRunning:   e.isRunning,
		LastRunTime: e.lastRunTime,
		NextRunTime: e.nextRunTime,
		CycleCount:  e.cycleCount,
	}
}

// TriggerNow requests an immediate engine cycle.
// Safe to call concurrently; duplicate triggers are coalesced.
func (e *Engine) TriggerNow() {
	select {
	case e.trigger <- struct{}{}:
	default: // a run is already queued
	}
}

// Run starts the engine loop. It blocks until the context is canceled.
func (e *Engine) Run(ctx context.Context) {
	slog.Info("Engine started")

	// Get initial setting
	setting, err := e.db.GetSetting(ctx)
	if err != nil {
		slog.Error("Failed to get initial settings, defaulting to 15m", "error", err)
		setting.IntervalMinutes = 15
	}

	interval := time.Duration(setting.IntervalMinutes) * time.Minute
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	e.updateNextRun(interval)

	// Run once immediately
	e.runCycleWithTracking(ctx)

	for {
		select {
		case <-ctx.Done():
			slog.Info("Engine shutting down")
			return
		case <-ticker.C:
			slog.Debug("Engine cycle triggered")

			// Check if interval changed
			newSetting, err := e.db.GetSetting(ctx)
			if err == nil && newSetting.IntervalMinutes != setting.IntervalMinutes {
				slog.Info("Interval setting changed", "old_minutes", setting.IntervalMinutes, "new_minutes", newSetting.IntervalMinutes)
				setting = newSetting
				interval = time.Duration(setting.IntervalMinutes) * time.Minute
				ticker.Reset(interval)
			}

			e.updateNextRun(interval)
			e.runCycleWithTracking(ctx)
		case <-e.trigger:
			slog.Info("Engine manually triggered")
			e.runCycleWithTracking(ctx)
		}
	}
}

// runCycleWithTracking wraps executeCycle with state tracking for the web API.
func (e *Engine) runCycleWithTracking(ctx context.Context) {
	e.mu.Lock()
	e.isRunning = true
	e.mu.Unlock()

	e.executeCycle(ctx)

	e.mu.Lock()
	e.isRunning = false
	e.lastRunTime = time.Now()
	e.cycleCount++
	e.mu.Unlock()
}

// updateNextRun updates the next scheduled run time.
func (e *Engine) updateNextRun(interval time.Duration) {
	e.mu.Lock()
	e.nextRunTime = time.Now().Add(interval)
	e.mu.Unlock()
}

func (e *Engine) executeCycle(ctx context.Context) {
	slog.Info("Executing Disablarr cycle")

	setting, err := e.db.GetSetting(ctx)
	if err != nil {
		slog.Error("Failed to read settings for cycle", "error", err)
		return
	}

	if setting.DryRun {
		slog.Info("Dry run mode is ENABLED — no changes will be made")
	}

	integrations, err := e.db.ListIntegrations(ctx)
	if err != nil {
		slog.Error("Failed to list integrations", "error", err)
		return
	}

	for _, integration := range integrations {
		if !integration.Enabled {
			slog.Debug("Skipping disabled integration", "name", integration.Name)
			continue
		}

		slog.Info("Processing integration", "name", integration.Name, "type", integration.Type)

		client := arr.NewClient(integration.URL, integration.APIKey)

		if strings.ToLower(integration.Type) == "sonarr" {
			e.processSonarr(ctx, client, integration.Name, setting.DryRun)
		} else if strings.ToLower(integration.Type) == "radarr" {
			e.processRadarr(ctx, client, integration.Name, setting.DryRun)
		}
	}
}

func (e *Engine) processSonarr(ctx context.Context, client *arr.Client, identity string, dryRun bool) {
	// 1. Ensure our operational tags exist so we can grab their IDs
	disablarrTagID, err := client.EnsureTag(ctx, "disablarr")
	if err != nil {
		slog.Error("Sonarr failed to ensure 'disablarr' tag", "integration", identity, "error", err)
		return
	}

	ignoreTagID, err := client.EnsureTag(ctx, "disablarr-ignore")
	if err != nil {
		slog.Error("Sonarr failed to ensure 'disablarr-ignore' tag", "integration", identity, "error", err)
		return
	}

	// 2. Fetch all series
	seriesList, err := client.GetSeries(ctx)
	if err != nil {
		slog.Error("Sonarr failed to fetch series", "integration", identity, "error", err)
		return
	}

	var processedCount int
	for _, s := range seriesList {
		// Rule 1: Must be currently monitored to care
		if !s.Monitored {
			continue
		}

		// Rule 2: Must be "ended"
		if strings.ToLower(s.Status) != "ended" {
			continue
		}

		// Rule 3: Must NOT possess the ignore tag
		hasIgnore := false
		for _, tagID := range s.Tags {
			if tagID == ignoreTagID {
				hasIgnore = true
				break
			}
		}
		if hasIgnore {
			continue
		}

		if dryRun {
			slog.Info("[DRY RUN] Would unmonitor series", "integration", identity, "series", s.Title)
			processedCount++
			continue
		}

		// Action: Unmonitor and tag
		s.Monitored = false

		// Append disablarr tag if not already there
		hasDisablarr := false
		for _, tagID := range s.Tags {
			if tagID == disablarrTagID {
				hasDisablarr = true
				break
			}
		}
		if !hasDisablarr {
			s.Tags = append(s.Tags, disablarrTagID)
		}

		err := client.UpdateSeries(ctx, s)
		if err != nil {
			slog.Error("Sonarr failed to update series", "integration", identity, "series", s.Title, "error", err)
		} else {
			slog.Info("Sonarr successfully unmonitored series", "integration", identity, "series", s.Title)
			processedCount++
		}
	}

	slog.Info("Sonarr processing complete", "integration", identity, "unmonitored_count", processedCount, "dry_run", dryRun)
}

func (e *Engine) processRadarr(ctx context.Context, client *arr.Client, identity string, dryRun bool) {
	// 1. Ensure our operational tags exist so we can grab their IDs
	disablarrTagID, err := client.EnsureTag(ctx, "disablarr")
	if err != nil {
		slog.Error("Radarr failed to ensure 'disablarr' tag", "integration", identity, "error", err)
		return
	}

	ignoreTagID, err := client.EnsureTag(ctx, "disablarr-ignore")
	if err != nil {
		slog.Error("Radarr failed to ensure 'disablarr-ignore' tag", "integration", identity, "error", err)
		return
	}

	// 2. Fetch all profiles to map QualityProfile ID to Cutoff values
	profiles, err := client.GetQualityProfiles(ctx)
	if err != nil {
		slog.Error("Radarr failed to fetch quality profiles", "integration", identity, "error", err)
		return
	}

	// Map ProfileID -> CutoffID
	profileCutoffs := make(map[int]int)
	for _, p := range profiles {
		profileCutoffs[p.ID] = p.Cutoff
	}

	// 3. Fetch all movies
	movies, err := client.GetMovies(ctx)
	if err != nil {
		slog.Error("Radarr failed to fetch movies", "integration", identity, "error", err)
		return
	}

	var processedCount int
	for _, m := range movies {
		// Rule 1: Must be monitored
		if !m.Monitored {
			continue
		}

		// Rule 2: Must be downloaded
		if !m.HasFile || m.MovieFile == nil {
			continue
		}

		// Rule 3: Quality must meet the cutoff specified by its profile
		cutoffID, ok := profileCutoffs[m.QualityProfileId]
		if ok {
			profileMet := false
			if m.MovieFile.Quality.Quality.ID == cutoffID {
				profileMet = true
			}

			// Alternatively, if the profile doesn't allow upgrades at all, whatever downloaded is final
			var profileInstance arr.QualityProfile
			for _, p := range profiles {
				if p.ID == m.QualityProfileId {
					profileInstance = p
					break
				}
			}
			if !profileInstance.UpgradeAllowed {
				profileMet = true
			}

			if !profileMet {
				continue
			}
		}

		// Rule 4: Must NOT possess the ignore tag
		hasIgnore := false
		for _, tagID := range m.Tags {
			if tagID == ignoreTagID {
				hasIgnore = true
				break
			}
		}
		if hasIgnore {
			continue
		}

		if dryRun {
			slog.Info("[DRY RUN] Would unmonitor movie", "integration", identity, "movie", m.Title)
			processedCount++
			continue
		}

		// Action: Unmonitor and tag
		m.Monitored = false

		// Append disablarr tag if not already there
		hasDisablarr := false
		for _, tagID := range m.Tags {
			if tagID == disablarrTagID {
				hasDisablarr = true
				break
			}
		}
		if !hasDisablarr {
			m.Tags = append(m.Tags, disablarrTagID)
		}

		err := client.UpdateMovie(ctx, m)
		if err != nil {
			slog.Error("Radarr failed to update movie", "integration", identity, "movie", m.Title, "error", err)
		} else {
			slog.Info("Radarr successfully unmonitored movie", "integration", identity, "movie", m.Title)
			processedCount++
		}
	}

	slog.Info("Radarr processing complete", "integration", identity, "unmonitored_count", processedCount, "dry_run", dryRun)
}
