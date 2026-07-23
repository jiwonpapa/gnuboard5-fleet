use crate::error::AppError;
use crate::StoredSession;
use keyring::Entry;
use std::fs;
use std::path::{Path, PathBuf};

const SESSION_STORE_PATH_ENV_KEY: &str = "G5_SESSION_STORE_PATH";
const KEYRING_ENTRY_NAME: &str = "desktop-session";

pub(super) fn load_keychain_session(service_name: &str) -> Result<Option<StoredSession>, AppError> {
    let entry = entry(service_name)?;
    match entry.get_password() {
        Ok(raw) => serde_json::from_str::<StoredSession>(&raw)
            .map(Some)
            .map_err(|error| AppError::TokenStore {
                operation: "deserialize_session:keychain".to_string(),
                error: error.to_string(),
            }),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(AppError::TokenStore {
            operation: "load_session:keychain".to_string(),
            error: normalize_keyring_error(error),
        }),
    }
}

pub(super) fn save_keychain_session(
    service_name: &str,
    session: &StoredSession,
) -> Result<(), AppError> {
    let entry = entry(service_name)?;
    let payload = serde_json::to_string(session).map_err(|error| AppError::TokenStore {
        operation: "serialize_session:keychain".to_string(),
        error: error.to_string(),
    })?;
    entry
        .set_password(&payload)
        .map_err(|error| AppError::TokenStore {
            operation: "save_session:keychain".to_string(),
            error: normalize_keyring_error(error),
        })
}

pub(super) fn clear_keychain_session(service_name: &str) -> Result<(), AppError> {
    let entry = entry(service_name)?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(AppError::TokenStore {
            operation: "clear_session:keychain".to_string(),
            error: normalize_keyring_error(error),
        }),
    }
}

pub(super) fn load_file_session(path: &Path) -> Result<Option<StoredSession>, AppError> {
    match fs::read_to_string(path) {
        Ok(raw) => serde_json::from_str::<StoredSession>(&raw)
            .map(Some)
            .map_err(|error| AppError::TokenStore {
                operation: "deserialize_session:file".to_string(),
                error: error.to_string(),
            }),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(AppError::TokenStore {
            operation: "load_session:file".to_string(),
            error: error.to_string(),
        }),
    }
}

#[cfg(test)]
pub(super) fn save_file_session(path: &Path, session: &StoredSession) -> Result<(), AppError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| AppError::TokenStore {
            operation: "create_session_directory:file".to_string(),
            error: error.to_string(),
        })?;
    }

    let payload = serde_json::to_string(session).map_err(|error| AppError::TokenStore {
        operation: "serialize_session:file".to_string(),
        error: error.to_string(),
    })?;

    let temp_path = temporary_session_path(path);
    fs::write(&temp_path, payload).map_err(|error| AppError::TokenStore {
        operation: "write_session_temp:file".to_string(),
        error: error.to_string(),
    })?;
    set_owner_only_permissions(&temp_path)?;
    fs::rename(&temp_path, path).map_err(|error| AppError::TokenStore {
        operation: "commit_session_file:file".to_string(),
        error: error.to_string(),
    })?;
    set_owner_only_permissions(path)?;

    Ok(())
}

pub(super) fn clear_file_session(path: &Path) -> Result<(), AppError> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(AppError::TokenStore {
            operation: "clear_session:file".to_string(),
            error: error.to_string(),
        }),
    }
}

pub(super) fn resolve_session_store_paths() -> Result<(PathBuf, PathBuf), AppError> {
    if let Ok(raw_path) = std::env::var(SESSION_STORE_PATH_ENV_KEY) {
        let path = PathBuf::from(raw_path);
        if path.as_os_str().is_empty() {
            return Err(AppError::Config {
                message: format!("{SESSION_STORE_PATH_ENV_KEY} must not be empty"),
            });
        }

        let sessions_dir = if path.extension().is_some() {
            path.parent()
                .map(|parent| parent.join("sessions"))
                .unwrap_or_else(|| PathBuf::from("sessions"))
        } else {
            path.clone()
        };

        let legacy_path = if path.extension().is_some() {
            path
        } else {
            path.join("session.json")
        };

        return Ok((legacy_path, sessions_dir));
    }

    if let Some(data_dir) = dirs::data_local_dir() {
        let base_dir = data_dir.join("g5-admin");
        return Ok((base_dir.join("session.json"), base_dir.join("sessions")));
    }

    let current_dir = std::env::current_dir().map_err(|error| AppError::Config {
        message: format!("failed to resolve current directory for session store: {error}"),
    })?;
    Ok((
        current_dir.join(".g5-admin").join("session.json"),
        current_dir.join(".g5-admin").join("sessions"),
    ))
}

pub(super) fn file_path_for_site(sessions_dir: &Path, site_id: &str) -> PathBuf {
    sessions_dir.join(format!("site-{site_id}.json"))
}

fn entry(service_name: &str) -> Result<Entry, AppError> {
    Entry::new(service_name, KEYRING_ENTRY_NAME).map_err(|error| AppError::TokenStore {
        operation: "create_entry:keychain".to_string(),
        error: normalize_keyring_error(error),
    })
}

#[cfg(test)]
fn temporary_session_path(path: &Path) -> PathBuf {
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("session.json");
    path.with_file_name(format!("{file_name}.tmp"))
}

fn normalize_keyring_error(error: keyring::Error) -> String {
    let raw_message = error.to_string();
    if raw_message.contains("User canceled the operation") {
        return "macOS 키체인 접근이 취소되었습니다. 패키지 앱은 키체인 접근을 허용해 주시고, 필요하면 sessionStorage=file 설정만 유지해 주십시오.".to_string();
    }
    if raw_message.contains("User interaction is not allowed") {
        return "macOS 키체인이 잠겨 있거나 현재 앱 접근이 허용되지 않았습니다.".to_string();
    }
    raw_message
}

#[cfg(unix)]
#[cfg(all(test, unix))]
fn set_owner_only_permissions(path: &Path) -> Result<(), AppError> {
    use std::os::unix::fs::PermissionsExt;

    fs::set_permissions(path, fs::Permissions::from_mode(0o600)).map_err(|error| {
        AppError::TokenStore {
            operation: "set_file_permissions:file".to_string(),
            error: error.to_string(),
        }
    })
}

#[cfg(all(test, not(unix)))]
fn set_owner_only_permissions(_path: &Path) -> Result<(), AppError> {
    Ok(())
}
