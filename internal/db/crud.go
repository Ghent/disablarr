package db

import (
	"context"
	"time"
)

// AddIntegration encrypts the API key and stores the integration in the database.
func (db *DB) AddIntegration(ctx context.Context, name, integrationType, url, apiKey string, enabled, unmonitorCompletedSeasons bool) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	encryptedKey, err := db.cm.Encrypt([]byte(apiKey))
	if err != nil {
		return err
	}

	enabledInt := 0
	if enabled {
		enabledInt = 1
	}

	ucSeasonsInt := 0
	if unmonitorCompletedSeasons {
		ucSeasonsInt = 1
	}

	query := `INSERT INTO integrations (name, type, url, api_key_encrypted, enabled, unmonitor_completed_seasons) VALUES (?, ?, ?, ?, ?, ?)`
	_, err = db.conn.ExecContext(ctx, query, name, integrationType, url, encryptedKey, enabledInt, ucSeasonsInt)
	return err
}

// ListIntegrations returns all configured integrations.
func (db *DB) ListIntegrations(ctx context.Context) ([]Integration, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	query := `SELECT id, name, type, url, api_key_encrypted, enabled, unmonitor_completed_seasons FROM integrations ORDER BY id ASC`
	rows, err := db.conn.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	var integrations []Integration
	for rows.Next() {
		var i Integration
		var encryptedKey []byte
		var enabledInt int
		var ucSeasonsInt int

		if err := rows.Scan(&i.ID, &i.Name, &i.Type, &i.URL, &encryptedKey, &enabledInt, &ucSeasonsInt); err != nil {
			return nil, err
		}

		decryptedKey, err := db.cm.Decrypt(encryptedKey)
		if err != nil {
			return nil, err
		}

		i.APIKey = string(decryptedKey)
		i.Enabled = enabledInt == 1
		i.UnmonitorCompletedSeasons = ucSeasonsInt == 1
		integrations = append(integrations, i)
	}

	return integrations, rows.Err()
}

// RemoveIntegration deletes an integration by ID.
func (db *DB) RemoveIntegration(ctx context.Context, id int) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	query := `DELETE FROM integrations WHERE id = ?`
	_, err := db.conn.ExecContext(ctx, query, id)
	return err
}

// UpdateIntegration modifies an existing integration.
func (db *DB) UpdateIntegration(ctx context.Context, id int, name, integrationType, url, apiKey string, enabled, unmonitorCompletedSeasons bool) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	encryptedKey, err := db.cm.Encrypt([]byte(apiKey))
	if err != nil {
		return err
	}

	enabledInt := 0
	if enabled {
		enabledInt = 1
	}

	ucSeasonsInt := 0
	if unmonitorCompletedSeasons {
		ucSeasonsInt = 1
	}

	query := `UPDATE integrations SET name = ?, type = ?, url = ?, api_key_encrypted = ?, enabled = ?, unmonitor_completed_seasons = ? WHERE id = ?`
	_, err = db.conn.ExecContext(ctx, query, name, integrationType, url, encryptedKey, enabledInt, ucSeasonsInt, id)
	return err
}

// GetSetting returns the application settings.
func (db *DB) GetSetting(ctx context.Context) (AppSetting, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	query := `SELECT id, interval_minutes, theme_name, dry_run FROM settings WHERE id = 1`
	var setting AppSetting
	var dryRunInt int
	err := db.conn.QueryRowContext(ctx, query).Scan(&setting.ID, &setting.IntervalMinutes, &setting.ThemeName, &dryRunInt)
	setting.DryRun = dryRunInt == 1
	return setting, err
}

// UpdateInterval changes the run interval.
func (db *DB) UpdateInterval(ctx context.Context, minutes int) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	query := `UPDATE settings SET interval_minutes = ? WHERE id = 1`
	_, err := db.conn.ExecContext(ctx, query, minutes)
	return err
}

// UpdateTheme changes the active UI theme name.
func (db *DB) UpdateTheme(ctx context.Context, themeName string) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	query := `UPDATE settings SET theme_name = ? WHERE id = 1`
	_, err := db.conn.ExecContext(ctx, query, themeName)
	return err
}

// UpdateDryRun toggles the dry run mode.
func (db *DB) UpdateDryRun(ctx context.Context, enabled bool) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	val := 0
	if enabled {
		val = 1
	}

	query := `UPDATE settings SET dry_run = ? WHERE id = 1`
	_, err := db.conn.ExecContext(ctx, query, val)
	return err
}
