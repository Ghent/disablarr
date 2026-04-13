package crypto

import (
	"bytes"
	"testing"
)

func TestDeriveKeys(t *testing.T) {
	password := "test-password-123"

	dbKey1, authKey1 := DeriveKeys(password)
	dbKey2, authKey2 := DeriveKeys(password)

	// Verify deterministic output
	if !bytes.Equal(dbKey1, dbKey2) {
		t.Error("dbKey is not deterministic")
	}
	if !bytes.Equal(authKey1, authKey2) {
		t.Error("authKey is not deterministic")
	}

	// Verify keys are different (different salts)
	if bytes.Equal(dbKey1, authKey1) {
		t.Error("dbKey and authKey should be different")
	}

	// Verify different passwords yield different keys
	dbKeyOther, authKeyOther := DeriveKeys("different-password")
	if bytes.Equal(dbKey1, dbKeyOther) {
		t.Error("different passwords yielded same dbKey")
	}
	if bytes.Equal(authKey1, authKeyOther) {
		t.Error("different passwords yielded same authKey")
	}

	// Verify key lengths (Argon2 default in our implementation is 32 bytes)
	if len(dbKey1) != 32 {
		t.Errorf("expected dbKey length 32, got %d", len(dbKey1))
	}
	if len(authKey1) != 32 {
		t.Errorf("expected authKey length 32, got %d", len(authKey1))
	}
}
