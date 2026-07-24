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
}
