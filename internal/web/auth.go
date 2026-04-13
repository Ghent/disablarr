package web

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"gitlab.com/starshadow/software/disablarr/internal/crypto"
)

// jwtHeader is the fixed header for our HS256 tokens.
var jwtHeader = base64URLEncode([]byte(`{"alg":"HS256","typ":"JWT"}`))

// jwtClaims represents our token payload.
type jwtClaims struct {
	Sub string `json:"sub"`
	Exp int64  `json:"exp"`
	Iat int64  `json:"iat"`
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type loginResponse struct {
	Token     string `json:"token"`
	ExpiresAt int64  `json:"expiresAt"`
}

type authCheckResponse struct {
	Username string `json:"username"`
}

// handleLogin validates credentials and issues a JWT.
func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	_, attemptAuthKey := crypto.DeriveKeys(req.Password)
	if subtle.ConstantTimeCompare(s.authKey, attemptAuthKey) != 1 {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
		return
	}

	exp := time.Now().Add(24 * time.Hour)
	token, err := s.signJWT(jwtClaims{
		Sub: "admin",
		Exp: exp.Unix(),
		Iat: time.Now().Unix(),
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create token"})
		return
	}

	writeJSON(w, http.StatusOK, loginResponse{
		Token:     token,
		ExpiresAt: exp.Unix(),
	})
}

// handleAuthCheck validates the current JWT and returns user info.
func (s *Server) handleAuthCheck(w http.ResponseWriter, r *http.Request) {
	// The auth middleware already validated the token; extract claims from context.
	claims, ok := r.Context().Value(ctxClaimsKey).(jwtClaims)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "not authenticated"})
		return
	}

	writeJSON(w, http.StatusOK, authCheckResponse{Username: claims.Sub})
}

// signJWT creates an HS256 JWT from claims.
func (s *Server) signJWT(claims jwtClaims) (string, error) {
	payload, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}

	encodedPayload := base64URLEncode(payload)
	signingInput := jwtHeader + "." + encodedPayload

	mac := hmac.New(sha256.New, s.authKey)
	mac.Write([]byte(signingInput))
	signature := base64URLEncode(mac.Sum(nil))

	return signingInput + "." + signature, nil
}

// verifyJWT parses and verifies an HS256 JWT, returning its claims.
func (s *Server) verifyJWT(tokenStr string) (jwtClaims, error) {
	parts := strings.SplitN(tokenStr, ".", 3)
	if len(parts) != 3 {
		return jwtClaims{}, fmt.Errorf("invalid token format")
	}

	signingInput := parts[0] + "." + parts[1]
	mac := hmac.New(sha256.New, s.authKey)
	mac.Write([]byte(signingInput))
	expectedSig := base64URLEncode(mac.Sum(nil))

	if !hmac.Equal([]byte(parts[2]), []byte(expectedSig)) {
		return jwtClaims{}, fmt.Errorf("invalid signature")
	}

	payload, err := base64URLDecode(parts[1])
	if err != nil {
		return jwtClaims{}, fmt.Errorf("invalid payload encoding: %w", err)
	}

	var claims jwtClaims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return jwtClaims{}, fmt.Errorf("invalid claims: %w", err)
	}

	if time.Now().Unix() > claims.Exp {
		return jwtClaims{}, fmt.Errorf("token expired")
	}

	return claims, nil
}

// base64URLEncode encodes bytes to unpadded base64url.
func base64URLEncode(data []byte) string {
	return base64.RawURLEncoding.EncodeToString(data)
}

// base64URLDecode decodes unpadded base64url.
func base64URLDecode(s string) ([]byte, error) {
	return base64.RawURLEncoding.DecodeString(s)
}
