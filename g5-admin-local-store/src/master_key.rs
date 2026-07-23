use super::{
    load_keyring_secret, save_keyring_secret, DatabaseConfig, DB_KEYRING_ACCOUNT,
    DB_MASTER_KEY_ENV_KEY, DB_MASTER_PATH_ENV_KEY,
};
use crate::error::AppError;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

pub(super) fn resolve_master_key(
    config: &DatabaseConfig,
    database_exists: bool,
) -> Result<String, AppError> {
    if let Ok(raw) = std::env::var(DB_MASTER_KEY_ENV_KEY) {
        let normalized = raw.trim().to_string();
        if normalized.is_empty() {
            return Err(AppError::Config {
                message: format!("{DB_MASTER_KEY_ENV_KEY} must not be empty"),
            });
        }
        return Ok(normalized);
    }

    let mut guard = config
        .master_key_cache
        .lock()
        .map_err(|error| AppError::Storage {
            target: "db.master_key_cache".to_string(),
            error: error.to_string(),
        })?;
    if let Some(cached) = guard.as_ref() {
        return Ok(cached.clone());
    }

    let loaded = match config.master_key_storage {
        crate::runtime_config::DatabaseMasterStorageMode::Keychain => {
            load_or_create_keychain_master_key_for_database(&config.path, database_exists)?
        }
        crate::runtime_config::DatabaseMasterStorageMode::File => {
            load_or_create_file_master_key_for_database(&config.path, database_exists)?
        }
    };
    *guard = Some(loaded.clone());
    Ok(loaded)
}

pub(super) fn resolve_database_path() -> Result<PathBuf, AppError> {
    if let Ok(current_dir) = std::env::current_dir() {
        if current_dir.ends_with("rust/g5-admin/src-tauri") {
            return Ok(current_dir.join("g5-admin.db"));
        }
    }

    if let Some(data_dir) = dirs::data_local_dir() {
        return Ok(data_dir.join("g5-admin").join("g5-admin.db"));
    }

    let current_dir = std::env::current_dir().map_err(|error| AppError::Config {
        message: format!("failed to resolve current directory for db path: {error}"),
    })?;
    Ok(current_dir.join(".g5-admin").join("g5-admin.db"))
}

#[cfg(test)]
pub(super) fn load_or_create_master_key() -> Result<String, AppError> {
    load_or_create_file_master_key(false)
}

#[cfg(test)]
fn load_or_create_file_master_key(database_exists: bool) -> Result<String, AppError> {
    let database_path = resolve_database_path()?;
    load_or_create_file_master_key_for_database(&database_path, database_exists)
}

fn load_or_create_file_master_key_for_database(
    database_path: &Path,
    database_exists: bool,
) -> Result<String, AppError> {
    if let Ok(raw) = std::env::var(DB_MASTER_KEY_ENV_KEY) {
        let normalized = raw.trim().to_string();
        if normalized.is_empty() {
            return Err(AppError::Config {
                message: format!("{DB_MASTER_KEY_ENV_KEY} must not be empty"),
            });
        }
        return Ok(normalized);
    }

    let fallback_path = resolve_master_key_path()?;
    if fallback_path.exists() {
        let value = fs::read_to_string(&fallback_path).map_err(|error| AppError::Storage {
            target: fallback_path.display().to_string(),
            error: error.to_string(),
        })?;
        let normalized = value.trim().to_string();
        if !normalized.is_empty() {
            return Ok(normalized);
        }
    }

    if database_exists {
        return Err(missing_master_key_error(
            database_path,
            "file secure storage",
        ));
    }

    generate_file_master_key(&fallback_path)
}

#[cfg(test)]
pub(super) fn load_or_create_keychain_master_key(
    database_exists: bool,
) -> Result<String, AppError> {
    let database_path = resolve_database_path()?;
    load_or_create_keychain_master_key_for_database(&database_path, database_exists)
}

fn load_or_create_keychain_master_key_for_database(
    database_path: &Path,
    database_exists: bool,
) -> Result<String, AppError> {
    let fallback_path = resolve_master_key_path()?;
    if !database_exists && !fallback_path.exists() {
        return generate_keychain_master_key();
    }

    if let Some(value) = load_keyring_secret(DB_KEYRING_ACCOUNT)? {
        if !value.trim().is_empty() {
            return Ok(value);
        }
    }

    if fallback_path.exists() {
        let value = fs::read_to_string(&fallback_path).map_err(|error| AppError::Storage {
            target: fallback_path.display().to_string(),
            error: error.to_string(),
        })?;
        let normalized = value.trim().to_string();
        if !normalized.is_empty() {
            save_keyring_secret(DB_KEYRING_ACCOUNT, &normalized)?;
            fs::remove_file(&fallback_path).map_err(|error| AppError::Storage {
                target: fallback_path.display().to_string(),
                error: error.to_string(),
            })?;
            return Ok(normalized);
        }
    }

    if database_exists {
        return Err(missing_master_key_error(database_path, "secure storage"));
    }

    generate_keychain_master_key()
}

