CREATE TABLE installation_metadata (
    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
    installation_id TEXT NOT NULL CHECK (length(installation_id) BETWEEN 8 AND 128),
    schema_version INTEGER NOT NULL CHECK (schema_version >= 1),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE fleet_users (
    user_id TEXT PRIMARY KEY CHECK (length(user_id) BETWEEN 1 AND 128),
    login_name TEXT NOT NULL UNIQUE CHECK (length(login_name) BETWEEN 1 AND 128),
    password_hash BLOB NOT NULL CHECK (length(password_hash) >= 16),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE web_sessions (
    session_id TEXT PRIMARY KEY CHECK (length(session_id) BETWEEN 16 AND 256),
    user_id TEXT NOT NULL REFERENCES fleet_users(user_id) ON DELETE CASCADE,
    token_hash BLOB NOT NULL UNIQUE CHECK (length(token_hash) >= 32),
    csrf_hash BLOB NOT NULL CHECK (length(csrf_hash) >= 32),
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX web_sessions_user_expires_idx
    ON web_sessions(user_id, expires_at);

CREATE TABLE sites (
    site_id TEXT PRIMARY KEY CHECK (length(site_id) BETWEEN 1 AND 128),
    owner_user_id TEXT NOT NULL REFERENCES fleet_users(user_id) ON DELETE RESTRICT,
    display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 200),
    base_url TEXT NOT NULL CHECK (length(base_url) BETWEEN 8 AND 2048),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'disabled')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(owner_user_id, base_url)
) STRICT;

CREATE TABLE encrypted_secrets (
    secret_id TEXT PRIMARY KEY CHECK (length(secret_id) BETWEEN 1 AND 128),
    owner_user_id TEXT NOT NULL REFERENCES fleet_users(user_id) ON DELETE CASCADE,
    site_id TEXT NOT NULL REFERENCES sites(site_id) ON DELETE CASCADE,
    purpose TEXT NOT NULL CHECK (purpose IN ('g5_api', 'ssh', 'sftp', 'notification')),
    algorithm TEXT NOT NULL,
    key_version INTEGER NOT NULL CHECK (key_version >= 1),
    nonce BLOB NOT NULL CHECK (length(nonce) >= 12),
    ciphertext BLOB NOT NULL CHECK (length(ciphertext) >= 16),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    rotated_at TEXT,
    UNIQUE(owner_user_id, site_id, purpose)
) STRICT;

CREATE TABLE notification_outbox (
    outbox_id TEXT PRIMARY KEY CHECK (length(outbox_id) BETWEEN 1 AND 128),
    event_id TEXT NOT NULL,
    owner_user_id TEXT NOT NULL REFERENCES fleet_users(user_id) ON DELETE CASCADE,
    site_id TEXT REFERENCES sites(site_id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('telegram', 'web_push')),
    payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
    state TEXT NOT NULL DEFAULT 'pending'
        CHECK (state IN ('pending', 'leased', 'delivered', 'dead_letter')),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    available_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    delivered_at TEXT,
    last_error_code TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(event_id, channel)
) STRICT;

CREATE INDEX notification_outbox_state_available_idx
    ON notification_outbox(state, available_at);

CREATE TABLE jobs (
    job_id TEXT PRIMARY KEY CHECK (length(job_id) BETWEEN 1 AND 128),
    owner_user_id TEXT NOT NULL REFERENCES fleet_users(user_id) ON DELETE CASCADE,
    site_id TEXT REFERENCES sites(site_id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (length(kind) BETWEEN 1 AND 100),
    state TEXT NOT NULL DEFAULT 'queued'
        CHECK (state IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
    input_json TEXT NOT NULL CHECK (json_valid(input_json)),
    result_json TEXT CHECK (result_json IS NULL OR json_valid(result_json)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX jobs_owner_site_state_idx
    ON jobs(owner_user_id, site_id, state);

CREATE TABLE audit_log (
    audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT,
    principal_id TEXT,
    site_id TEXT,
    action TEXT NOT NULL CHECK (length(action) BETWEEN 1 AND 200),
    outcome TEXT NOT NULL CHECK (outcome IN ('success', 'denied', 'failed')),
    details_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(details_json)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX audit_log_principal_site_created_idx
    ON audit_log(principal_id, site_id, created_at);

PRAGMA application_id = 1194673740;
PRAGMA user_version = 1;
