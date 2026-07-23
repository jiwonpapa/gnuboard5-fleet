use super::*;
use argon2::{
    password_hash::{PasswordHash, PasswordVerifier},
    Argon2,
};
use rusqlite::{params, OptionalExtension};

impl SiteRepository {
    pub fn load_app_lock(&self) -> Result<Option<AppLockRecord>, AppError> {
        let connection = open_connection(&self.config)?;
        connection
            .query_row(
                "SELECT password_verifier, passkey_enabled
                 FROM app_lock WHERE id = 1",
                [],
                |row| {
                    Ok(AppLockRecord {
                        password_verifier: row.get(0)?,
                        passkey_enabled: row.get::<_, i64>(1)? == 1,
                    })
                },
            )
            .optional()
            .map_err(storage_error("app_lock.find"))
    }

    pub fn create_app_lock(&self, password: &str) -> Result<AppLockRecord, AppError> {
        let password = password.trim();
        if password.is_empty() {
            return Err(AppError::Config {
                message: "마스터 비밀번호를 입력해 주십시오.".to_string(),
            });
        }

        let verifier = hash_secret("app_lock.hash", password)?;
        let parsed = PasswordHash::new(&verifier).map_err(|error| AppError::Storage {
            target: "app_lock.hash.parse".to_string(),
            error: error.to_string(),
        })?;
        let salt = parsed
            .salt
            .map(|value| value.to_string())
            .ok_or_else(|| AppError::Storage {
                target: "app_lock.hash.salt".to_string(),
                error: "hashed app lock password is missing salt".to_string(),
            })?;

        let connection = open_connection(&self.config)?;
        connection
            .execute(
                "INSERT INTO app_lock (
                   id,
                   password_verifier,
                   password_salt,
                   passkey_enabled,
                   created_at,
                   updated_at
                 ) VALUES (
                   1,
                   ?1,
                   ?2,
                   0,
                   datetime('now'),
                   datetime('now')
                 )",
                params![verifier, salt.as_str()],
            )
            .map_err(storage_error("app_lock.insert"))?;

