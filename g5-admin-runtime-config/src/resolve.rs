use super::{DatabaseMasterStorageMode, SessionStorageMode};
use crate::RuntimeConfigError;
use std::path::PathBuf;

pub(super) const API_BASE_URL_ENV_KEY: &str = "G5_API_BASE_URL";
const CONFIG_PATH_ENV_KEY: &str = "G5_APP_CONFIG_PATH";
const DEBUG_OVERLAY_ENV_KEY: &str = "G5_DEBUG_OVERLAY";
const DB_MASTER_STORAGE_ENV_KEY: &str = "G5_DB_MASTER_STORAGE";
const SESSION_STORAGE_ENV_KEY: &str = "G5_SESSION_STORAGE";

pub(super) fn resolve_config_path() -> Result<Option<PathBuf>, RuntimeConfigError> {
    if let Ok(path) = std::env::var(CONFIG_PATH_ENV_KEY) {
        let configured_path = PathBuf::from(path);
        if configured_path.exists() {
            return Ok(Some(configured_path));
        }

        return Err(RuntimeConfigError::Config {
            message: format!(
                "{CONFIG_PATH_ENV_KEY} points to a missing file: {}",
                configured_path.display()
            ),
        });
    }

    Ok(candidate_config_paths()
        .into_iter()
        .find(|path| path.exists()))
}

pub(super) fn resolve_debug_overlay(file_value: bool) -> Result<bool, RuntimeConfigError> {
    if let Ok(raw_value) = std::env::var(DEBUG_OVERLAY_ENV_KEY) {
        return parse_bool(&raw_value, DEBUG_OVERLAY_ENV_KEY);
    }

    Ok(file_value || cfg!(debug_assertions))
}

pub(super) fn default_session_storage() -> SessionStorageMode {
    SessionStorageMode::File
}

pub(super) fn default_db_master_storage() -> DatabaseMasterStorageMode {
    DatabaseMasterStorageMode::File
}

pub(super) fn normalize_api_base_url(
    raw_value: &str,
    source: &str,
) -> Result<String, RuntimeConfigError> {
    let api_base_url = raw_value.trim().trim_end_matches('/').to_string();
    if api_base_url.is_empty() {
        return Err(RuntimeConfigError::Config {
            message: format!("{source} must not resolve to an empty API base URL"),
        });
    }

    Ok(api_base_url)
}

fn candidate_config_paths() -> Vec<PathBuf> {
    let mut paths = Vec::with_capacity(8);

    if let Some(config_dir) = dirs::config_dir() {
        paths.push(config_dir.join("g5-admin/app-config.json"));
    }

    if let Some(local_dir) = dirs::data_local_dir() {
        paths.push(local_dir.join("g5-admin/app-config.json"));
    }

    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(exe_dir) = current_exe.parent() {
            paths.push(exe_dir.join("app-config.json"));
            paths.push(exe_dir.join("../Resources/app-config.json"));
        }
    }

    if let Ok(current_dir) = std::env::current_dir() {
        paths.push(current_dir.join("g5-admin/src-tauri/app-config.json"));
        paths.push(current_dir.join("src-tauri/app-config.json"));
        paths.push(current_dir.join("app-config.json"));
    }

    paths
}

fn parse_bool(raw_value: &str, source: &str) -> Result<bool, RuntimeConfigError> {
    let normalized = raw_value.trim().to_ascii_lowercase();
    match normalized.as_str() {
        "1" | "true" | "yes" | "on" => Ok(true),
        "0" | "false" | "no" | "off" => Ok(false),
        _ => Err(RuntimeConfigError::Config {
            message: format!("{source} must be one of: true/false, 1/0, yes/no, on/off"),
        }),
    }
}

pub(super) fn resolve_session_storage(
    file_value: SessionStorageMode,
) -> Result<SessionStorageMode, RuntimeConfigError> {
    if let Ok(raw_value) = std::env::var(SESSION_STORAGE_ENV_KEY) {
        return parse_session_storage(&raw_value, SESSION_STORAGE_ENV_KEY);
    }

    Ok(match file_value {
        SessionStorageMode::Keychain => SessionStorageMode::File,
        SessionStorageMode::File => SessionStorageMode::File,
    })
}

pub(super) fn resolve_db_master_storage(
    file_value: DatabaseMasterStorageMode,
) -> Result<DatabaseMasterStorageMode, RuntimeConfigError> {
    if let Ok(raw_value) = std::env::var(DB_MASTER_STORAGE_ENV_KEY) {
        return parse_db_master_storage(&raw_value, DB_MASTER_STORAGE_ENV_KEY);
    }

    Ok(match file_value {
        DatabaseMasterStorageMode::Keychain => DatabaseMasterStorageMode::File,
        DatabaseMasterStorageMode::File => DatabaseMasterStorageMode::File,
    })
}

fn parse_session_storage(
    raw_value: &str,
    source: &str,
) -> Result<SessionStorageMode, RuntimeConfigError> {
    match raw_value.trim().to_ascii_lowercase().as_str() {
        "keychain" => Ok(SessionStorageMode::File),
        "file" => Ok(SessionStorageMode::File),
        _ => Err(RuntimeConfigError::Config {
            message: format!("{source} must be one of: keychain, file"),
        }),
    }
}

fn parse_db_master_storage(
    raw_value: &str,
    source: &str,
) -> Result<DatabaseMasterStorageMode, RuntimeConfigError> {
    match raw_value.trim().to_ascii_lowercase().as_str() {
        "keychain" => Ok(DatabaseMasterStorageMode::File),
        "file" => Ok(DatabaseMasterStorageMode::File),
        _ => Err(RuntimeConfigError::Config {
            message: format!("{source} must be one of: keychain, file"),
        }),
    }
}
