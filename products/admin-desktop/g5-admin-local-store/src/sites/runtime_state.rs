use super::*;
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct StoredSessionWire {
    mb_id: String,
    access_token: String,
    refresh_token: String,
    expires_in: u64,
}

impl StoredSessionWire {
    fn from_record(session: &StoredSession) -> Self {
        Self {
            mb_id: session.mb_id.clone(),
            access_token: session.access_token.clone(),
            refresh_token: session.refresh_token.clone(),
            expires_in: session.expires_in,
        }
    }

    fn into_record(self) -> StoredSession {
        StoredSession {
            mb_id: self.mb_id,
            access_token: self.access_token,
            refresh_token: self.refresh_token,
            expires_in: self.expires_in,
        }
    }
}

impl SiteRepository {
    pub fn site_has_session_hint(&self, site_id: &str) -> Result<bool, AppError> {
        let connection = open_connection(&self.config)?;
        connection
            .query_row(
                "SELECT has_session FROM site_runtime_state WHERE site_id = ?1",
                params![site_id],
                |row| row.get::<_, i64>(0),
            )
            .optional()
            .map(|value| value.unwrap_or(0) == 1)
            .map_err(storage_error("site_runtime_state.get_session_hint"))
    }

    pub fn set_site_session_hint(&self, site_id: &str, has_session: bool) -> Result<(), AppError> {
        let connection = open_connection(&self.config)?;
        if has_session {
            connection
                .execute(
                    "INSERT INTO site_runtime_state (site_id, has_session, updated_at)
                     VALUES (?1, 1, datetime('now'))
                     ON CONFLICT(site_id) DO UPDATE
                     SET has_session = 1,
                         updated_at = datetime('now')",
                    params![site_id],
                )
                .map_err(storage_error("site_runtime_state.set_session_hint"))?;
        } else {
            connection
                .execute(
                    "DELETE FROM site_runtime_state WHERE site_id = ?1",
                    params![site_id],
                )
                .map_err(storage_error("site_runtime_state.clear_session_hint"))?;
        }
        Ok(())
    }

    pub fn load_site_session(&self, site_id: &str) -> Result<Option<StoredSession>, AppError> {
        let connection = open_connection(&self.config)?;
        let payload = connection
            .query_row(
                "SELECT session_payload FROM site_sessions WHERE site_id = ?1",
                params![site_id],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(storage_error("site_sessions.load"))?;

        payload
            .map(|raw| {
                serde_json::from_str::<StoredSessionWire>(&raw)
                    .map(StoredSessionWire::into_record)
                    .map_err(|error| AppError::Storage {
                        target: "site_sessions.deserialize".to_string(),
                        error: error.to_string(),
                    })
            })
            .transpose()
    }

    pub fn save_site_session(
        &self,
        site_id: &str,
        session: &StoredSession,
    ) -> Result<(), AppError> {
        let payload =
            serde_json::to_string(&StoredSessionWire::from_record(session)).map_err(|error| {
                AppError::Storage {
                    target: "site_sessions.serialize".to_string(),
                    error: error.to_string(),
                }
            })?;
        let connection = open_connection(&self.config)?;
        connection
            .execute(
                "INSERT INTO site_sessions (site_id, session_payload, updated_at)
                 VALUES (?1, ?2, datetime('now'))
                 ON CONFLICT(site_id) DO UPDATE
                 SET session_payload = excluded.session_payload,
                     updated_at = datetime('now')",
                params![site_id, payload],
            )
            .map_err(storage_error("site_sessions.save"))?;
        Ok(())
    }

    pub fn clear_site_session(&self, site_id: &str) -> Result<(), AppError> {
        let connection = open_connection(&self.config)?;
        connection
            .execute(
                "DELETE FROM site_sessions WHERE site_id = ?1",
                params![site_id],
            )
            .map_err(storage_error("site_sessions.clear"))?;
        Ok(())
    }
}
