ALTER TABLE web_sessions ADD COLUMN step_up_verified_at TEXT;

CREATE INDEX web_sessions_token_active_idx
    ON web_sessions(token_hash, expires_at, revoked_at);

UPDATE installation_metadata SET schema_version = 2 WHERE singleton = 1;

PRAGMA user_version = 2;
