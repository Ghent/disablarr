package tui

import (
	"github.com/charmbracelet/huh"
	"github.com/charmbracelet/lipgloss"
)

// UITheme is the single source of truth for all visual styles in the TUI.
// Both huh form fields and all chrome elements (title, menu, hints, table)
// derive their colors from the same palette.
type UITheme struct {
	// Form is the huh theme applied to all interactive form fields.
	Form *huh.Theme

	// Chrome styles.
	Title        lipgloss.Style
	Hint         lipgloss.Style
	MenuActive   lipgloss.Style
	MenuInactive lipgloss.Style
	Error        lipgloss.Style
	Status       lipgloss.Style

	// Accent is the primary highlight color used for table headers and
	// selected rows, where table.Styles must be built from defaults.
	Accent lipgloss.Color
}

// ThemeOptions returns the ordered list of available theme choices for use in forms.
func ThemeOptions() []huh.Option[string] {
	return []huh.Option[string]{
		huh.NewOption("Disablarr (Default)", "disablarr"),
		huh.NewOption("Charm", "charm"),
		huh.NewOption("Dracula", "dracula"),
		huh.NewOption("Catppuccin", "catppuccin"),
		huh.NewOption("Base 16", "base16"),
		huh.NewOption("Base", "base"),
	}
}

// GetUITheme returns the unified UITheme for the given name.
// Unrecognised names fall back to the Disablarr theme.
func GetUITheme(name string) *UITheme {
	switch name {
	case "charm":
		return newUITheme(huh.ThemeCharm(), lipgloss.Color("205"), lipgloss.Color("241"), lipgloss.Color("236"))
	case "dracula":
		return newUITheme(huh.ThemeDracula(), lipgloss.Color("141"), lipgloss.Color("61"), lipgloss.Color("235"))
	case "catppuccin":
		return newUITheme(huh.ThemeCatppuccin(), lipgloss.Color("183"), lipgloss.Color("238"), lipgloss.Color("237"))
	case "base16":
		return newUITheme(huh.ThemeBase16(), lipgloss.Color("4"), lipgloss.Color("8"), lipgloss.Color("0"))
	case "base":
		return newUITheme(huh.ThemeBase(), lipgloss.Color("2"), lipgloss.Color("8"), lipgloss.Color("0"))
	default: // "disablarr"
		return newUITheme(disablarrHuhTheme(), lipgloss.Color("212"), lipgloss.Color("241"), lipgloss.Color("236"))
	}
}

// newUITheme constructs a UITheme from a huh form theme and a three-color palette:
// accent is the primary highlight, sub is the muted secondary, menuBg is the active
// menu-item background.
func newUITheme(form *huh.Theme, accent, sub, menuBg lipgloss.Color) *UITheme {
	return &UITheme{
		Form:         form,
		Title:        lipgloss.NewStyle().Foreground(accent).Bold(true),
		Hint:         lipgloss.NewStyle().Foreground(sub),
		MenuActive:   lipgloss.NewStyle().Foreground(accent).Bold(true).Padding(0, 1).Background(menuBg),
		MenuInactive: lipgloss.NewStyle().Foreground(sub).Padding(0, 1),
		Error:        lipgloss.NewStyle().Foreground(lipgloss.Color("9")),
		Status:       lipgloss.NewStyle().Foreground(lipgloss.Color("10")).Bold(true),
		Accent:       accent,
	}
}

// disablarrHuhTheme returns the custom Starshadow huh form theme.
func disablarrHuhTheme() *huh.Theme {
	t := huh.ThemeBase()

	accent := lipgloss.Color("212")
	sub := lipgloss.Color("241")
	text := lipgloss.Color("252")

	t.Focused.Title = t.Focused.Title.Foreground(accent).Bold(true)
	t.Focused.TextInput.Prompt = t.Focused.TextInput.Prompt.Foreground(accent)
	t.Focused.TextInput.Cursor = t.Focused.TextInput.Cursor.Foreground(accent)
	t.Focused.Base = t.Focused.Base.BorderForeground(sub)
	t.Focused.SelectSelector = t.Focused.SelectSelector.Foreground(accent)
	t.Focused.Option = t.Focused.Option.Foreground(text)
	t.Focused.SelectedOption = t.Focused.SelectedOption.Foreground(accent)
	t.Blurred.Title = t.Blurred.Title.Foreground(sub)

	return t
}
