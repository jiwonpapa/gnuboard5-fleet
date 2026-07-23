use crate::error::AppError;
pub use g5_admin_runtime_types::SessionStorageMode;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::RwLock;

mod backend;

pub mod error {
    use thiserror::Error;

    #[derive(Debug, Error)]
    pub enum AppError {
        #[error("{message}")]
        Config { message: String },
        #[error("{message}")]
        Auth { message: String },
        #[error("token store error during {operation}: {error}")]
        TokenStore { operation: String, error: String },
        #[error("storage error on {target}: {error}")]
        Storage { target: String, error: String },
    }
}

use backend::{
    clear_file_session, clear_keychain_session, file_path_for_site, load_file_session,
    load_keychain_session, resolve_session_store_paths, save_keychain_session,
};

const KEYRING_SERVICE_ENV_KEY: &str = "G5_KEYRING_SERVICE";

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct StoredSession {
    pub mb_id: String,
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: u64,
}

impl StoredSession {
    pub fn new(
        mb_id: impl Into<String>,
        access_token: impl Into<String>,
        refresh_token: impl Into<String>,
        expires_in: u64,
    ) -> Self {
        Self {
            mb_id: mb_id.into(),
            access_token: access_token.into(),
            refresh_token: refresh_token.into(),
            expires_in,
        }
    }
}

pub trait FileSessionRepository: Send + Sync {
    fn load_site_session(&self, site_id: &str) -> Result<Option<StoredSession>, AppError>;
    fn save_site_session(&self, site_id: &str, session: &StoredSession) -> Result<(), AppError>;
    fn clear_site_session(&self, site_id: &str) -> Result<(), AppError>;
    fn describe_site_session_target(&self, site_id: &str) -> String;
}

#[derive(Clone)]
pub struct TokenStore {
    backend: TokenStoreBackend,
    active_site_id: Arc<RwLock<Option<String>>>,
    session_cache: Arc<RwLock<HashMap<String, Option<StoredSession>>>>,
}

#[derive(Clone)]
enum TokenStoreBackend {
    Keychain {
        service_name: String,
    },
    File {
        repository: Arc<dyn FileSessionRepository>,
        legacy_path: PathBuf,
        sessions_dir: PathBuf,
    },
}

impl TokenStore {
    pub fn from_runtime_settings(
        session_storage: SessionStorageMode,
        file_repository: Option<Arc<dyn FileSessionRepository>>,
    ) -> Result<Self, AppError> {
        let backend = match session_storage {
            SessionStorageMode::Keychain => TokenStoreBackend::Keychain {
                service_name: std::env::var(KEYRING_SERVICE_ENV_KEY)
                    .unwrap_or_else(|_| "g5-admin-desktop".to_string()),
            },
            SessionStorageMode::File => {
                let (legacy_path, sessions_dir) = resolve_session_store_paths()?;
                let repository = file_repository.ok_or_else(|| AppError::Config {
                    message: "file session storage requires a site session repository".to_string(),
                })?;
                TokenStoreBackend::File {
                    repository,
                    legacy_path,
                    sessions_dir,
                }
            }
        };

        Ok(Self {
            backend,
            active_site_id: Arc::new(RwLock::new(None)),
            session_cache: Arc::new(RwLock::new(HashMap::new())),
        })
    }

    pub async fn set_active_site_id(&self, site_id: Option<String>) {
        *self.active_site_id.write().await = site_id;
    }

    pub async fn active_site_id(&self) -> Option<String> {
        self.active_site_id.read().await.clone()
    }

