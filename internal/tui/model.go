package tui

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"gitlab.com/starshadow/software/disablarr/internal/db"

	"github.com/charmbracelet/bubbles/table"
	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/huh"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/ssh"
)

type state int

const (
	stateManageIntegrations state = iota
	stateIntegrationForm
	stateConfirmSave
	stateSettingsForm
	stateLogView
)

type ErrorMsg error

// logRefreshMsg is sent periodically to refresh the log view content.
type logRefreshMsg struct{}

func doLogRefresh() tea.Cmd {
	return tea.Tick(time.Second, func(time.Time) tea.Msg { return logRefreshMsg{} })
}

type Model struct {
	db     *db.DB
	sess   ssh.Session
	state  state
	err    error
	width  int
	height int

	// Menu Selection (0: Manage, 1: Settings, 2: Logs, 3: Exit)
	menuSelection int

	// Forms
	integrationForm *huh.Form
	confirmForm     *huh.Form
	settingsForm    *huh.Form

	// List
	integrationsTable table.Model
	integrations      []db.Integration

	// Input Holders
	integrationID      *int // nil if adding new, set if editing
	integrationName    string
	integrationType    string
	integrationURL     string
	integrationAPIKey  string
	integrationEnabled bool
	settingsInterval   string
	settingsTheme      string
	settingsDryRun     bool
	formErr            error

	// Theme
	themeName string
	theme     *UITheme

	// Log view
	logs    *LogBuffer
	logView viewport.Model

	// Run Now
	triggerFn func()
	statusMsg string
	dryRun    bool
}

func NewModel(database *db.DB, s ssh.Session, triggerFn func(), logs *LogBuffer) *Model {
	themeName := "disablarr"
	s_setting, err := database.GetSetting(context.Background())
	if err == nil && s_setting.ThemeName != "" {
		themeName = s_setting.ThemeName
	}

	return &Model{
		db:        database,
		sess:      s,
		state:     stateManageIntegrations,
		triggerFn: triggerFn,
		theme:     GetUITheme(themeName),
		themeName: themeName,
		logs:      logs,
	}
}

func (m *Model) Init() tea.Cmd {
	return m.loadIntegrations()
}

