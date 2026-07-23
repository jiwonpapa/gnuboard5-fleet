use super::super::sftp_transfer_queue::SftpTransferQueueHost;
use super::super::{AppState, APP_SETTING_TOTP_ENABLED};
use crate::api_client::ApiClient;
use crate::core::port_adapters::{
    AdminApiPortAdapter, SessionStorePortAdapter, SiteRepositoryPortAdapter, SshClientPortAdapter,
};
use crate::db::{DatabaseConfig, SiteRepository};
use crate::runtime_config::{
    DatabaseMasterStorageMode, DevBootstrapConfig, DevBootstrapSiteAuthConfig,
    DevBootstrapSiteConfig, DevBootstrapSshProfileConfig, RuntimeConfig, RuntimeSshAuthType,
    SessionStorageMode,
};
use crate::site_manager::SiteManager;
use crate::token_store::{SiteSessionRepository, TokenStore};
use g5_admin_ssh::SshClient;
use g5_admin_ssh_terminal_bridge::SshTerminalBridgeHost;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

pub(super) const TOTP_ENABLED_KEY: &str = APP_SETTING_TOTP_ENABLED;
pub(super) const TEST_TOTP_SECRET: &str = "OBWGC2LOFVZXI4TJNZTS243FMNZGK5BNGEZDG";

pub(super) fn current_test_totp_code() -> String {
    g5_admin_security_core::generate_current_totp_code(TEST_TOTP_SECRET, "G5Admin", "local-master")
        .expect("test totp should generate")
}

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

fn unique_temp_dir(name: &str) -> PathBuf {
    std::env::temp_dir().join(format!("g5-admin-{name}-{}", Uuid::new_v4()))
}

pub(super) fn prepare_temp_dir(name: &str) -> (PathBuf, EnvGuard) {
    let temp_dir = unique_temp_dir(name);
    fs::create_dir_all(&temp_dir).expect("temp dir should be created");
    let session_store_path = temp_dir.join("session.json");
    let session_store_path_str = session_store_path.display().to_string();
    let session_guard = EnvGuard::set("G5_SESSION_STORE_PATH", Some(&session_store_path_str));
    (temp_dir, session_guard)
}

pub(super) fn cleanup_temp_dir(path: &Path) {
    let _ = fs::remove_dir_all(path);
}

pub(super) fn test_database_config(path: PathBuf) -> DatabaseConfig {
    DatabaseConfig::for_test(path, false, "test-master-key")
}

pub(super) fn file_runtime_config(legacy_api_base_url: Option<&str>) -> RuntimeConfig {
    RuntimeConfig {
        legacy_api_base_url: legacy_api_base_url.map(ToOwned::to_owned),
        debug_overlay: false,
        session_storage: SessionStorageMode::File,
        db_master_storage: DatabaseMasterStorageMode::File,
        dev_bootstrap: None,
    }
}

pub(super) fn file_runtime_config_with_dev_bootstrap() -> RuntimeConfig {
    RuntimeConfig {
        legacy_api_base_url: None,
        debug_overlay: true,
        session_storage: SessionStorageMode::File,
        db_master_storage: DatabaseMasterStorageMode::File,
        dev_bootstrap: Some(DevBootstrapConfig {
            master_password: Some("dev-master".to_string()),
            site: Some(DevBootstrapSiteConfig {
                name: "개발 사이트".to_string(),
                api_base_url: "https://dev.example.com/api/v1".to_string(),
            }),
            site_auth: None,
            ssh_profiles: vec![DevBootstrapSshProfileConfig {
                name: "개발 SSH".to_string(),
                host: "ssh.dev.example.com".to_string(),
                port: 22,
                username: "deploy".to_string(),
                auth_type: RuntimeSshAuthType::Password,
                key_path: None,
                password: Some("ssh-secret".to_string()),
                key_passphrase: None,
            }],
        }),
    }
}

pub(super) fn file_runtime_config_with_dev_bootstrap_and_site_auth(
    api_base_url: &str,
) -> RuntimeConfig {
    RuntimeConfig {
        legacy_api_base_url: None,
        debug_overlay: true,
        session_storage: SessionStorageMode::File,
        db_master_storage: DatabaseMasterStorageMode::File,
        dev_bootstrap: Some(DevBootstrapConfig {
            master_password: Some("dev-master".to_string()),
            site: Some(DevBootstrapSiteConfig {
                name: "개발 사이트".to_string(),
                api_base_url: api_base_url.to_string(),
            }),
            site_auth: Some(DevBootstrapSiteAuthConfig {
                mb_id: "dev_admin".to_string(),
                mb_password: "dev-password".to_string(),
            }),
            ssh_profiles: vec![DevBootstrapSshProfileConfig {
                name: "개발 SSH".to_string(),
                host: "ssh.dev.example.com".to_string(),
                port: 22,
                username: "deploy".to_string(),
                auth_type: RuntimeSshAuthType::Password,
                key_path: None,
                password: Some("ssh-secret".to_string()),
                key_passphrase: None,
            }],
        }),
    }
}

pub(super) fn build_state_with_api_client(
    runtime_config: RuntimeConfig,
    site_repository: SiteRepository,
    site_manager: SiteManager,
    master_unlocked: bool,
    api_client: ApiClient,
) -> AppState {
    let token_store = TokenStore::from_runtime_settings(
        runtime_config.session_storage,
        Some(Arc::new(SiteSessionRepository::new(
            site_repository.clone(),
        ))),
    )
    .expect("token store should initialize");

    AppState {
        admin_api: AdminApiPortAdapter::new(api_client.transport().clone()),
        api_client,
        runtime_config,
        ssh_client: SshClientPortAdapter::new(SshClient::new()),
        session_store: SessionStorePortAdapter::new(token_store.clone()),
        token_store,
        store_ports: SiteRepositoryPortAdapter::new(site_repository.clone()),
        site_repository,
        site_manager: Arc::new(RwLock::new(site_manager)),
        active_request_context: Arc::new(RwLock::new(
            super::super::active_request_context::ActiveApiContext::default(),
        )),
        sites_initialized: Arc::new(RwLock::new(true)),
        master_unlocked: Arc::new(RwLock::new(master_unlocked)),
        pending_totp_unlock: Arc::new(RwLock::new(false)),
        ssh_sessions: Arc::new(RwLock::new(std::collections::HashMap::new())),
        sftp_transfer_host: Arc::new(SftpTransferQueueHost::new()),
        ssh_terminal_bridge: Arc::new(SshTerminalBridgeHost::new()),
        app_handle: Arc::new(std::sync::RwLock::new(None)),
    }
}

pub(super) fn build_state(
    runtime_config: RuntimeConfig,
    site_repository: SiteRepository,
    site_manager: SiteManager,
    master_unlocked: bool,
) -> AppState {
    build_state_with_api_client(
        runtime_config,
        site_repository,
        site_manager,
        master_unlocked,
        ApiClient::new(None::<String>).expect("api client"),
    )
}
