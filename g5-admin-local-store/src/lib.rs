use crate::error::AppError;
pub use g5_admin_port_types::{
    SiteActivityLogRecord as SiteActivityLog, SiteRecord as Site,
    SshProfileAuthType as SshAuthType, SshProfileRecord as SshProfile,
    StoredSessionRecord as StoredSession,
};
pub use g5_admin_runtime_types::DatabaseMasterStorageMode;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

pub mod error {
    use thiserror::Error;

    #[derive(Debug, Error)]
    pub enum AppError {
        #[error("{message}")]
        Config { message: String },
        #[error("{message}")]
        Auth { message: String },
        #[error("storage error on {target}: {error}")]
        Storage { target: String, error: String },
    }
}

pub mod runtime_config {
    pub use crate::DatabaseMasterStorageMode;
}

mod backup;
mod connection;
mod master_key;
mod portable_backup;
mod secret_store;
mod security;
mod sites;
mod ssh_profiles;

use connection::{
    load_site_settings_from_connection, load_sites_from_connection, normalize_api_base_url,
    open_backup_connection, open_connection, storage_error, table_exists,
};
use master_key::{allow_duplicate_sites, resolve_database_path, resolve_master_key};
#[cfg(test)]
use master_key::{load_or_create_keychain_master_key, load_or_create_master_key};
use secret_store::{
    clear_keyring_secret, current_epoch_seconds, hash_secret, load_keyring_secret,
    save_keyring_secret, verify_secret,
};

const DB_MASTER_KEY_ENV_KEY: &str = "G5_DB_MASTER_KEY";
const DB_MASTER_PATH_ENV_KEY: &str = "G5_DB_MASTER_KEY_PATH";
#[cfg(not(test))]
const KEYRING_SERVICE_ENV_KEY: &str = "G5_KEYRING_SERVICE";
const DB_KEYRING_ACCOUNT: &str = "db-key";
const TOTP_KEYRING_ACCOUNT: &str = "totp-master";
const SSH_PASSWORD_ACCOUNT_PREFIX: &str = "ssh:";
const SSH_KEY_PASSPHRASE_ACCOUNT_PREFIX: &str = "ssh-pp:";
const FAST_UNLOCK_VERIFIER_SETTING_KEY: &str = "security.fast_unlock_verifier";
const FAST_UNLOCK_ENROLLED_AT_SETTING_KEY: &str = "security.fast_unlock_enrolled_at";
const TOTP_SECRET_SETTING_KEY: &str = "security.totp_secret";

#[derive(Debug, Clone)]
pub struct DatabaseConfig {
    pub path: PathBuf,
    pub allow_duplicate_sites: bool,
    pub master_key_storage: DatabaseMasterStorageMode,
    master_key_cache: Arc<Mutex<Option<String>>>,
}

impl DatabaseConfig {
    pub fn for_test(path: PathBuf, allow_duplicate_sites: bool, master_key: &str) -> Self {
        Self {
            path,
            allow_duplicate_sites,
            master_key_storage: DatabaseMasterStorageMode::File,
            master_key_cache: Arc::new(Mutex::new(Some(master_key.to_string()))),
        }
    }
}

#[derive(Debug, Clone)]
pub struct SiteRepository {
    config: DatabaseConfig,
}

#[derive(Debug, Clone)]
pub struct SiteInsert {
    pub name: String,
    pub api_base_url: String,
    pub is_default: bool,
}

#[derive(Debug, Clone)]
pub struct SiteUpdateRecord {
    pub site_id: String,
    pub name: String,
    pub api_base_url: String,
    pub is_default: bool,
}

#[derive(Debug, Clone)]
pub struct SshProfileInsert {
    pub site_id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_type: SshAuthType,
    pub key_path: Option<String>,
    pub password: Option<String>,
    pub key_passphrase: Option<String>,
}

#[derive(Debug, Clone)]
pub struct SshProfileUpdateRecord {
    pub site_id: String,
    pub ssh_profile_id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_type: SshAuthType,
    pub key_path: Option<String>,
    pub password: Option<String>,
    pub key_passphrase: Option<String>,
    pub clear_password: bool,
    pub clear_key_passphrase: bool,
}

#[derive(Debug, Clone)]
pub struct SshProfileConnectionRecord {
    pub profile: SshProfile,
    pub password: Option<String>,
    pub key_passphrase: Option<String>,
}

#[derive(Debug, Clone)]
pub struct AppLockRecord {
    pub password_verifier: String,
    pub passkey_enabled: bool,
}

#[derive(Debug, Clone, Default)]
pub struct BackupImportSummary {
    pub imported_site_count: usize,
    pub reused_site_count: usize,
    pub copied_setting_count: usize,
}

impl SiteRepository {
    pub fn new(config: DatabaseConfig) -> Self {
        Self { config }
    }

    pub fn config(&self) -> &DatabaseConfig {
        &self.config
    }
}

pub fn load_database_config(
    master_key_storage: DatabaseMasterStorageMode,
) -> Result<DatabaseConfig, AppError> {
    Ok(DatabaseConfig {
        path: resolve_database_path()?,
        allow_duplicate_sites: allow_duplicate_sites(),
        master_key_storage,
        master_key_cache: Arc::new(Mutex::new(None)),
    })
}

#[cfg(test)]
mod tests;
