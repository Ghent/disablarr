package db

import (
	"context"
	"database/sql"
	"time"

	_ "github.com/ncruces/go-sqlite3/driver"
	_ "github.com/ncruces/go-sqlite3/embed"
	"gitlab.com/starshadow/software/disablarr/internal/crypto"
)

// AppSetting represents application-wide configuration.
type AppSetting struct {
	ID              int
	IntervalMinutes int
	ThemeName       string
	DryRun          bool
}

// Integration represents a configured Radarr or Sonarr server.
type Integration struct {
	ID      int
	Name    string
	Type    string
	URL     string
	APIKey  string
	Enabled bool
	UnmonitorCompletedSeasons bool
}

type DB struct {
	conn *sql.DB
	cm   *crypto.CryptoManager
}

func NewDB(dbPath string, cm *crypto.CryptoManager) (*DB, error) {
	conn, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
	}

	if err := conn.Ping(); err != nil {
		return nil, err
	}

	db := &DB{
		conn: conn,
		cm:   cm,
	}

	if err := db.initSchema(); err != nil {
		return nil, err
	}

	return db, nil
}

func (db *DB) initSchema() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	schema := `
	CREATE TABLE IF NOT EXISTS schema_info (
		family TEXT PRIMARY KEY,
		version INTEGER NOT NULL
	);

	INSERT OR IGNORE INTO schema_info (family, version) VALUES ('disablarr', 1);

	CREATE TABLE IF NOT EXISTS settings (
		id INTEGER PRIMARY KEY CHECK (id = 1),
		interval_minutes INTEGER NOT NULL DEFAULT 15
	);

	INSERT OR IGNORE INTO settings (id, interval_minutes) VALUES (1, 15);

	CREATE TABLE IF NOT EXISTS integrations (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE,
		type TEXT NOT NULL CHECK(type IN ('radarr', 'sonarr')),
		url TEXT NOT NULL,
		api_key_encrypted BLOB NOT NULL,
		enabled INTEGER NOT NULL DEFAULT 1
	);
	`
	_, err := db.conn.ExecContext(ctx, schema)
	if err != nil {
		return err
	}

	// Idempotent migration: add theme_name column if it doesn't exist yet.
	// SQLite returns "duplicate column name" if it's already there; we intentionally ignore it.
	_, _ = db.conn.ExecContext(ctx, `ALTER TABLE settings ADD COLUMN theme_name TEXT NOT NULL DEFAULT 'disablarr'`)

	// Idempotent migration: add dry_run column.
	_, _ = db.conn.ExecContext(ctx, `ALTER TABLE settings ADD COLUMN dry_run INTEGER NOT NULL DEFAULT 1`)

	// Idempotent migration: add unmonitor_completed_seasons to integrations
	_, _ = db.conn.ExecContext(ctx, `ALTER TABLE integrations ADD COLUMN unmonitor_completed_seasons INTEGER NOT NULL DEFAULT 0`)
	return nil
}

func (db *DB) Close() error {
	return db.conn.Close()
}
