CREATE TABLE installation_security (
    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
    state TEXT NOT NULL CHECK (state IN ('setup_required', 'complete')),
    setup_login_name TEXT,
    setup_token_hash BLOB CHECK (setup_token_hash IS NULL OR length(setup_token_hash) = 32),
    setup_totp_nonce BLOB CHECK (setup_totp_nonce IS NULL OR length(setup_totp_nonce) = 12),
    setup_totp_ciphertext BLOB
        CHECK (setup_totp_ciphertext IS NULL OR length(setup_totp_ciphertext) >= 16),
    setup_expires_at INTEGER,
    completed_at TEXT,
    CHECK (
        (state = 'setup_required' AND completed_at IS NULL)
        OR (state = 'complete' AND completed_at IS NOT NULL)
    )
) STRICT;

INSERT INTO installation_security (singleton, state, completed_at)
SELECT
    1,
    CASE WHEN EXISTS (SELECT 1 FROM fleet_users) THEN 'complete' ELSE 'setup_required' END,
    CASE
        WHEN EXISTS (SELECT 1 FROM fleet_users)
        THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        ELSE NULL
    END;

CREATE TABLE user_security_settings (
    user_id TEXT PRIMARY KEY REFERENCES fleet_users(user_id) ON DELETE CASCADE,
    totp_enabled INTEGER NOT NULL DEFAULT 0 CHECK (totp_enabled IN (0, 1)),
    totp_nonce BLOB CHECK (totp_nonce IS NULL OR length(totp_nonce) = 12),
    totp_ciphertext BLOB CHECK (totp_ciphertext IS NULL OR length(totp_ciphertext) >= 16),
    pending_totp_nonce BLOB CHECK (pending_totp_nonce IS NULL OR length(pending_totp_nonce) = 12),
    pending_totp_ciphertext BLOB
        CHECK (pending_totp_ciphertext IS NULL OR length(pending_totp_ciphertext) >= 16),
    session_idle_timeout_minutes INTEGER NOT NULL DEFAULT 30
        CHECK (session_idle_timeout_minutes BETWEEN 5 AND 1440),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CHECK (
        (totp_enabled = 0)
        OR (totp_nonce IS NOT NULL AND totp_ciphertext IS NOT NULL)
    )
) STRICT;

INSERT INTO user_security_settings (user_id)
SELECT user_id FROM fleet_users;

CREATE TABLE recovery_codes (
    recovery_code_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES fleet_users(user_id) ON DELETE CASCADE,
    code_hash BLOB NOT NULL UNIQUE CHECK (length(code_hash) = 32),
    consumed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX recovery_codes_user_available_idx
    ON recovery_codes(user_id, consumed_at);

CREATE TABLE login_rate_limits (
    scope_hash BLOB PRIMARY KEY CHECK (length(scope_hash) = 32),
    failed_attempts INTEGER NOT NULL CHECK (failed_attempts >= 0),
    first_failed_at INTEGER NOT NULL,
    locked_until INTEGER,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TRIGGER audit_log_append_only_update
BEFORE UPDATE ON audit_log
BEGIN
    SELECT RAISE(ABORT, 'audit_log is append-only');
END;

CREATE TRIGGER audit_log_append_only_delete
BEFORE DELETE ON audit_log
BEGIN
    SELECT RAISE(ABORT, 'audit_log is append-only');
END;

UPDATE installation_metadata SET schema_version = 3 WHERE singleton = 1;

PRAGMA user_version = 3;
