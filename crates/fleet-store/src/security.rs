use serde::{Deserialize, Serialize};

use crate::{FleetStore, StoreError, StoreResult};

const LOGIN_WINDOW_SECONDS: i64 = 15 * 60;
const LOGIN_LOCK_SECONDS: i64 = 15 * 60;
const LOGIN_FAILURE_LIMIT: i64 = 5;
type AuditRow = (
    i64,
    Option<String>,
    Option<String>,
    Option<String>,
    String,
    String,
    String,
    String,
);

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct InstallationSecurityState {
    pub state: String,
    pub setup_login_name: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PendingInstallChallenge {
    pub login_name: String,
    pub totp_nonce: Vec<u8>,
    pub totp_ciphertext: Vec<u8>,
    pub expires_at_unix: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct UserSecuritySettings {
    pub user_id: String,
    pub totp_enabled: bool,
    pub session_idle_timeout_minutes: i64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EncryptedTotpSecret {
    pub nonce: Vec<u8>,
    pub ciphertext: Vec<u8>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct AuditEntry {
    pub audit_id: i64,
    pub request_id: Option<String>,
    pub principal_id: Option<String>,
    pub site_id: Option<String>,
    pub action: String,
    pub outcome: String,
    pub details: serde_json::Value,
    pub created_at: String,
}

impl FleetStore {
    #[allow(clippy::too_many_arguments)]
    pub async fn create_user_with_totp(
        &self,
        actor_user_id: &str,
        user_id: &str,
        login_name: &str,
        password_hash: &[u8],
        totp_nonce: &[u8],
        totp_ciphertext: &[u8],
        recovery_codes: &[(String, Vec<u8>)],
    ) -> StoreResult<()> {
        let _writer = self.inner.writer.lock().await;
        let mut transaction = self.inner.pool.begin().await?;
        sqlx::query(
            "INSERT INTO fleet_users (user_id, login_name, password_hash) VALUES (?, ?, ?)",
        )
        .bind(user_id)
        .bind(login_name)
        .bind(password_hash)
        .execute(&mut *transaction)
        .await?;
        sqlx::query(
            "INSERT INTO user_security_settings \
             (user_id, totp_enabled, totp_nonce, totp_ciphertext) VALUES (?, 1, ?, ?)",
        )
        .bind(user_id)
        .bind(totp_nonce)
        .bind(totp_ciphertext)
        .execute(&mut *transaction)
        .await?;
        for (code_id, code_hash) in recovery_codes {
            sqlx::query(
                "INSERT INTO recovery_codes (recovery_code_id, user_id, code_hash) \
                 VALUES (?, ?, ?)",
            )
            .bind(code_id)
            .bind(user_id)
            .bind(code_hash)
            .execute(&mut *transaction)
            .await?;
        }
        sqlx::query(
            "INSERT INTO audit_log \
             (principal_id, action, outcome, details_json) \
             VALUES (?, 'users.create', 'success', ?)",
        )
        .bind(actor_user_id)
        .bind(serde_json::json!({"target_user_id": user_id, "totp_forced": true}).to_string())
        .execute(&mut *transaction)
        .await?;
        transaction.commit().await?;
        Ok(())
    }

    pub async fn installation_security_state(&self) -> StoreResult<InstallationSecurityState> {
        let (state, setup_login_name): (String, Option<String>) = sqlx::query_as(
            "SELECT state, setup_login_name FROM installation_security WHERE singleton = 1",
        )
        .fetch_one(&self.inner.pool)
        .await?;
        Ok(InstallationSecurityState {
            state,
            setup_login_name,
        })
    }

    pub async fn put_install_challenge(
        &self,
        login_name: &str,
        token_hash: &[u8],
        totp_nonce: &[u8],
        totp_ciphertext: &[u8],
        expires_at_unix: i64,
    ) -> StoreResult<()> {
        let _writer = self.inner.writer.lock().await;
        let result = sqlx::query(
            "UPDATE installation_security SET \
             setup_login_name = ?, setup_token_hash = ?, setup_totp_nonce = ?, \
             setup_totp_ciphertext = ?, setup_expires_at = ? \
             WHERE singleton = 1 AND state = 'setup_required'",
        )
        .bind(login_name)
        .bind(token_hash)
        .bind(totp_nonce)
        .bind(totp_ciphertext)
        .bind(expires_at_unix)
        .execute(&self.inner.pool)
        .await?;
        if result.rows_affected() != 1 {
            return Err(StoreError::Conflict(
                "Fleet installation is already complete".to_owned(),
            ));
        }
        Ok(())
    }

    pub async fn pending_install_challenge(
        &self,
        token_hash: &[u8],
        now_unix: i64,
    ) -> StoreResult<Option<PendingInstallChallenge>> {
        let row: Option<(String, Vec<u8>, Vec<u8>, i64)> = sqlx::query_as(
            "SELECT setup_login_name, setup_totp_nonce, setup_totp_ciphertext, \
             setup_expires_at FROM installation_security \
             WHERE singleton = 1 AND state = 'setup_required' \
             AND setup_token_hash = ? AND setup_expires_at > ?",
        )
        .bind(token_hash)
        .bind(now_unix)
        .fetch_optional(&self.inner.pool)
        .await?;
        Ok(row.map(
            |(login_name, totp_nonce, totp_ciphertext, expires_at_unix)| PendingInstallChallenge {
                login_name,
                totp_nonce,
                totp_ciphertext,
                expires_at_unix,
            },
        ))
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn complete_initial_install(
        &self,
        setup_token_hash: &[u8],
        now_unix: i64,
        user_id: &str,
        login_name: &str,
        password_hash: &[u8],
        totp_nonce: &[u8],
        totp_ciphertext: &[u8],
        recovery_codes: &[(String, Vec<u8>)],
    ) -> StoreResult<()> {
        let _writer = self.inner.writer.lock().await;
        let mut transaction = self.inner.pool.begin().await?;
        let pending: Option<(String,)> = sqlx::query_as(
            "SELECT setup_login_name FROM installation_security \
             WHERE singleton = 1 AND state = 'setup_required' \
             AND setup_token_hash = ? AND setup_expires_at > ?",
        )
        .bind(setup_token_hash)
        .bind(now_unix)
        .fetch_optional(&mut *transaction)
        .await?;
        if pending.as_ref().map(|row| row.0.as_str()) != Some(login_name) {
            return Err(StoreError::Conflict(
                "installation challenge is invalid or expired".to_owned(),
            ));
        }
        let user_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM fleet_users")
            .fetch_one(&mut *transaction)
            .await?;
        if user_count != 0 {
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
        sqlx::query(
            "INSERT INTO user_security_settings \
             (user_id, totp_enabled, totp_nonce, totp_ciphertext) VALUES (?, 1, ?, ?)",
        )
        .bind(user_id)
        .bind(totp_nonce)
        .bind(totp_ciphertext)
        .execute(&mut *transaction)
        .await?;
        for (code_id, code_hash) in recovery_codes {
            sqlx::query(
                "INSERT INTO recovery_codes (recovery_code_id, user_id, code_hash) \
                 VALUES (?, ?, ?)",
            )
            .bind(code_id)
            .bind(user_id)
            .bind(code_hash)
            .execute(&mut *transaction)
            .await?;
        }
        sqlx::query(
            "UPDATE installation_security SET state = 'complete', \
             setup_login_name = NULL, setup_token_hash = NULL, \
             setup_totp_nonce = NULL, setup_totp_ciphertext = NULL, \
             setup_expires_at = NULL, \
             completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') \
             WHERE singleton = 1",
        )
        .execute(&mut *transaction)
        .await?;
        sqlx::query(
            "INSERT INTO audit_log \
             (principal_id, action, outcome, details_json) \
             VALUES (?, 'install.complete', 'success', '{\"totp_forced\":true}')",
        )
        .bind(user_id)
        .execute(&mut *transaction)
        .await?;
        transaction.commit().await?;
        Ok(())
    }

    pub async fn user_security_settings(&self, user_id: &str) -> StoreResult<UserSecuritySettings> {
        let row: Option<(String, i64, i64)> = sqlx::query_as(
            "SELECT user_id, totp_enabled, session_idle_timeout_minutes \
             FROM user_security_settings WHERE user_id = ?",
        )
        .bind(user_id)
        .fetch_optional(&self.inner.pool)
        .await?;
        let Some((user_id, totp_enabled, session_idle_timeout_minutes)) = row else {
            return Err(StoreError::NotFound);
        };
        Ok(UserSecuritySettings {
            user_id,
            totp_enabled: totp_enabled == 1,
            session_idle_timeout_minutes,
        })
    }

    pub async fn encrypted_totp_secret(
        &self,
        user_id: &str,
    ) -> StoreResult<Option<EncryptedTotpSecret>> {
        let row: Option<(Vec<u8>, Vec<u8>)> = sqlx::query_as(
            "SELECT totp_nonce, totp_ciphertext FROM user_security_settings \
             WHERE user_id = ? AND totp_enabled = 1",
        )
        .bind(user_id)
        .fetch_optional(&self.inner.pool)
        .await?;
        Ok(row.map(|(nonce, ciphertext)| EncryptedTotpSecret { nonce, ciphertext }))
    }

    pub async fn put_pending_totp(
        &self,
        user_id: &str,
        nonce: &[u8],
        ciphertext: &[u8],
    ) -> StoreResult<()> {
        let _writer = self.inner.writer.lock().await;
        let result = sqlx::query(
            "UPDATE user_security_settings SET pending_totp_nonce = ?, \
             pending_totp_ciphertext = ?, \
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE user_id = ?",
        )
        .bind(nonce)
        .bind(ciphertext)
        .bind(user_id)
        .execute(&self.inner.pool)
        .await?;
        if result.rows_affected() != 1 {
            return Err(StoreError::NotFound);
        }
        Ok(())
    }

    pub async fn pending_totp_secret(
        &self,
        user_id: &str,
    ) -> StoreResult<Option<EncryptedTotpSecret>> {
        let row: Option<(Vec<u8>, Vec<u8>)> = sqlx::query_as(
            "SELECT pending_totp_nonce, pending_totp_ciphertext \
             FROM user_security_settings \
             WHERE user_id = ? AND pending_totp_nonce IS NOT NULL \
             AND pending_totp_ciphertext IS NOT NULL",
        )
        .bind(user_id)
        .fetch_optional(&self.inner.pool)
        .await?;
        Ok(row.map(|(nonce, ciphertext)| EncryptedTotpSecret { nonce, ciphertext }))
    }

    pub async fn enable_totp(
        &self,
        user_id: &str,
        nonce: &[u8],
        ciphertext: &[u8],
        recovery_codes: &[(String, Vec<u8>)],
    ) -> StoreResult<()> {
        let _writer = self.inner.writer.lock().await;
        let mut transaction = self.inner.pool.begin().await?;
        let result = sqlx::query(
            "UPDATE user_security_settings SET totp_enabled = 1, \
             totp_nonce = ?, totp_ciphertext = ?, \
             pending_totp_nonce = NULL, pending_totp_ciphertext = NULL, \
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE user_id = ?",
        )
        .bind(nonce)
        .bind(ciphertext)
        .bind(user_id)
        .execute(&mut *transaction)
        .await?;
        if result.rows_affected() != 1 {
            return Err(StoreError::NotFound);
        }
        replace_recovery_codes(&mut transaction, user_id, recovery_codes).await?;
        transaction.commit().await?;
        Ok(())
    }

    pub async fn disable_totp(&self, user_id: &str) -> StoreResult<()> {
        let _writer = self.inner.writer.lock().await;
        let mut transaction = self.inner.pool.begin().await?;
        let result = sqlx::query(
            "UPDATE user_security_settings SET totp_enabled = 0, \
             totp_nonce = NULL, totp_ciphertext = NULL, \
             pending_totp_nonce = NULL, pending_totp_ciphertext = NULL, \
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE user_id = ?",
        )
        .bind(user_id)
        .execute(&mut *transaction)
        .await?;
        if result.rows_affected() != 1 {
            return Err(StoreError::NotFound);
        }
        sqlx::query("DELETE FROM recovery_codes WHERE user_id = ?")
            .bind(user_id)
            .execute(&mut *transaction)
            .await?;
        transaction.commit().await?;
        Ok(())
    }

    pub async fn replace_recovery_codes(
        &self,
        user_id: &str,
        recovery_codes: &[(String, Vec<u8>)],
    ) -> StoreResult<()> {
        let _writer = self.inner.writer.lock().await;
        let mut transaction = self.inner.pool.begin().await?;
        replace_recovery_codes(&mut transaction, user_id, recovery_codes).await?;
        transaction.commit().await?;
        Ok(())
    }

    pub async fn consume_recovery_code(
        &self,
        user_id: &str,
        code_hash: &[u8],
    ) -> StoreResult<bool> {
        let _writer = self.inner.writer.lock().await;
        let result = sqlx::query(
            "UPDATE recovery_codes SET consumed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') \
             WHERE user_id = ? AND code_hash = ? AND consumed_at IS NULL",
        )
        .bind(user_id)
        .bind(code_hash)
        .execute(&self.inner.pool)
        .await?;
        Ok(result.rows_affected() == 1)
    }

    pub async fn update_password_hash(
        &self,
        user_id: &str,
        password_hash: &[u8],
    ) -> StoreResult<()> {
        let _writer = self.inner.writer.lock().await;
        let result = sqlx::query(
            "UPDATE fleet_users SET password_hash = ?, \
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE user_id = ?",
        )
        .bind(password_hash)
        .bind(user_id)
        .execute(&self.inner.pool)
        .await?;
        if result.rows_affected() != 1 {
            return Err(StoreError::NotFound);
        }
        Ok(())
    }

    pub async fn update_idle_timeout(&self, user_id: &str, minutes: i64) -> StoreResult<()> {
        let _writer = self.inner.writer.lock().await;
        let result = sqlx::query(
            "UPDATE user_security_settings SET session_idle_timeout_minutes = ?, \
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE user_id = ?",
        )
        .bind(minutes)
        .bind(user_id)
        .execute(&self.inner.pool)
        .await?;
        if result.rows_affected() != 1 {
            return Err(StoreError::NotFound);
        }
        Ok(())
    }

    pub async fn login_locked_until(
        &self,
        scope_hash: &[u8],
        now_unix: i64,
    ) -> StoreResult<Option<i64>> {
        let locked_until: Option<i64> = sqlx::query_scalar(
            "SELECT locked_until FROM login_rate_limits \
             WHERE scope_hash = ? AND locked_until > ?",
        )
        .bind(scope_hash)
        .bind(now_unix)
        .fetch_optional(&self.inner.pool)
        .await?
        .flatten();
        Ok(locked_until)
    }

    pub async fn record_login_failure(
        &self,
        scope_hash: &[u8],
        now_unix: i64,
    ) -> StoreResult<Option<i64>> {
        let _writer = self.inner.writer.lock().await;
        let mut transaction = self.inner.pool.begin().await?;
        let existing: Option<(i64, i64)> = sqlx::query_as(
            "SELECT failed_attempts, first_failed_at FROM login_rate_limits \
             WHERE scope_hash = ?",
        )
        .bind(scope_hash)
        .fetch_optional(&mut *transaction)
        .await?;
        let (attempts, first_failed_at) = match existing {
            Some((attempts, first_failed_at))
                if now_unix.saturating_sub(first_failed_at) <= LOGIN_WINDOW_SECONDS =>
            {
                (attempts + 1, first_failed_at)
            }
            _ => (1, now_unix),
        };
        let locked_until =
            (attempts >= LOGIN_FAILURE_LIMIT).then_some(now_unix + LOGIN_LOCK_SECONDS);
        sqlx::query(
            "INSERT INTO login_rate_limits \
             (scope_hash, failed_attempts, first_failed_at, locked_until) \
             VALUES (?, ?, ?, ?) \
             ON CONFLICT(scope_hash) DO UPDATE SET \
             failed_attempts = excluded.failed_attempts, \
             first_failed_at = excluded.first_failed_at, \
             locked_until = excluded.locked_until, \
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
        )
        .bind(scope_hash)
        .bind(attempts)
        .bind(first_failed_at)
        .bind(locked_until)
        .execute(&mut *transaction)
        .await?;
        transaction.commit().await?;
        Ok(locked_until)
    }

    pub async fn clear_login_failures(&self, scope_hash: &[u8]) -> StoreResult<()> {
        let _writer = self.inner.writer.lock().await;
        sqlx::query("DELETE FROM login_rate_limits WHERE scope_hash = ?")
            .bind(scope_hash)
            .execute(&self.inner.pool)
            .await?;
        Ok(())
    }

    pub async fn list_audit_entries(
        &self,
        principal_id: &str,
        site_id: Option<&str>,
        limit: i64,
    ) -> StoreResult<Vec<AuditEntry>> {
        let rows: Vec<AuditRow> = sqlx::query_as(
            "SELECT audit_id, request_id, principal_id, site_id, action, outcome, \
             details_json, created_at FROM audit_log \
             WHERE principal_id = ? AND (? IS NULL OR site_id = ?) \
             ORDER BY audit_id DESC LIMIT ?",
        )
        .bind(principal_id)
        .bind(site_id)
        .bind(site_id)
        .bind(limit)
        .fetch_all(&self.inner.pool)
        .await?;
        rows.into_iter()
            .map(
                |(
                    audit_id,
                    request_id,
                    principal_id,
                    site_id,
                    action,
                    outcome,
                    details_json,
                    created_at,
                )| {
                    Ok(AuditEntry {
                        audit_id,
                        request_id,
                        principal_id,
                        site_id,
                        action,
                        outcome,
                        details: serde_json::from_str(&details_json)?,
                        created_at,
                    })
                },
            )
            .collect()
    }
}

async fn replace_recovery_codes(
    transaction: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    user_id: &str,
    recovery_codes: &[(String, Vec<u8>)],
) -> StoreResult<()> {
    sqlx::query("DELETE FROM recovery_codes WHERE user_id = ?")
        .bind(user_id)
        .execute(&mut **transaction)
        .await?;
    for (code_id, code_hash) in recovery_codes {
        sqlx::query(
            "INSERT INTO recovery_codes (recovery_code_id, user_id, code_hash) \
             VALUES (?, ?, ?)",
        )
        .bind(code_id)
        .bind(user_id)
        .bind(code_hash)
        .execute(&mut **transaction)
        .await?;
    }
    Ok(())
}
