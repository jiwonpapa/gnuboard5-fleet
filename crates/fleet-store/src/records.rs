use serde::{Deserialize, Serialize};

use crate::{FleetStore, StoreError, StoreResult};

type SessionRow = (String, String, Vec<u8>, String, Option<String>);

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UserCredential {
    pub user_id: String,
    pub login_name: String,
    pub password_hash: Vec<u8>,
    pub status: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SessionRecord {
    pub session_id: String,
    pub user_id: String,
    pub csrf_hash: Vec<u8>,
    pub expires_at_unix: i64,
    pub step_up_verified_at_unix: Option<i64>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct SiteRecord {
    pub site_id: String,
    pub owner_user_id: String,
    pub display_name: String,
    pub base_url: String,
    pub status: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EncryptedSecretRecord {
    pub algorithm: String,
    pub key_version: i64,
    pub nonce: Vec<u8>,
    pub ciphertext: Vec<u8>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct JobRecord {
    pub job_id: String,
    pub owner_user_id: String,
    pub site_id: Option<String>,
    pub kind: String,
    pub state: String,
    pub input: serde_json::Value,
    pub result: Option<serde_json::Value>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct NotificationOutboxRecord {
    pub outbox_id: String,
    pub event_id: String,
    pub owner_user_id: String,
    pub site_id: Option<String>,
    pub channel: String,
    pub payload: serde_json::Value,
    pub state: String,
    pub attempts: i64,
    pub available_at: String,
    pub delivered_at: Option<String>,
    pub last_error_code: Option<String>,
    pub created_at: String,
}

impl FleetStore {
    pub async fn create_initial_user(
        &self,
        user_id: &str,
        login_name: &str,
        password_hash: &[u8],
    ) -> StoreResult<()> {
        let _writer = self.inner.writer.lock().await;
        let mut transaction = self.inner.pool.begin().await?;
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM fleet_users")
            .fetch_one(&mut *transaction)
            .await?;
        if count != 0 {
            return Err(StoreError::Conflict(
                "initial administrator already exists".to_owned(),
            ));
        }
        sqlx::query(
            "INSERT INTO fleet_users (user_id, login_name, password_hash) VALUES (?, ?, ?)",
        )
        .bind(user_id)
        .bind(login_name)
        .bind(password_hash)
        .execute(&mut *transaction)
        .await?;
        sqlx::query("INSERT INTO user_security_settings (user_id) VALUES (?)")
            .bind(user_id)
            .execute(&mut *transaction)
            .await?;
        sqlx::query(
            "UPDATE installation_security SET state = 'complete', \
             setup_login_name = NULL, setup_token_hash = NULL, \
             setup_totp_nonce = NULL, setup_totp_ciphertext = NULL, \
             setup_expires_at = NULL, \
             completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') \
             WHERE singleton = 1 AND state = 'setup_required'",
        )
        .execute(&mut *transaction)
        .await?;
        transaction.commit().await?;
        Ok(())
    }

    pub async fn credential_by_login(
        &self,
        login_name: &str,
    ) -> StoreResult<Option<UserCredential>> {
        let row: Option<(String, String, Vec<u8>, String)> = sqlx::query_as(
            "SELECT user_id, login_name, password_hash, status \
             FROM fleet_users WHERE login_name = ?",
        )
        .bind(login_name)
        .fetch_optional(&self.inner.pool)
        .await?;
        Ok(row.map(
            |(user_id, login_name, password_hash, status)| UserCredential {
                user_id,
                login_name,
                password_hash,
                status,
            },
        ))
    }

    pub async fn credential_by_user(&self, user_id: &str) -> StoreResult<Option<UserCredential>> {
        let row: Option<(String, String, Vec<u8>, String)> = sqlx::query_as(
            "SELECT user_id, login_name, password_hash, status \
             FROM fleet_users WHERE user_id = ?",
        )
        .bind(user_id)
        .fetch_optional(&self.inner.pool)
        .await?;
        Ok(row.map(
            |(user_id, login_name, password_hash, status)| UserCredential {
                user_id,
                login_name,
                password_hash,
                status,
            },
        ))
    }

    pub async fn create_web_session(
        &self,
        session_id: &str,
        user_id: &str,
        token_hash: &[u8],
        csrf_hash: &[u8],
        expires_at_unix: i64,
    ) -> StoreResult<()> {
        let _writer = self.inner.writer.lock().await;
        sqlx::query(
            "INSERT INTO web_sessions \
             (session_id, user_id, token_hash, csrf_hash, expires_at) \
             VALUES (?, ?, ?, ?, ?)",
        )
        .bind(session_id)
        .bind(user_id)
        .bind(token_hash)
        .bind(csrf_hash)
        .bind(expires_at_unix.to_string())
        .execute(&self.inner.pool)
        .await?;
        Ok(())
    }

    pub async fn resolve_web_session(
        &self,
        token_hash: &[u8],
        now_unix: i64,
    ) -> StoreResult<Option<SessionRecord>> {
        let row: Option<SessionRow> = sqlx::query_as(
            "SELECT session_id, user_id, csrf_hash, expires_at, step_up_verified_at \
             FROM web_sessions \
             WHERE token_hash = ? AND revoked_at IS NULL AND CAST(expires_at AS INTEGER) > ?",
        )
        .bind(token_hash)
        .bind(now_unix)
        .fetch_optional(&self.inner.pool)
        .await?;
        row.map(
            |(session_id, user_id, csrf_hash, expires_at, step_up_verified_at)| {
                Ok(SessionRecord {
                    session_id,
                    user_id,
                    csrf_hash,
                    expires_at_unix: expires_at.parse().map_err(|_| {
                        StoreError::InvalidIdentity("invalid session expiry".to_owned())
                    })?,
                    step_up_verified_at_unix: step_up_verified_at
                        .map(|value| {
                            value.parse().map_err(|_| {
                                StoreError::InvalidIdentity("invalid step-up timestamp".to_owned())
                            })
                        })
                        .transpose()?,
                })
            },
        )
        .transpose()
    }

    pub async fn revoke_web_session(
        &self,
        session_id: &str,
        user_id: &str,
        now_unix: i64,
    ) -> StoreResult<()> {
        let _writer = self.inner.writer.lock().await;
        let result = sqlx::query(
            "UPDATE web_sessions SET revoked_at = ? \
             WHERE session_id = ? AND user_id = ? AND revoked_at IS NULL",
        )
        .bind(now_unix.to_string())
        .bind(session_id)
        .bind(user_id)
        .execute(&self.inner.pool)
        .await?;
        if result.rows_affected() != 1 {
            return Err(StoreError::NotFound);
        }
        Ok(())
    }

    pub async fn mark_step_up(
        &self,
        session_id: &str,
        user_id: &str,
        now_unix: i64,
    ) -> StoreResult<()> {
        let _writer = self.inner.writer.lock().await;
        let result = sqlx::query(
            "UPDATE web_sessions SET step_up_verified_at = ? \
             WHERE session_id = ? AND user_id = ? AND revoked_at IS NULL",
        )
        .bind(now_unix.to_string())
        .bind(session_id)
        .bind(user_id)
        .execute(&self.inner.pool)
        .await?;
        if result.rows_affected() != 1 {
            return Err(StoreError::NotFound);
        }
        Ok(())
    }

    pub async fn rotate_session_csrf(
        &self,
        session_id: &str,
        user_id: &str,
        csrf_hash: &[u8],
    ) -> StoreResult<()> {
        let _writer = self.inner.writer.lock().await;
        let result = sqlx::query(
            "UPDATE web_sessions SET csrf_hash = ? \
             WHERE session_id = ? AND user_id = ? AND revoked_at IS NULL",
        )
        .bind(csrf_hash)
        .bind(session_id)
        .bind(user_id)
        .execute(&self.inner.pool)
        .await?;
        if result.rows_affected() != 1 {
            return Err(StoreError::NotFound);
        }
        Ok(())
    }

    pub async fn list_owned_sites(&self, owner_user_id: &str) -> StoreResult<Vec<SiteRecord>> {
        let rows: Vec<(String, String, String, String, String)> = sqlx::query_as(
            "SELECT site_id, owner_user_id, display_name, base_url, status \
             FROM sites WHERE owner_user_id = ? ORDER BY display_name, site_id",
        )
        .bind(owner_user_id)
        .fetch_all(&self.inner.pool)
        .await?;
        Ok(rows
            .into_iter()
            .map(
                |(site_id, owner_user_id, display_name, base_url, status)| SiteRecord {
                    site_id,
                    owner_user_id,
                    display_name,
                    base_url,
                    status,
                },
            )
            .collect())
    }

    pub async fn owned_site(
        &self,
        owner_user_id: &str,
        site_id: &str,
    ) -> StoreResult<Option<SiteRecord>> {
        let row: Option<(String, String, String, String, String)> = sqlx::query_as(
            "SELECT site_id, owner_user_id, display_name, base_url, status \
             FROM sites WHERE owner_user_id = ? AND site_id = ?",
        )
        .bind(owner_user_id)
        .bind(site_id)
        .fetch_optional(&self.inner.pool)
        .await?;
        Ok(row.map(
            |(site_id, owner_user_id, display_name, base_url, status)| SiteRecord {
                site_id,
                owner_user_id,
                display_name,
                base_url,
                status,
            },
        ))
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn put_encrypted_secret(
        &self,
        secret_id: &str,
        owner_user_id: &str,
        site_id: &str,
        purpose: &str,
        algorithm: &str,
        key_version: i64,
        nonce: &[u8],
        ciphertext: &[u8],
    ) -> StoreResult<()> {
        if self.owned_site(owner_user_id, site_id).await?.is_none() {
            return Err(StoreError::AccessDenied);
        }
        let _writer = self.inner.writer.lock().await;
        sqlx::query(
            "INSERT INTO encrypted_secrets \
             (secret_id, owner_user_id, site_id, purpose, algorithm, key_version, nonce, ciphertext) \
             VALUES (?, ?, ?, ?, ?, ?, ?, ?) \
             ON CONFLICT(owner_user_id, site_id, purpose) DO UPDATE SET \
             algorithm=excluded.algorithm, key_version=excluded.key_version, \
             nonce=excluded.nonce, ciphertext=excluded.ciphertext, \
             rotated_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
        )
        .bind(secret_id)
        .bind(owner_user_id)
        .bind(site_id)
        .bind(purpose)
        .bind(algorithm)
        .bind(key_version)
        .bind(nonce)
        .bind(ciphertext)
        .execute(&self.inner.pool)
        .await?;
        Ok(())
    }

    pub async fn encrypted_secret(
        &self,
        owner_user_id: &str,
        site_id: &str,
        purpose: &str,
    ) -> StoreResult<Option<EncryptedSecretRecord>> {
        let row: Option<(String, i64, Vec<u8>, Vec<u8>)> = sqlx::query_as(
            "SELECT algorithm, key_version, nonce, ciphertext \
             FROM encrypted_secrets \
             WHERE owner_user_id = ? AND site_id = ? AND purpose = ?",
        )
        .bind(owner_user_id)
        .bind(site_id)
        .bind(purpose)
        .fetch_optional(&self.inner.pool)
        .await?;
        Ok(row.map(
            |(algorithm, key_version, nonce, ciphertext)| EncryptedSecretRecord {
                algorithm,
                key_version,
                nonce,
                ciphertext,
            },
        ))
    }

    pub async fn create_job(
        &self,
        job_id: &str,
        owner_user_id: &str,
        site_id: Option<&str>,
        kind: &str,
        input: &serde_json::Value,
    ) -> StoreResult<()> {
        if let Some(site_id) = site_id
            && self.owned_site(owner_user_id, site_id).await?.is_none()
        {
            return Err(StoreError::AccessDenied);
        }
        let _writer = self.inner.writer.lock().await;
        sqlx::query(
            "INSERT INTO jobs \
             (job_id, owner_user_id, site_id, kind, input_json) \
             VALUES (?, ?, ?, ?, ?)",
        )
        .bind(job_id)
        .bind(owner_user_id)
        .bind(site_id)
        .bind(kind)
        .bind(serde_json::to_string(input)?)
        .execute(&self.inner.pool)
        .await?;
        Ok(())
    }

    pub async fn owned_job(
        &self,
        owner_user_id: &str,
        job_id: &str,
    ) -> StoreResult<Option<JobRecord>> {
        type JobRow = (
            String,
            String,
            Option<String>,
            String,
            String,
            String,
            Option<String>,
            String,
            String,
        );
        let row: Option<JobRow> = sqlx::query_as(
            "SELECT job_id, owner_user_id, site_id, kind, state, input_json, \
             result_json, created_at, updated_at \
             FROM jobs WHERE owner_user_id = ? AND job_id = ?",
        )
        .bind(owner_user_id)
        .bind(job_id)
        .fetch_optional(&self.inner.pool)
        .await?;
        row.map(
            |(
                job_id,
                owner_user_id,
                site_id,
                kind,
                state,
                input_json,
                result_json,
                created_at,
                updated_at,
            )| {
                Ok(JobRecord {
                    job_id,
                    owner_user_id,
                    site_id,
                    kind,
                    state,
                    input: serde_json::from_str(&input_json)?,
                    result: result_json
                        .map(|value| serde_json::from_str(&value))
                        .transpose()?,
                    created_at,
                    updated_at,
                })
            },
        )
        .transpose()
    }

    pub async fn transition_job(
        &self,
        owner_user_id: &str,
        job_id: &str,
        from_states: &[&str],
        to_state: &str,
        result: Option<&serde_json::Value>,
    ) -> StoreResult<()> {
        let allowed_states = ["queued", "running", "succeeded", "failed", "cancelled"];
        if !allowed_states.contains(&to_state)
            || from_states.is_empty()
            || from_states
                .iter()
                .any(|state| !allowed_states.contains(state))
        {
            return Err(StoreError::Conflict(
                "invalid job state transition".to_owned(),
            ));
        }
        let placeholders = std::iter::repeat_n("?", from_states.len())
            .collect::<Vec<_>>()
            .join(",");
        let sql = format!(
            "UPDATE jobs SET state = ?, result_json = ?, \
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') \
             WHERE owner_user_id = ? AND job_id = ? AND state IN ({placeholders})"
        );
        let _writer = self.inner.writer.lock().await;
        let mut query = sqlx::query(&sql)
            .bind(to_state)
            .bind(result.map(serde_json::to_string).transpose()?)
            .bind(owner_user_id)
            .bind(job_id);
        for state in from_states {
            query = query.bind(state);
        }
        let changed = query.execute(&self.inner.pool).await?.rows_affected();
        if changed != 1 {
            return Err(StoreError::Conflict(
                "job state changed or job is not owned".to_owned(),
            ));
        }
        Ok(())
    }

    pub async fn enqueue_notification_deduplicated(
        &self,
        outbox_id: &str,
        event_id: &str,
        owner_user_id: &str,
        site_id: &str,
        channel: &str,
        payload: &serde_json::Value,
    ) -> StoreResult<(NotificationOutboxRecord, bool)> {
        if self.owned_site(owner_user_id, site_id).await?.is_none() {
            return Err(StoreError::AccessDenied);
        }
        if !matches!(channel, "telegram" | "web_push") {
            return Err(StoreError::Conflict(
                "invalid notification channel".to_owned(),
            ));
        }
        let _writer = self.inner.writer.lock().await;
        let mut transaction = self.inner.pool.begin().await?;
        let inserted = sqlx::query(
            "INSERT INTO notification_outbox \
             (outbox_id, event_id, owner_user_id, site_id, channel, payload_json) \
             VALUES (?, ?, ?, ?, ?, ?) \
             ON CONFLICT(event_id, channel) DO NOTHING",
        )
        .bind(outbox_id)
        .bind(event_id)
        .bind(owner_user_id)
        .bind(site_id)
        .bind(channel)
        .bind(serde_json::to_string(payload)?)
        .execute(&mut *transaction)
        .await?
        .rows_affected()
            == 1;
        let row = fetch_outbox_by_event(&mut transaction, event_id, channel)
            .await?
            .ok_or(StoreError::NotFound)?;
        if row.owner_user_id != owner_user_id || row.site_id.as_deref() != Some(site_id) {
            return Err(StoreError::AccessDenied);
        }
        transaction.commit().await?;
        Ok((row, inserted))
    }

    pub async fn owned_notification(
        &self,
        owner_user_id: &str,
        site_id: &str,
        outbox_id: &str,
    ) -> StoreResult<Option<NotificationOutboxRecord>> {
        let row = fetch_outbox(
            &self.inner.pool,
            "WHERE owner_user_id = ? AND site_id = ? AND outbox_id = ?",
            &[owner_user_id, site_id, outbox_id],
        )
        .await?;
        row.map(outbox_from_row).transpose()
    }

    pub async fn claim_due_notification(
        &self,
        lease_seconds: u64,
    ) -> StoreResult<Option<NotificationOutboxRecord>> {
        let lease_modifier = format!("+{} seconds", lease_seconds.clamp(1, 3600));
        let _writer = self.inner.writer.lock().await;
        let mut transaction = self.inner.pool.begin().await?;
        let outbox_id: Option<String> = sqlx::query_scalar(
            "SELECT outbox_id FROM notification_outbox \
             WHERE state IN ('pending', 'leased') \
               AND unixepoch(available_at) <= unixepoch('now') \
             ORDER BY available_at, created_at, outbox_id LIMIT 1",
        )
        .fetch_optional(&mut *transaction)
        .await?;
        let Some(outbox_id) = outbox_id else {
            transaction.commit().await?;
            return Ok(None);
        };
        let changed = sqlx::query(
            "UPDATE notification_outbox \
             SET state = 'leased', attempts = attempts + 1, \
                 available_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ?) \
             WHERE outbox_id = ? AND state IN ('pending', 'leased') \
               AND unixepoch(available_at) <= unixepoch('now')",
        )
        .bind(lease_modifier)
        .bind(&outbox_id)
        .execute(&mut *transaction)
        .await?
        .rows_affected();
        if changed != 1 {
            return Err(StoreError::Conflict(
                "notification lease changed".to_owned(),
            ));
        }
        let row = fetch_outbox(
            &mut *transaction,
            "WHERE outbox_id = ?",
            &[outbox_id.as_str()],
        )
        .await?
        .map(outbox_from_row)
        .transpose()?;
        transaction.commit().await?;
        Ok(row)
    }

    pub async fn deliver_notification(&self, outbox_id: &str) -> StoreResult<()> {
        self.transition_notification(outbox_id, "delivered", None, 0, 0)
            .await
    }

    pub async fn retry_notification(
        &self,
        outbox_id: &str,
        error_code: &str,
        retry_seconds: u64,
        max_attempts: i64,
    ) -> StoreResult<()> {
        self.transition_notification(
            outbox_id,
            "pending",
            Some(error_code),
            retry_seconds,
            max_attempts,
        )
        .await
    }

    pub async fn dead_letter_notification(
        &self,
        outbox_id: &str,
        error_code: &str,
    ) -> StoreResult<()> {
        self.transition_notification(outbox_id, "dead_letter", Some(error_code), 0, 0)
            .await
    }

    async fn transition_notification(
        &self,
        outbox_id: &str,
        requested_state: &str,
        error_code: Option<&str>,
        retry_seconds: u64,
        max_attempts: i64,
    ) -> StoreResult<()> {
        if !matches!(requested_state, "pending" | "delivered" | "dead_letter") {
            return Err(StoreError::Conflict(
                "invalid notification state transition".to_owned(),
            ));
        }
        let _writer = self.inner.writer.lock().await;
        let mut transaction = self.inner.pool.begin().await?;
        let attempts: Option<i64> = sqlx::query_scalar(
            "SELECT attempts FROM notification_outbox \
             WHERE outbox_id = ? AND state = 'leased'",
        )
        .bind(outbox_id)
        .fetch_optional(&mut *transaction)
        .await?;
        let attempts = attempts
            .ok_or_else(|| StoreError::Conflict("notification is not leased".to_owned()))?;
        let final_state =
            if requested_state == "pending" && max_attempts > 0 && attempts >= max_attempts {
                "dead_letter"
            } else {
                requested_state
            };
        let modifier = format!("+{} seconds", retry_seconds.min(86_400));
        let changed = sqlx::query(
            "UPDATE notification_outbox SET state = ?, last_error_code = ?, \
             available_at = CASE WHEN ? = 'pending' \
               THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ?) ELSE available_at END, \
             delivered_at = CASE WHEN ? = 'delivered' \
               THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now') ELSE NULL END \
             WHERE outbox_id = ? AND state = 'leased'",
        )
        .bind(final_state)
        .bind(error_code)
        .bind(final_state)
        .bind(modifier)
        .bind(final_state)
        .bind(outbox_id)
        .execute(&mut *transaction)
        .await?
        .rows_affected();
        if changed != 1 {
            return Err(StoreError::Conflict(
                "notification state changed".to_owned(),
            ));
        }
        transaction.commit().await?;
        Ok(())
    }
}

type OutboxRow = (
    String,
    String,
    String,
    Option<String>,
    String,
    String,
    String,
    i64,
    String,
    Option<String>,
    Option<String>,
    String,
);

async fn fetch_outbox_by_event(
    transaction: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    event_id: &str,
    channel: &str,
) -> StoreResult<Option<NotificationOutboxRecord>> {
    let row: Option<OutboxRow> = sqlx::query_as(
        "SELECT outbox_id, event_id, owner_user_id, site_id, channel, payload_json, \
         state, attempts, available_at, delivered_at, last_error_code, created_at \
         FROM notification_outbox WHERE event_id = ? AND channel = ?",
    )
    .bind(event_id)
    .bind(channel)
    .fetch_optional(&mut **transaction)
    .await?;
    row.map(outbox_from_row).transpose()
}

async fn fetch_outbox<'e, E>(
    executor: E,
    clause: &str,
    values: &[&str],
) -> StoreResult<Option<OutboxRow>>
where
    E: sqlx::Executor<'e, Database = sqlx::Sqlite>,
{
    let sql = format!(
        "SELECT outbox_id, event_id, owner_user_id, site_id, channel, payload_json, \
         state, attempts, available_at, delivered_at, last_error_code, created_at \
         FROM notification_outbox {clause}"
    );
    let mut query = sqlx::query_as(&sql);
    for value in values {
        query = query.bind(*value);
    }
    Ok(query.fetch_optional(executor).await?)
}

fn outbox_from_row(row: OutboxRow) -> StoreResult<NotificationOutboxRecord> {
    let (
        outbox_id,
        event_id,
        owner_user_id,
        site_id,
        channel,
        payload_json,
        state,
        attempts,
        available_at,
        delivered_at,
        last_error_code,
        created_at,
    ) = row;
    Ok(NotificationOutboxRecord {
        outbox_id,
        event_id,
        owner_user_id,
        site_id,
        channel,
        payload: serde_json::from_str(&payload_json)?,
        state,
        attempts,
        available_at,
        delivered_at,
        last_error_code,
        created_at,
    })
}
