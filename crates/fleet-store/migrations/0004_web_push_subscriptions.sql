CREATE TABLE web_push_subscriptions (
    subscription_id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL REFERENCES fleet_users(user_id) ON DELETE CASCADE,
    site_id TEXT NOT NULL REFERENCES sites(site_id) ON DELETE CASCADE,
    endpoint_hash BLOB NOT NULL CHECK (length(endpoint_hash) = 32),
    algorithm TEXT NOT NULL,
    key_version INTEGER NOT NULL CHECK (key_version > 0),
    nonce BLOB NOT NULL CHECK (length(nonce) = 12),
    ciphertext BLOB NOT NULL CHECK (length(ciphertext) >= 16),
    state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'revoked')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    revoked_at TEXT,
    UNIQUE (owner_user_id, site_id, endpoint_hash),
    CHECK (
        (state = 'active' AND revoked_at IS NULL)
        OR (state = 'revoked' AND revoked_at IS NOT NULL)
    )
) STRICT;

CREATE INDEX web_push_subscriptions_owner_site_state_idx
    ON web_push_subscriptions(owner_user_id, site_id, state, updated_at);

UPDATE installation_metadata SET schema_version = 4 WHERE singleton = 1;

PRAGMA user_version = 4;