    pub fn backend_label(&self) -> &'static str {
        match self.backend {
            TokenStoreBackend::Keychain { .. } => "keychain",
            TokenStoreBackend::File { .. } => "file",
        }
    }

    pub fn backend_target(&self) -> String {
        let current_site_id = self.active_site_id.blocking_read().clone();
        self.backend_target_for_site(current_site_id.as_deref())
    }

    pub async fn load_session(&self) -> Result<Option<StoredSession>, AppError> {
        let Some(site_id) = self.active_site_id().await else {
            return Ok(None);
        };

        self.load_session_for_site(&site_id).await
    }

    pub async fn save_session(&self, session: &StoredSession) -> Result<(), AppError> {
        let Some(site_id) = self.active_site_id().await else {
            return Err(AppError::Config {
                message: "active site is not selected".to_string(),
            });
        };

        self.save_session_for_site(&site_id, session).await
    }

    pub async fn clear_session(&self) -> Result<(), AppError> {
        let Some(site_id) = self.active_site_id().await else {
            return Ok(());
        };

        self.clear_session_for_site(&site_id).await
    }

    pub async fn clear_session_for_site(&self, site_id: &str) -> Result<(), AppError> {
        let backend = self.backend.clone();
        let site_id = site_id.to_string();
        let backend_site_id = site_id.clone();
        tokio::task::spawn_blocking(move || match backend {
            TokenStoreBackend::Keychain { service_name } => {
                clear_keychain_session(&format!("{service_name}:site:{backend_site_id}"))
            }
            TokenStoreBackend::File {
                repository,
                legacy_path,
                sessions_dir,
            } => {
                repository.clear_site_session(&backend_site_id)?;
                clear_legacy_session_files(&legacy_path, &sessions_dir, &backend_site_id)
            }
        })
        .await
        .map_err(|error| AppError::TokenStore {
            operation: format!("clear_session_join:{}", self.backend_label()),
            error: error.to_string(),
        })??;

        self.session_cache.write().await.insert(site_id, None);

        Ok(())
    }

    async fn load_session_for_site(
        &self,
        site_id: &str,
    ) -> Result<Option<StoredSession>, AppError> {
        if let Some(cached) = self.session_cache.read().await.get(site_id).cloned() {
            return Ok(cached);
        }

        let backend = self.backend.clone();
        let site_id = site_id.to_string();
        let backend_site_id = site_id.clone();
        let loaded = tokio::task::spawn_blocking(move || match backend {
            TokenStoreBackend::Keychain { service_name } => {
                load_keychain_session(&format!("{service_name}:site:{backend_site_id}"))
            }
            TokenStoreBackend::File {
                repository,
                legacy_path,
                sessions_dir,
            } => load_file_backed_session(
                repository.as_ref(),
                &legacy_path,
                &sessions_dir,
                &backend_site_id,
            ),
        })
        .await
        .map_err(|error| AppError::TokenStore {
            operation: format!("load_session_join:{}", self.backend_label()),
            error: error.to_string(),
        })??;

        self.session_cache
            .write()
            .await
            .insert(site_id, loaded.clone());

        Ok(loaded)
    }

    async fn save_session_for_site(
        &self,
        site_id: &str,
        session: &StoredSession,
    ) -> Result<(), AppError> {
        let backend = self.backend.clone();
        let site_id = site_id.to_string();
        let backend_site_id = site_id.clone();
        let session = session.clone();
        let cached_session = session.clone();
        tokio::task::spawn_blocking(move || match backend {
            TokenStoreBackend::Keychain { service_name } => {
                save_keychain_session(&format!("{service_name}:site:{backend_site_id}"), &session)
            }
            TokenStoreBackend::File {
                repository,
                legacy_path,
                sessions_dir,
            } => {
                repository.save_site_session(&backend_site_id, &session)?;
                clear_legacy_session_files(&legacy_path, &sessions_dir, &backend_site_id)
            }
        })
        .await
        .map_err(|error| AppError::TokenStore {
            operation: format!("save_session_join:{}", self.backend_label()),
            error: error.to_string(),
        })??;

        self.session_cache
            .write()
            .await
            .insert(site_id, Some(cached_session));

        Ok(())
    }

    fn backend_target_for_site(&self, site_id: Option<&str>) -> String {
        match &self.backend {
            TokenStoreBackend::Keychain { service_name } => site_id
                .map(|value| format!("{service_name}:site:{value}"))
                .unwrap_or_else(|| service_name.clone()),
            TokenStoreBackend::File {
                repository,
                legacy_path,
                ..
            } => site_id
                .map(|value| repository.describe_site_session_target(value))
                .unwrap_or_else(|| legacy_path.display().to_string()),
        }
    }
}

