package logger

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"sync"
)

// LogBuffer is a thread-safe, fixed-capacity ring buffer for log entries.
type LogBuffer struct {
	mu      sync.Mutex
	entries []string
	max     int
}

// NewLogBuffer creates a LogBuffer that retains at most max entries.
func NewLogBuffer(max int) *LogBuffer {
	return &LogBuffer{
		max:     max,
		entries: make([]string, 0, max),
	}
}

// Add appends an entry, evicting the oldest when at capacity.
func (lb *LogBuffer) Add(entry string) {
	lb.mu.Lock()
	defer lb.mu.Unlock()
	lb.entries = append(lb.entries, entry)
	if len(lb.entries) > lb.max {
		lb.entries = lb.entries[1:]
	}
}

// Entries returns a snapshot of all current entries (oldest first).
func (lb *LogBuffer) Entries() []string {
	lb.mu.Lock()
	defer lb.mu.Unlock()
	out := make([]string, len(lb.entries))
	copy(out, lb.entries)
	return out
}

// RingHandler is a slog.Handler that forwards to a wrapped handler (e.g.
// slog.NewJSONHandler for stdout) while also writing human-readable lines
// to a LogBuffer for TUI display.
type RingHandler struct {
	buf     *LogBuffer
	wrapped slog.Handler
}

// NewRingHandler creates a handler that writes structured JSON to w (stdout)
// and a short human-readable line to buf.
func NewRingHandler(buf *LogBuffer) *RingHandler {
	return &RingHandler{
		buf:     buf,
		wrapped: slog.NewJSONHandler(os.Stdout, nil),
	}
}

func (h *RingHandler) Enabled(ctx context.Context, level slog.Level) bool {
	return h.wrapped.Enabled(ctx, level)
}

func (h *RingHandler) Handle(ctx context.Context, r slog.Record) error {
	// Build a terse, human-readable line for the TUI log view.
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("[%s] %s", r.Level.String(), r.Message))
	r.Attrs(func(a slog.Attr) bool {
		sb.WriteString(fmt.Sprintf("  %s=%v", a.Key, a.Value.Any()))
		return true
	})
	h.buf.Add(sb.String())
	return h.wrapped.Handle(ctx, r)
}

func (h *RingHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &RingHandler{buf: h.buf, wrapped: h.wrapped.WithAttrs(attrs)}
}

func (h *RingHandler) WithGroup(name string) slog.Handler {
	return &RingHandler{buf: h.buf, wrapped: h.wrapped.WithGroup(name)}
}
