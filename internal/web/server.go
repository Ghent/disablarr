package web

import (
	"context"
	"fmt"
	"io/fs"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"gitlab.com/starshadow/software/disablarr/internal/db"
	"gitlab.com/starshadow/software/disablarr/internal/engine"
	"gitlab.com/starshadow/software/disablarr/internal/tui"
)

// Server is the HTTP server that serves the web UI and API.
type Server struct {
	httpServer *http.Server
	db         *db.DB
	engine     *engine.Engine
	logs       *tui.LogBuffer
	masterKey  string
	basePath   string
	triggerFn  func()
}

// New creates a new web server.
func New(database *db.DB, eng *engine.Engine, logs *tui.LogBuffer, masterKey string, port int, basePath string, triggerFn func()) *Server {
	s := &Server{
		db:        database,
		engine:    eng,
		logs:      logs,
		masterKey: masterKey,
		basePath:  basePath,
		triggerFn: triggerFn,
	}

	mux := http.NewServeMux()

	// API routes (prefixed with basePath).
	mux.HandleFunc(basePath+"/api/", s.corsMiddleware(s.routeAPI))

	// SPA fallback: serve the embedded frontend.
	spaFS, err := fs.Sub(frontendFS, "dist")
	if err != nil {
		slog.Warn("Frontend assets not found (development mode?)", "error", err)
		mux.HandleFunc(basePath+"/", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "text/html")
			fmt.Fprint(w, `<!DOCTYPE html><html><body style="background:#0d1117;color:#c9d1d9;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh"><div style="text-align:center"><h1>Disablarr</h1><p>Frontend not built. Run <code>cd web && npm run build</code> first.</p></div></body></html>`)
		})
	} else {
		// Read index.html once and inject the base path.
		indexBytes, readErr := fs.ReadFile(spaFS, "index.html")
		var indexHTML string
		if readErr == nil {
			indexHTML = strings.Replace(string(indexBytes),
				`<meta name="base-path" content="/">`,
				fmt.Sprintf(`<meta name="base-path" content="%s">`, basePath),
				1)
		}

		fileServer := http.FileServer(http.FS(spaFS))
		mux.HandleFunc(basePath+"/", func(w http.ResponseWriter, r *http.Request) {
			// Strip basePath prefix so the file server sees root-relative paths.
			path := strings.TrimPrefix(r.URL.Path, basePath)
			path = strings.TrimPrefix(path, "/")
			if path == "" {
				path = "index.html"
			}

			// Serve index.html with injected base path.
			if path == "index.html" && readErr == nil {
				w.Header().Set("Content-Type", "text/html")
				fmt.Fprint(w, indexHTML)
				return
			}

			// Check if the file exists in the embedded FS.
			if f, openErr := spaFS.Open(path); openErr == nil {
				f.Close()
				// Rewrite request path so the file server sees the correct path.
				r.URL.Path = strings.TrimPrefix(r.URL.Path, basePath)
				fileServer.ServeHTTP(w, r)
				return
			}

			// SPA fallback: serve index.html for client-side routing.
			if readErr == nil {
				w.Header().Set("Content-Type", "text/html")
				fmt.Fprint(w, indexHTML)
				return
			}
			r.URL.Path = "/"
			fileServer.ServeHTTP(w, r)
		})
	}

	s.httpServer = &http.Server{
		Addr:              fmt.Sprintf(":%d", port),
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
	}

	return s
}

// Start begins listening for HTTP connections.
func (s *Server) Start() error {
	slog.Info("Starting Web server", "address", s.httpServer.Addr)
	if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return err
	}
	return nil
}

// Stop gracefully shuts down the HTTP server.
func (s *Server) Stop(ctx context.Context) error {
	slog.Info("Stopping Web server")
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	return s.httpServer.Shutdown(ctx)
}

// corsMiddleware applies CORS headers for local development.
func (s *Server) corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next(w, r)
	}
}