fn load_file_backed_session(
    repository: &(dyn FileSessionRepository + Send + Sync),
    legacy_path: &Path,
    sessions_dir: &Path,
    site_id: &str,
) -> Result<Option<StoredSession>, AppError> {
    if let Some(stored) = repository.load_site_session(site_id)? {
        return Ok(Some(stored));
    }

    let site_session_path = file_path_for_site(sessions_dir, site_id);
    let legacy_session = if site_session_path.exists() {
        load_file_session(&site_session_path)?
    } else if legacy_path.exists() {
        load_file_session(legacy_path)?
    } else {
        None
    };

    if let Some(session) = legacy_session {
        repository.save_site_session(site_id, &session)?;
        clear_legacy_session_files(legacy_path, sessions_dir, site_id)?;
        return Ok(Some(session));
    }

    Ok(None)
}

fn clear_legacy_session_files(
    legacy_path: &Path,
    sessions_dir: &Path,
    site_id: &str,
) -> Result<(), AppError> {
    let site_session_path = file_path_for_site(sessions_dir, site_id);
    clear_file_session(&site_session_path)?;
    if legacy_path != site_session_path.as_path() {
        clear_file_session(legacy_path)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex, MutexGuard, OnceLock};
    use uuid::Uuid;

    const TEST_SESSION_STORE_PATH_ENV_KEY: &str = "G5_SESSION_STORE_PATH";

    struct EnvGuard {
        _lock: MutexGuard<'static, ()>,
        key: &'static str,
        previous: Option<String>,
    }

    impl EnvGuard {
        fn set(key: &'static str, value: Option<&str>) -> Self {
            let lock = test_env_lock().lock().expect("test env mutex should lock");
            let previous = std::env::var(key).ok();
            match value {
                Some(next) => std::env::set_var(key, next),
                None => std::env::remove_var(key),
            }
            Self {
                _lock: lock,
                key,
                previous,
            }
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

    fn sample_session() -> StoredSession {
        StoredSession::new("admin", "access-token", "refresh-token", 3600)
    }

    fn unique_temp_dir(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!("g5-admin-{name}-{}", Uuid::new_v4()))
    }

    #[derive(Default)]
    struct TestSessionRepository {
        sessions: Mutex<HashMap<String, StoredSession>>,
    }

    impl FileSessionRepository for TestSessionRepository {
        fn load_site_session(&self, site_id: &str) -> Result<Option<StoredSession>, AppError> {
            Ok(self
                .sessions
                .lock()
                .map_err(test_lock_error)?
                .get(site_id)
                .cloned())
        }

        fn save_site_session(
            &self,
            site_id: &str,
            session: &StoredSession,
        ) -> Result<(), AppError> {
            self.sessions
                .lock()
                .map_err(test_lock_error)?
                .insert(site_id.to_string(), session.clone());
            Ok(())
        }

        fn clear_site_session(&self, site_id: &str) -> Result<(), AppError> {
            self.sessions
                .lock()
                .map_err(test_lock_error)?
                .remove(site_id);
            Ok(())
        }

        fn describe_site_session_target(&self, site_id: &str) -> String {
            format!("memory#site-session:{site_id}")
        }
    }

    fn test_lock_error<T>(error: std::sync::PoisonError<T>) -> AppError {
        AppError::Storage {
            target: "test_session_repository".to_string(),
            error: error.to_string(),
        }
    }

    fn test_repository() -> Arc<dyn FileSessionRepository> {
        Arc::new(TestSessionRepository::default())
    }

    fn insert_test_site() -> String {
        "site-alpha".to_string()
    }

    fn test_env_lock() -> &'static Mutex<()> {
        static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        LOCK.get_or_init(|| Mutex::new(()))
    }

    #[tokio::test]
    async fn load_session_uses_cached_value_after_first_backend_read() {
        let temp_dir = unique_temp_dir("token-store-cache");
        std::fs::create_dir_all(&temp_dir).expect("temp dir should exist");
        let session_store_path = temp_dir.join("session.json");
        let session_store_path_str = session_store_path.display().to_string();
        let _guard = EnvGuard::set(
            TEST_SESSION_STORE_PATH_ENV_KEY,
            Some(&session_store_path_str),
        );
        let repository = test_repository();
        let site_id = insert_test_site();

        let store =
            TokenStore::from_runtime_settings(SessionStorageMode::File, Some(repository.clone()))
                .expect("token store should initialize");
        store.set_active_site_id(Some(site_id.clone())).await;

        let session = sample_session();
        repository
            .save_site_session(&site_id, &session)
            .expect("db session should persist");

        let loaded = store
            .load_session()
            .await
            .expect("first load should succeed")
            .expect("session should exist");
        assert_eq!(loaded.mb_id, session.mb_id);
        assert_eq!(loaded.access_token, session.access_token);
        assert_eq!(loaded.refresh_token, session.refresh_token);
        assert_eq!(loaded.expires_in, session.expires_in);

        repository
            .clear_site_session(&site_id)
            .expect("db session should clear");

        let cached = store
            .load_session()
            .await
            .expect("cached load should succeed")
            .expect("cached session should exist");
        assert_eq!(cached.mb_id, session.mb_id);
        assert_eq!(cached.access_token, session.access_token);
        assert_eq!(cached.refresh_token, session.refresh_token);
        assert_eq!(cached.expires_in, session.expires_in);

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[tokio::test]
    async fn clear_session_resets_cached_value() {
        let temp_dir = unique_temp_dir("token-store-clear-cache");
        std::fs::create_dir_all(&temp_dir).expect("temp dir should exist");
        let session_store_path = temp_dir.join("session.json");
        let session_store_path_str = session_store_path.display().to_string();
        let _guard = EnvGuard::set(
            TEST_SESSION_STORE_PATH_ENV_KEY,
            Some(&session_store_path_str),
        );
        let repository = test_repository();
        let site_id = insert_test_site();

        let store =
            TokenStore::from_runtime_settings(SessionStorageMode::File, Some(repository.clone()))
                .expect("token store should initialize");
        store.set_active_site_id(Some(site_id.clone())).await;

        let session = sample_session();
        store
            .save_session(&session)
            .await
            .expect("session save should succeed");
        let loaded = store
            .load_session()
            .await
            .expect("session load should succeed")
            .expect("session should exist");
        assert_eq!(loaded.mb_id, session.mb_id);
        assert_eq!(loaded.access_token, session.access_token);
        assert_eq!(loaded.refresh_token, session.refresh_token);
        assert_eq!(loaded.expires_in, session.expires_in);

        store
            .clear_session()
            .await
            .expect("session clear should succeed");

        assert!(
            store
                .load_session()
                .await
                .expect("cleared session should stay empty")
                .is_none(),
            "cleared session should stay empty"
        );
        assert!(
            repository
                .load_site_session(&site_id)
                .expect("db session should load")
                .is_none(),
            "cleared session should be removed from db"
        );

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[tokio::test]
    async fn load_session_migrates_legacy_file_into_local_database() {
        let temp_dir = unique_temp_dir("token-store-migrate-legacy");
        std::fs::create_dir_all(&temp_dir).expect("temp dir should exist");
        let session_store_path = temp_dir.join("session.json");
        let session_store_path_str = session_store_path.display().to_string();
        let _guard = EnvGuard::set(
            TEST_SESSION_STORE_PATH_ENV_KEY,
            Some(&session_store_path_str),
        );
        let repository = test_repository();
        let site_id = insert_test_site();

        let store =
            TokenStore::from_runtime_settings(SessionStorageMode::File, Some(repository.clone()))
                .expect("token store should initialize");
        store.set_active_site_id(Some(site_id.clone())).await;

        let session = sample_session();
        backend::save_file_session(&session_store_path, &session)
            .expect("legacy session file should persist");

        let loaded = store
            .load_session()
            .await
            .expect("legacy session load should succeed")
            .expect("session should migrate");
        assert_eq!(loaded.access_token, session.access_token);
        assert_eq!(loaded.refresh_token, session.refresh_token);
        assert_eq!(loaded.expires_in, session.expires_in);
        assert_eq!(loaded.mb_id, session.mb_id);
        assert!(
            !session_store_path.exists(),
            "legacy file should be removed after migration"
        );
        let migrated = repository
            .load_site_session(&site_id)
            .expect("db session should load")
            .expect("db session should exist");
        assert_eq!(migrated.access_token, session.access_token);
        assert_eq!(migrated.refresh_token, session.refresh_token);

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