func (m *Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "ctrl+c":
			return m, tea.Quit
		case "q":
			if m.state == stateManageIntegrations {
				return m, tea.Quit
			}
			m.state = stateManageIntegrations
			return m, m.loadIntegrations()
		case "esc":
			if m.state == stateManageIntegrations {
				return m, tea.Quit
			}
			m.state = stateManageIntegrations
			return m, m.loadIntegrations()
		}
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
	case ErrorMsg:
		m.err = msg
		m.state = stateManageIntegrations
		return m, m.loadIntegrations()
	case integrationsLoadedMsg:
		m.integrations = msg.integrations
		m.integrationsTable = msg.table
		m.themeName = msg.themeName
		m.dryRun = msg.dryRun
		m.theme = GetUITheme(msg.themeName)
		// Apply theme-aware table styles.
		ts := table.DefaultStyles()
		ts.Header = ts.Header.BorderStyle(lipgloss.NormalBorder()).BorderBottom(true).Foreground(m.theme.Accent)
		ts.Selected = ts.Selected.Foreground(m.theme.Accent).Bold(true)
		m.integrationsTable.SetStyles(ts)
		return m, nil
	case logRefreshMsg:
		if m.state == stateLogView {
			m.refreshLogView()
			return m, doLogRefresh()
		}
		return m, nil
	}

	var cmd tea.Cmd

	switch m.state {
	case stateManageIntegrations:
		// Clear any displayed error and status on the next keypress.
		if _, ok := msg.(tea.KeyMsg); ok {
			m.err = nil
			m.statusMsg = ""
		}

		if keyMsg, ok := msg.(tea.KeyMsg); ok {
			switch keyMsg.String() {
			case "left", "h":
				if m.menuSelection > 0 {
					m.menuSelection--
				}
			case "right", "l":
				if m.menuSelection < 3 {
					m.menuSelection++
				}
			case "enter":
				switch m.menuSelection {
				case 0:
					// Enter on "Manage Integrations": open the selected row for editing.
					if len(m.integrations) > 0 {
						selectedRowIndex := m.integrationsTable.Cursor()
						if selectedRowIndex >= 0 && selectedRowIndex < len(m.integrations) {
							selectedIntegration := m.integrations[selectedRowIndex]
							m.state = stateIntegrationForm
							m.buildIntegrationForm(&selectedIntegration)
							cmd = m.integrationForm.Init()
						}
					}
				case 1:
					// Settings
					m.state = stateSettingsForm
					m.buildSettingsForm()
					cmd = m.settingsForm.Init()
				case 2:
					// Logs
					m.state = stateLogView
					m.logView = viewport.New(m.width-4, m.height-8)
					m.refreshLogView()
					cmd = doLogRefresh()
				case 3:
					return m, tea.Quit
				}
				return m, cmd
			case "r":
				// Manually trigger the engine cycle.
				if m.triggerFn != nil {
					m.triggerFn()
					m.statusMsg = "Engine run triggered!"
				}
			case "d":
				// Quick-toggle dry run mode.
				m.dryRun = !m.dryRun
				_ = m.db.UpdateDryRun(context.Background(), m.dryRun)
				if m.dryRun {
					m.statusMsg = "Dry run mode ENABLED"
				} else {
					m.statusMsg = "Dry run mode DISABLED"
				}
			case "a":
				// Add Integration
				m.state = stateIntegrationForm
				m.buildIntegrationForm(nil)
				cmd = m.integrationForm.Init()
				return m, cmd
			case "delete", "x":
				// TODO: Confirmation Form
				if len(m.integrations) > 0 {
					selectedRowIndex := m.integrationsTable.Cursor()
					if selectedRowIndex >= 0 && selectedRowIndex < len(m.integrations) {
						id := m.integrations[selectedRowIndex].ID
						if err := m.db.RemoveIntegration(context.Background(), id); err != nil {
							m.err = err
						} else {
							cmd = m.loadIntegrations()
						}
					}
				}
				return m, cmd
			}
		}

		// Pass all other messages (up/down arrow navigation) through to the table.
		m.integrationsTable, cmd = m.integrationsTable.Update(msg)

	case stateIntegrationForm:
		form, newCmd := m.integrationForm.Update(msg)
		if f, ok := form.(*huh.Form); ok {
			m.integrationForm = f
		}
		cmd = newCmd

		if m.integrationForm.State == huh.StateCompleted {
			if m.integrationName == "" || m.integrationURL == "" || m.integrationAPIKey == "" {
				m.formErr = fmt.Errorf("Name, URL, and API Key are required fields")
				m.state = stateIntegrationForm
				m.integrationForm = m.buildIntegrationHuhForm()
				cmd = m.integrationForm.Init()
			} else {
				m.formErr = nil
				// Test Connection
				err := testArrConnection(m.integrationURL, m.integrationAPIKey)
				if err != nil {
					m.state = stateConfirmSave
					m.confirmForm = huh.NewForm(
						huh.NewGroup(
							huh.NewConfirm().
								Title(fmt.Sprintf("Connection failed (%v). Save anyway?", err)).
								Key("confirm"),
						),
					).WithTheme(m.theme.Form).WithAccessible(false)
					cmd = m.confirmForm.Init()
				} else {
					// Save to DB
					if m.integrationID == nil {
						if saveErr := m.db.AddIntegration(context.Background(), m.integrationName, m.integrationType, m.integrationURL, m.integrationAPIKey, m.integrationEnabled); saveErr != nil {
							m.err = saveErr
						}
					} else {
						if saveErr := m.db.UpdateIntegration(context.Background(), *m.integrationID, m.integrationName, m.integrationType, m.integrationURL, m.integrationAPIKey, m.integrationEnabled); saveErr != nil {
							m.err = saveErr
						}
					}
					m.state = stateManageIntegrations
					cmd = m.loadIntegrations()
				}
			}
		} else if m.integrationForm.State == huh.StateAborted {
			m.formErr = nil
			m.state = stateManageIntegrations
			cmd = m.loadIntegrations()
		}

	case stateConfirmSave:
		form, newCmd := m.confirmForm.Update(msg)
		if f, ok := form.(*huh.Form); ok {
			m.confirmForm = f
		}
		cmd = newCmd

		if m.confirmForm.State == huh.StateCompleted {
			if m.confirmForm.GetBool("confirm") {
				// User chose to save anyway
				if m.integrationID == nil {
					if saveErr := m.db.AddIntegration(context.Background(), m.integrationName, m.integrationType, m.integrationURL, m.integrationAPIKey, m.integrationEnabled); saveErr != nil {
						m.err = saveErr
					}
				} else {
					if saveErr := m.db.UpdateIntegration(context.Background(), *m.integrationID, m.integrationName, m.integrationType, m.integrationURL, m.integrationAPIKey, m.integrationEnabled); saveErr != nil {
						m.err = saveErr
					}
				}
				m.state = stateManageIntegrations
				cmd = m.loadIntegrations()
			} else {
				// User chose not to save, return to the integration form
				m.state = stateIntegrationForm
				m.integrationForm = m.buildIntegrationHuhForm()
				cmd = m.integrationForm.Init()
			}
		} else if m.confirmForm.State == huh.StateAborted {
			m.state = stateIntegrationForm
			m.integrationForm = m.buildIntegrationHuhForm()
			cmd = m.integrationForm.Init()
		}

	case stateSettingsForm:
		form, newCmd := m.settingsForm.Update(msg)
		if f, ok := form.(*huh.Form); ok {
			m.settingsForm = f
		}
		cmd = newCmd

		if m.settingsForm.State == huh.StateCompleted {
			interval, _ := strconv.Atoi(m.settingsInterval)
			m.formErr = nil
			_ = m.db.UpdateInterval(context.Background(), interval)
			_ = m.db.UpdateTheme(context.Background(), m.settingsTheme)
			_ = m.db.UpdateDryRun(context.Background(), m.settingsDryRun)
			m.state = stateManageIntegrations
			cmd = m.loadIntegrations()
		} else if m.settingsForm.State == huh.StateAborted {
			m.state = stateManageIntegrations
			cmd = m.loadIntegrations()
		}

	case stateLogView:
		m.logView, cmd = m.logView.Update(msg)
	}

	return m, cmd
}

