#[cfg(not(test))]
use super::KEYRING_SERVICE_ENV_KEY;
use crate::error::AppError;
use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
#[cfg(not(test))]
use keyring::Entry;

pub(super) fn hash_secret(target: &str, secret: &str) -> Result<String, AppError> {
    let mut salt_bytes = [0_u8; 16];
    getrandom::fill(&mut salt_bytes).map_err(|error| AppError::Storage {
        target: format!("{target}.salt"),
        error: error.to_string(),
    })?;
    let salt = SaltString::encode_b64(&salt_bytes).map_err(|error| AppError::Storage {
        target: format!("{target}.salt_encode"),
        error: error.to_string(),
    })?;
    Argon2::default()
        .hash_password(secret.as_bytes(), &salt)
        .map_err(|error| AppError::Storage {
            target: target.to_string(),
            error: error.to_string(),
        })
        .map(|hash| hash.to_string())
}

pub(super) fn verify_secret(target: &str, secret: &str, verifier: &str) -> Result<bool, AppError> {
    let parsed = PasswordHash::new(verifier).map_err(|error| AppError::Storage {
        target: format!("{target}.parse"),
        error: error.to_string(),
    })?;

    Ok(Argon2::default()
        .verify_password(secret.as_bytes(), &parsed)
        .is_ok())
}

pub(super) fn current_epoch_seconds() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}

#[cfg(not(test))]
fn keyring_entry(account: &str) -> Result<Entry, AppError> {
    let service_name =
        std::env::var(KEYRING_SERVICE_ENV_KEY).unwrap_or_else(|_| "g5-admin-desktop".to_string());
    Entry::new(&service_name, account).map_err(|error| AppError::Storage {
        target: format!("keyring.entry.{account}"),
        error: normalize_keyring_error(error),
    })
}

#[cfg(test)]
pub(super) fn load_keyring_secret(account: &str) -> Result<Option<String>, AppError> {
    Ok(test_keyring_store()
        .lock()
        .expect("test keyring mutex should lock")
        .get(account)
        .cloned())
}

#[cfg(not(test))]
pub(super) fn load_keyring_secret(account: &str) -> Result<Option<String>, AppError> {
    let entry = keyring_entry(account)?;
    match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(AppError::Storage {
            target: format!("keyring.load.{account}"),
            error: normalize_keyring_error(error),
        }),
    }
}

#[cfg(test)]
pub(super) fn save_keyring_secret(account: &str, value: &str) -> Result<(), AppError> {
    test_keyring_store()
        .lock()
        .expect("test keyring mutex should lock")
        .insert(account.to_string(), value.to_string());
    Ok(())
}

#[cfg(not(test))]
pub(super) fn save_keyring_secret(account: &str, value: &str) -> Result<(), AppError> {
    let entry = keyring_entry(account)?;
    entry
        .set_password(value)
        .map_err(|error| AppError::Storage {
            target: format!("keyring.save.{account}"),
            error: normalize_keyring_error(error),
        })
}

#[cfg(test)]
pub(super) fn clear_keyring_secret(account: &str) -> Result<(), AppError> {
    test_keyring_store()
        .lock()
        .expect("test keyring mutex should lock")
        .remove(account);
    Ok(())
}

#[cfg(not(test))]
pub(super) fn clear_keyring_secret(account: &str) -> Result<(), AppError> {
    let entry = keyring_entry(account)?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(AppError::Storage {
            target: format!("keyring.delete.{account}"),
            error: normalize_keyring_error(error),
        }),
    }
}

#[cfg(not(test))]
fn normalize_keyring_error(error: keyring::Error) -> String {
    error.to_string()
}

#[cfg(test)]
fn test_keyring_store() -> &'static std::sync::Mutex<std::collections::HashMap<String, String>> {
    use std::collections::HashMap;
    use std::sync::{Mutex, OnceLock};

    static STORE: OnceLock<Mutex<HashMap<String, String>>> = OnceLock::new();
    STORE.get_or_init(|| Mutex::new(HashMap::new()))
}
