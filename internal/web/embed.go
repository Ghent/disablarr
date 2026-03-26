package web

import "embed"

// frontendFS embeds the built React SPA.
// The web/dist directory must exist at build time.
// In dev mode, an empty embed is used and the server shows a fallback page.
//
//go:embed all:dist
var frontendFS embed.FS
