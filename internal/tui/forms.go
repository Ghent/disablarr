package tui

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/charmbracelet/bubbles/table"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/huh"
	"gitlab.com/starshadow/software/disablarr/internal/db"
)

type integrationsLoadedMsg struct {
	integrations []db.Integration
	table        table.Model
	themeName    string
	dryRun       bool
}

func (m *Model) loadIntegrations() tea.Cmd {
	return func() tea.Msg {
		integrations, err := m.db.ListIntegrations(context.Background())
		if err != nil {
			return ErrorMsg(err)
		}

		setting, _ := m.db.GetSetting(context.Background())

		columns := []table.Column{
			{Title: "ID", Width: 4},
			{Title: "Name", Width: 20},
			{Title: "Type", Width: 10},
			{Title: "URL", Width: 25},
			{Title: "Key", Width: 15},
			{Title: "Enabled", Width: 10},
		}

		var rows []table.Row
		for _, i := range integrations {
			enabledStr := "True"
			if !i.Enabled {
				enabledStr = "False"
			}

			// Mask API Key: Show first 4 and last 4
			maskedKey := "********"
			if len(i.APIKey) > 8 {
				maskedKey = fmt.Sprintf("%s...%s", i.APIKey[:4], i.APIKey[len(i.APIKey)-4:])
			} else if len(i.APIKey) > 0 {
				maskedKey = i.APIKey[:1] + "..."
			}

			// Trim URL if it's too long
			url := i.URL
			if len(url) > 22 {
				url = url[:19] + "..."
			}

			rows = append(rows, table.Row{
				strconv.Itoa(i.ID),
				i.Name,
				strings.ToUpper(i.Type),
				url,
				maskedKey,
				enabledStr,
			})
		}

		t := table.New(
			table.WithColumns(columns),
			table.WithRows(rows),
			table.WithFocused(true),
			table.WithHeight(10),
		)

		return integrationsLoadedMsg{
			integrations: integrations,
			table:        t,
			themeName:    setting.ThemeName,
			dryRun:       setting.DryRun,
		}
	}
}

// buildIntegrationHuhForm creates the huh.Form for the integration editor using
// the current m.integration* field values. It does NOT touch those values.
func (m *Model) buildIntegrationHuhForm() *huh.Form {
	return huh.NewForm(
		huh.NewGroup(
			huh.NewInput().
				Title("Name").
				Value(&m.integrationName),
			huh.NewSelect[string]().
				Title("Type").
				Options(
					huh.NewOption("Radarr", "radarr"),
					huh.NewOption("Sonarr", "sonarr"),
				).
				Value(&m.integrationType),
			huh.NewInput().
				Title("URL").
				Value(&m.integrationURL),
			huh.NewInput().
				Title("API Key").
				EchoMode(huh.EchoModePassword).
				Value(&m.integrationAPIKey),
			huh.NewConfirm().
				Title("Enabled?").
				Value(&m.integrationEnabled),
		),
	).WithTheme(m.theme.Form).WithAccessible(false)
}

// buildIntegrationForm sets the model's integration fields from the given
// integration (or resets to defaults when nil), then rebuilds the huh form.
func (m *Model) buildIntegrationForm(integration *db.Integration) {
	if integration != nil {
		id := integration.ID
		m.integrationID = &id
		m.integrationName = integration.Name
		m.integrationType = integration.Type
		m.integrationURL = integration.URL
		m.integrationAPIKey = integration.APIKey
		m.integrationEnabled = integration.Enabled
	} else {
		m.integrationID = nil
		m.integrationName = ""
		m.integrationType = "radarr"
		m.integrationURL = ""
		m.integrationAPIKey = ""
		m.integrationEnabled = true
	}
	m.integrationForm = m.buildIntegrationHuhForm()
}

func (m *Model) buildSettingsForm() {
	s, err := m.db.GetSetting(context.Background())
	if err == nil {
		m.settingsInterval = strconv.Itoa(s.IntervalMinutes)
		m.settingsTheme = s.ThemeName
		m.settingsDryRun = s.DryRun
	} else {
		m.settingsInterval = "15"
		m.settingsTheme = "disablarr"
		m.settingsDryRun = true
	}

	m.settingsForm = huh.NewForm(
		huh.NewGroup(
			huh.NewInput().
				Title("Engine Check Interval (Minutes)").
				Value(&m.settingsInterval).
				Validate(func(str string) error {
					v, err := strconv.Atoi(str)
					if err != nil {
						return fmt.Errorf("must be an integer")
					}
					if v < 1 {
						return fmt.Errorf("must be at least 1")
					}
					return nil
				}),
			huh.NewSelect[string]().
				Title("UI Theme").
				Options(ThemeOptions()...).
				Value(&m.settingsTheme),
			huh.NewConfirm().
				Title("Dry Run Mode").
				Description("When enabled, the engine logs what it would change without making API calls.").
				Value(&m.settingsDryRun),
		),
	).WithTheme(m.theme.Form).WithAccessible(false)
}