pub(super) fn allow_duplicate_sites() -> bool {
    cfg!(debug_assertions)
        || matches!(
            std::env::var("G5_ALLOW_DUPLICATE_SITES"),
            Ok(value) if matches!(value.trim().to_ascii_lowercase().as_str(), "1" | "true" | "yes" | "on")
        )
}

fn generate_master_key() -> Result<String, AppError> {
    let mut bytes = [0_u8; 32];
    getrandom::fill(&mut bytes).map_err(|error| AppError::Storage {
        target: "db.master_key.generate".to_string(),
        error: error.to_string(),
    })?;
    Ok(bytes.iter().map(|byte| format!("{byte:02x}")).collect())
}

fn generate_file_master_key(fallback_path: &Path) -> Result<String, AppError> {
    let generated = generate_master_key()?;
    persist_file_master_key(fallback_path, &generated)?;
    Ok(generated)
}

fn persist_file_master_key(fallback_path: &Path, value: &str) -> Result<(), AppError> {
    if let Some(parent) = fallback_path.parent() {
        fs::create_dir_all(parent).map_err(|error| AppError::Storage {
            target: parent.display().to_string(),
            error: error.to_string(),
        })?;
    }
    fs::write(fallback_path, value.as_bytes()).map_err(|error| AppError::Storage {
        target: fallback_path.display().to_string(),
        error: error.to_string(),
    })?;
    set_file_only_permissions(fallback_path)?;
    Ok(())
}

#[cfg(unix)]
fn set_file_only_permissions(path: &Path) -> Result<(), AppError> {
    use std::os::unix::fs::PermissionsExt;

    fs::set_permissions(path, fs::Permissions::from_mode(0o600)).map_err(|error| {
        AppError::Storage {
            target: path.display().to_string(),
            error: error.to_string(),
        }
    })
}

#[cfg(not(unix))]
fn set_file_only_permissions(_path: &Path) -> Result<(), AppError> {
    Ok(())
}

fn generate_keychain_master_key() -> Result<String, AppError> {
    let generated = generate_master_key()?;
    save_keyring_secret(DB_KEYRING_ACCOUNT, &generated)?;
    Ok(generated)
}

fn missing_master_key_error(database_path: &Path, storage: &str) -> AppError {
    AppError::Storage {
        target: database_path.display().to_string(),
        error: format!(
            "existing SQLCipher database cannot be opened because its master key is missing from {storage}; database preserved for recovery"
        ),
    }
}

pub(super) fn quarantine_unrecoverable_database(
    database_path: &Path,
    reason: &str,
) -> Result<(), AppError> {
    if !database_path.exists() {
        return Ok(());
    }

    let archived_path = next_orphaned_database_path(database_path);
    fs::rename(database_path, &archived_path).map_err(|error| AppError::Storage {
        target: database_path.display().to_string(),
        error: format!(
            "failed to archive unrecoverable database to {}: {error}",
            archived_path.display()
        ),
    })?;

    tracing::warn!(
        component = "g5_admin::db::master_key",
        operation = "quarantine_unrecoverable_database",
        target = %database_path.display(),
        archived_path = %archived_path.display(),
        reason,
        "archived existing database without a recoverable SQLCipher key"
    );

    Ok(())
}

fn next_orphaned_database_path(database_path: &Path) -> PathBuf {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    let base = format!("{}.orphaned-{timestamp}", database_path.display());
    let candidate = PathBuf::from(&base);
    if !candidate.exists() {
        return candidate;
    }

    let mut index = 1_u32;
    loop {
        let candidate = PathBuf::from(format!("{base}-{index}"));
        if !candidate.exists() {
            return candidate;
        }
        index = index.saturating_add(1);
    }
}

fn resolve_master_key_path() -> Result<PathBuf, AppError> {
    if let Ok(raw_path) = std::env::var(DB_MASTER_PATH_ENV_KEY) {
        let path = PathBuf::from(raw_path);
        if path.as_os_str().is_empty() {
            return Err(AppError::Config {
                message: format!("{DB_MASTER_PATH_ENV_KEY} must not be empty"),
            });
        }
        return Ok(path);
    }

    let base = if let Some(data_dir) = dirs::data_local_dir() {
        data_dir.join("g5-admin")
    } else {
        std::env::current_dir()
            .map_err(|error| AppError::Config {
                message: format!("failed to resolve current directory for master key: {error}"),
            })?
            .join(".g5-admin")
    };
    Ok(base.join(".db-master-key"))
}
