package crypto

import (
	"golang.org/x/crypto/argon2"
)

// DeriveKeys uses Argon2id to derive two mathematically separate 32-byte keys from a single master password.
func DeriveKeys(password string) (dbKey []byte, authKey []byte) {
	pwBytes := []byte(password)

	// Argon2id parameters: 
	// time=1 iteration, memory=64MB, threads=4, key length=32 bytes
	time := uint32(1)
	memory := uint32(64 * 1024)
	threads := uint8(4)
	keyLen := uint32(32)

	// Hardcoded application-level salts to isolate the keys
	dbSalt := []byte("Disablarr_DB_Encryption_Salt_v1")
	authSalt := []byte("Disablarr_Auth_Validation_Salt_v1")

	dbKey = argon2.IDKey(pwBytes, dbSalt, time, memory, threads, keyLen)
	authKey = argon2.IDKey(pwBytes, authSalt, time, memory, threads, keyLen)

	return dbKey, authKey
}