        self.load_app_lock()?.ok_or_else(|| AppError::Storage {
            target: "app_lock.find_after_insert".to_string(),
            error: "failed to read inserted app lock".to_string(),
        })
    }

    pub fn verify_app_lock(&self, password: &str) -> Result<bool, AppError> {
        let Some(record) = self.load_app_lock()? else {
            return Ok(false);
        };

        let parsed =
            PasswordHash::new(&record.password_verifier).map_err(|error| AppError::Storage {
                target: "app_lock.parse_verifier".to_string(),
                error: error.to_string(),
            })?;

        Ok(Argon2::default()
            .verify_password(password.as_bytes(), &parsed)
            .is_ok())
    }

    pub fn update_app_lock_password(&self, password: &str) -> Result<AppLockRecord, AppError> {
        let password = password.trim();
        if password.is_empty() {
            return Err(AppError::Config {
                message: "새 마스터 비밀번호를 입력해 주십시오.".to_string(),
            });
        }

        let verifier = hash_secret("app_lock.rehash", password)?;
        let parsed = PasswordHash::new(&verifier).map_err(|error| AppError::Storage {
            target: "app_lock.rehash.parse".to_string(),
            error: error.to_string(),
        })?;
        let salt = parsed
            .salt
            .map(|value| value.to_string())
            .ok_or_else(|| AppError::Storage {
                target: "app_lock.rehash.salt".to_string(),
                error: "hashed app lock password is missing salt".to_string(),
            })?;

        let connection = open_connection(&self.config)?;
        connection
            .execute(
                "UPDATE app_lock
                 SET password_verifier = ?1,
                     password_salt = ?2,
                     updated_at = datetime('now')
                 WHERE id = 1",
                params![verifier, salt.as_str()],
            )
            .map_err(storage_error("app_lock.update"))?;

        self.load_app_lock()?.ok_or_else(|| AppError::Storage {
            target: "app_lock.find_after_update".to_string(),
            error: "failed to read updated app lock".to_string(),
        })
    }

    pub fn fast_unlock_enabled(&self) -> Result<bool, AppError> {
        let app_lock = self.load_app_lock()?;
        let Some(record) = app_lock else {
            return Ok(false);
        };

        Ok(record.passkey_enabled
            && self
                .get_app_setting(FAST_UNLOCK_VERIFIER_SETTING_KEY)?
                .is_some())
    }

    pub fn store_fast_unlock_verifier(&self, secret: &str) -> Result<(), AppError> {
        let normalized = secret.trim();
        if normalized.is_empty() {
            return Err(AppError::Config {
                message: "빠른 잠금 해제 비밀값이 비어 있습니다.".to_string(),
            });
        }

        let verifier = hash_secret("fast_unlock.hash", normalized)?;
        self.set_app_setting(FAST_UNLOCK_VERIFIER_SETTING_KEY, &verifier)?;
        self.set_app_setting(
            FAST_UNLOCK_ENROLLED_AT_SETTING_KEY,
            &current_epoch_seconds().to_string(),
        )?;
        self.set_app_lock_passkey_enabled(true)?;
        Ok(())
    }

    pub fn verify_fast_unlock_secret(&self, secret: &str) -> Result<bool, AppError> {
        let Some(verifier) = self.get_app_setting(FAST_UNLOCK_VERIFIER_SETTING_KEY)? else {
            return Ok(false);
        };

        verify_secret("fast_unlock.verify", secret.trim(), &verifier)
    }

    pub fn clear_fast_unlock_verifier(&self) -> Result<(), AppError> {
        self.delete_app_setting(FAST_UNLOCK_VERIFIER_SETTING_KEY)?;
        self.delete_app_setting(FAST_UNLOCK_ENROLLED_AT_SETTING_KEY)?;
        self.set_app_lock_passkey_enabled(false)?;
        Ok(())
    }

    pub fn get_app_setting(&self, key: &str) -> Result<Option<String>, AppError> {
        let connection = open_connection(&self.config)?;
        connection
            .query_row(
                "SELECT value FROM app_settings WHERE key = ?1",
                params![key],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(storage_error("app_settings.get"))
    }

    pub fn set_app_setting(&self, key: &str, value: &str) -> Result<(), AppError> {
        let connection = open_connection(&self.config)?;
        connection
            .execute(
                "INSERT INTO app_settings (key, value)
                 VALUES (?1, ?2)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                params![key, value],
            )
            .map_err(storage_error("app_settings.set"))?;
        Ok(())
    }

    pub fn delete_app_setting(&self, key: &str) -> Result<(), AppError> {
        let connection = open_connection(&self.config)?;
        connection
            .execute("DELETE FROM app_settings WHERE key = ?1", params![key])
            .map_err(storage_error("app_settings.delete"))?;
        Ok(())
    }

    pub fn load_totp_secret(&self) -> Result<Option<String>, AppError> {
        if let Some(secret) = self.get_app_setting(TOTP_SECRET_SETTING_KEY)? {
            return Ok(Some(secret));
        }

        let Some(secret) = load_keyring_secret(TOTP_KEYRING_ACCOUNT)? else {
            return Ok(None);
        };
        self.set_app_setting(TOTP_SECRET_SETTING_KEY, &secret)?;
        clear_keyring_secret(TOTP_KEYRING_ACCOUNT)?;
        Ok(Some(secret))
    }

    pub fn store_totp_secret(&self, secret: &str) -> Result<(), AppError> {
        self.set_app_setting(TOTP_SECRET_SETTING_KEY, secret)?;
        clear_keyring_secret(TOTP_KEYRING_ACCOUNT)?;
        Ok(())
    }

    pub fn clear_totp_secret(&self) -> Result<(), AppError> {
        self.delete_app_setting(TOTP_SECRET_SETTING_KEY)?;
        clear_keyring_secret(TOTP_KEYRING_ACCOUNT)?;
        Ok(())
    }

    pub(super) fn set_app_lock_passkey_enabled(&self, enabled: bool) -> Result<(), AppError> {
        let connection = open_connection(&self.config)?;
        connection
            .execute(
                "UPDATE app_lock
                 SET passkey_enabled = ?1,
                     updated_at = datetime('now')
                 WHERE id = 1",
                params![if enabled { 1 } else { 0 }],
            )
            .map_err(storage_error("app_lock.set_fast_unlock_enabled"))?;
        Ok(())
    }
}
