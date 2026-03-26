package ssh

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/log"
	"github.com/charmbracelet/ssh"
	"github.com/charmbracelet/wish"
	"github.com/charmbracelet/wish/activeterm"
	"github.com/charmbracelet/wish/bubbletea"
	"github.com/charmbracelet/wish/logging"
	"github.com/muesli/termenv"
	"gitlab.com/starshadow/software/disablarr/internal/db"
	disablarrtui "gitlab.com/starshadow/software/disablarr/internal/tui"
)

// Server represents the SSH management server.
type Server struct {
	srv *ssh.Server
}

// New creates and configures the SSH server.
func New(db *db.DB, masterKey string, port int, dataPath string, triggerFn func(), logs *disablarrtui.LogBuffer) (*Server, error) {
	slog.Info("Initializing SSH server", "port", port)

	// Force TrueColor rendering globally since SSH sometimes drops terminal capabilities
	lipgloss.SetColorProfile(termenv.TrueColor)

	s, err := wish.NewServer(
		wish.WithAddress(fmt.Sprintf(":%d", port)),
		wish.WithHostKeyPath(fmt.Sprintf("%s/disablarr_ed25519", dataPath)),
		wish.WithPasswordAuth(func(ctx ssh.Context, password string) bool {
			return password == masterKey
		}),
		wish.WithMiddleware(
			func(h ssh.Handler) ssh.Handler {
				return func(s ssh.Session) {
					// Force truecolor and true terminal settings inside the SSH session
					// so that termenv and lipgloss pick it up, overriding client limitations.
					_, _ = s.SendRequest("env", true, []byte("\x09COLORTERM\x09truecolor"))
					_, _ = s.SendRequest("env", true, []byte("\x04TERM\x0bxterm-256color"))
					h(s)
				}
			},
			logging.Middleware(),
			activeterm.Middleware(),
			bubbletea.Middleware(func(s ssh.Session) (tea.Model, []tea.ProgramOption) {
				m := disablarrtui.NewModel(db, s, triggerFn, logs)
				return m, []tea.ProgramOption{tea.WithAltScreen()}
			}),
		),
	)

	if err != nil {
		return nil, err
	}

	// Route Wish's internal standard library log package to slog
	log.SetDefault(log.New(os.Stdout))

	return &Server{srv: s}, nil
}

// Start begins accepting connections.
func (s *Server) Start() error {
	slog.Info("Starting SSH Server", "address", s.srv.Addr)
	if err := s.srv.ListenAndServe(); err != nil && !errors.Is(err, ssh.ErrServerClosed) {
		return err
	}
	return nil
}

// Stop gracefully shuts down the server.
func (s *Server) Stop(ctx context.Context) error {
	slog.Info("Stopping SSH server")
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	return s.srv.Shutdown(ctx)
}