// refreshLogView updates the viewport content from the log buffer.
func (m *Model) refreshLogView() {
	entries := m.logs.Entries()
	content := strings.Join(entries, "\n")
	m.logView.SetContent(content)
	// Auto-scroll to bottom on refresh.
	m.logView.GotoBottom()
}

func (m *Model) View() string {
	if m.err != nil {
		return fmt.Sprintf("\n  Error: %v\n  Press any key to continue.\n", m.err)
	}

	switch m.state {
	case stateManageIntegrations:
		statusLine := ""
		if m.statusMsg != "" {
			statusLine = "\n  " + m.theme.Status.Render(m.statusMsg)
		}
		dryRunBadge := lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#00cc00")).Render("DRY RUN")
		if !m.dryRun {
			dryRunBadge = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#cc0000")).Render("LIVE")
		}
		return "\n  " + m.theme.Title.Render("=== Disablarr Management ===") + "  " + dryRunBadge + "\n\n" +
			m.menuView() + "\n\n  " +
			m.theme.Title.Render("=== Integrations ===") + "\n" +
			m.integrationsTable.View() + "\n\n  " +
			m.theme.Hint.Render("Navigate: [← →] Menu | [↑ ↓] Table\n  [a] Add  |  [Enter] Edit  |  [x] Delete  |  [r] Run Now  |  [d] Toggle Dry Run  |  [Esc] Back") +
			statusLine
	case stateIntegrationForm:
		errStr := ""
		if m.formErr != nil {
			errStr = m.theme.Error.Render(fmt.Sprintf("\n  Error: %v", m.formErr))
		}
		return "\n  " + m.theme.Title.Render("=== Integration Setup ===") + errStr + "\n\n" + m.integrationForm.View()
	case stateConfirmSave:
		return "\n  " + m.theme.Title.Render("=== Confirm Integration ===") + "\n\n" + m.confirmForm.View()
	case stateSettingsForm:
		errStr := ""
		if m.formErr != nil {
			errStr = m.theme.Error.Render(fmt.Sprintf("\n  Error: %v", m.formErr))
		}
		return "\n  " + m.theme.Title.Render("=== Settings ===") + errStr + "\n\n" + m.settingsForm.View()
	case stateLogView:
		return "\n  " + m.theme.Title.Render("=== Engine Logs ===") + "\n\n" +
			m.logView.View() + "\n\n  " +
			m.theme.Hint.Render("[↑ ↓ / PgUp PgDn] Scroll  |  [q / Esc] Back")
	}
	return "Unknown state"
}

func (m *Model) menuView() string {
	var builder strings.Builder
	options := []string{"Manage Integrations", "Settings", "Logs", "Exit"}

	for i, opt := range options {
		if i == m.menuSelection {
			builder.WriteString(m.theme.MenuActive.Render(opt))
		} else {
			builder.WriteString(m.theme.MenuInactive.Render(opt))
		}
		if i < len(options)-1 {
			builder.WriteString("  ")
		}
	}
	return builder.String()
}

func testArrConnection(urlStr, apiKey string) error {
	client := &http.Client{Timeout: 5 * time.Second}

	// Ensure no trailing slash
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

// Data loaders and form builders below...
