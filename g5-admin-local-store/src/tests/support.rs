pub(super) use super::super::{
    clear_keyring_secret, load_keyring_secret, load_or_create_keychain_master_key,
    load_or_create_master_key, open_connection, save_keyring_secret, table_exists, DatabaseConfig,
    SiteInsert, SiteRepository, DB_KEYRING_ACCOUNT, DB_MASTER_KEY_ENV_KEY, DB_MASTER_PATH_ENV_KEY,
};
use crate::runtime_config::DatabaseMasterStorageMode;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, MutexGuard, OnceLock};
use uuid::Uuid;

pub(super) struct EnvGuard {
    key: &'static str,
    previous: Option<String>,
}

impl EnvGuard {
    pub(super) fn set(key: &'static str, value: Option<&str>) -> Self {
        let previous = std::env::var(key).ok();
        match value {
            Some(next) => std::env::set_var(key, next),
            None => std::env::remove_var(key),
        }
        Self { key, previous }
    }
}

impl Drop for EnvGuard {
    fn drop(&mut self) {
        match &self.previous {
            Some(value) => std::env::set_var(self.key, value),
            None => std::env::remove_var(self.key),
        }
    }
}

pub(super) fn unique_temp_file(name: &str) -> PathBuf {
    std::env::temp_dir().join(format!("g5-admin-{name}-{}", Uuid::new_v4()))
}

pub(super) fn create_repository(name: &str) -> (SiteRepository, PathBuf) {
    let db_path = unique_temp_file(name);
    (
        SiteRepository::new(DatabaseConfig {
            path: db_path.clone(),
            allow_duplicate_sites: false,
            master_key_storage: DatabaseMasterStorageMode::Keychain,
            master_key_cache: Arc::new(Mutex::new(Some("test-master-key".to_string()))),
        }),
        db_path,
    )
}

pub(super) fn env_test_guard() -> MutexGuard<'static, ()> {
    static ENV_TEST_GUARD: OnceLock<Mutex<()>> = OnceLock::new();
    ENV_TEST_GUARD
        .get_or_init(|| Mutex::new(()))
        .lock()
        .expect("env test mutex should lock")
}

pub(super) fn cleanup_file(path: &Path) {
    let _ = fs::remove_file(path);
}
