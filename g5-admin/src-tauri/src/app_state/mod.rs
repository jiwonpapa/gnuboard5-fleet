use crate::api_client::ApiClient;
use crate::core::port_adapters::{
    AdminApiPortAdapter, SessionStorePortAdapter, SiteRepositoryPortAdapter, SshClientPortAdapter,
};
use crate::core::ports::{
    AdminApiPort, BackupImportReport, BackupStorePort, SecurityStorePort, SessionStorePort,
    SiteCatalogInsertInput, SiteCatalogStorePort, SiteCatalogUpdateInput, SshHostVerificationPort,
    SshProfileStorePort, SshSessionConnectorPort,
};
use crate::db::SiteRepository;
use crate::error::AppError;
use crate::runtime_config::RuntimeConfig;
use crate::site_manager::SiteManager;
use crate::token_store::TokenStore;
use g5_admin_models::models::master_lock::{
    MasterLockSetupInput, MasterLockStatus, MasterLockTotpInput, MasterLockUnlockInput,
};
use g5_admin_models::models::security::{
    MasterPasswordChangeInput, SecurityIdleTimeoutUpdateInput, SecuritySettings, TotpDisableInput,
    TotpEnrollmentChallenge, TotpSetupStartInput, TotpVerifyEnableInput,
};
use g5_admin_models::models::site::{
    Site, SiteActivityListResponse, SiteAddInput, SiteCatalog, SiteCatalogEntry, SiteDeleteInput,
    SiteSessionStatus, SiteUpdateInput,
};
#[cfg(test)]
use g5_admin_models::models::ssh::{
    SshProfileAddInput, SshProfileDeleteInput, SshProfileListResponse, SshProfileUpdateInput,
};
use g5_admin_models::models::trace::ResponseTrace;
use g5_admin_ssh::SshClient;
use g5_admin_ssh_terminal_bridge::SshTerminalBridgeHost;
use std::collections::HashMap;
use std::sync::{Arc, RwLock as StdRwLock};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;
use tokio::sync::RwLock;

mod access_gates;
mod active_request_context;
mod dependencies;
mod dev_bootstrap_service;
mod master_lock;
mod master_lock_service;
mod security;
mod security_settings_service;
mod service_factories;
mod session_service;
mod sftp_chmod_service;
mod sftp_copy_service;
mod sftp_delete_service;
mod sftp_download_service;
mod sftp_mkdir_service;
mod sftp_move_service;
mod sftp_service;
mod sftp_support;
mod sftp_transfer_ops;
mod sftp_transfer_queue;
mod sftp_transfer_service;
mod sftp_upload_service;
mod sftp_write_service;
mod site_catalog_service;
mod sites;
mod ssh_host_verification_service;
mod ssh_profile_service;
#[cfg(test)]
mod ssh_profiles;
mod ssh_runtime;
mod ssh_session_service;
mod ssh_terminal_bridge;
mod ssh_terminal_bridge_service;
use sftp_transfer_queue::SftpTransferQueueHost;
use ssh_runtime::ActiveSshSession;

const APP_SETTING_IDLE_TIMEOUT_MINUTES: &str = "security.idle_timeout_minutes";
const APP_SETTING_TOTP_ENABLED: &str = "security.totp_enabled";
const APP_SETTING_TOTP_ENROLLED_AT: &str = "security.totp_enrolled_at";
const APP_SETTING_UNLOCK_FAILED_ATTEMPTS: &str = "security.unlock_failed_attempts";
const APP_SETTING_UNLOCK_LOCKED_UNTIL_EPOCH: &str = "security.unlock_locked_until_epoch";
const BASE_UNLOCK_LOCKOUT_SECONDS: u64 = 300;
const MAX_UNLOCK_LOCKOUT_SECONDS: u64 = 3_600;
const TOTP_ISSUER: &str = "G5Admin";
const TOTP_ACCOUNT_NAME: &str = "local-master";

pub struct AppStateDependencies {
    pub api_client: ApiClient,
    pub runtime_config: RuntimeConfig,
    pub ssh_client: SshClient,
    pub token_store: TokenStore,
    pub site_repository: SiteRepository,
    pub site_manager: SiteManager,
}

#[derive(Clone)]
pub struct AppState {
    pub api_client: ApiClient,
    admin_api: AdminApiPortAdapter,
    pub runtime_config: RuntimeConfig,
    ssh_client: SshClientPortAdapter,
    pub token_store: TokenStore,
    session_store: SessionStorePortAdapter,
    site_repository: SiteRepository,
    store_ports: SiteRepositoryPortAdapter,
    site_manager: Arc<RwLock<SiteManager>>,
    active_request_context: Arc<RwLock<active_request_context::ActiveApiContext>>,
    sites_initialized: Arc<RwLock<bool>>,
    master_unlocked: Arc<RwLock<bool>>,
    pending_totp_unlock: Arc<RwLock<bool>>,
    ssh_sessions: Arc<RwLock<HashMap<String, ActiveSshSession>>>,
    sftp_transfer_host: Arc<SftpTransferQueueHost>,
    ssh_terminal_bridge: Arc<SshTerminalBridgeHost>,
    app_handle: Arc<StdRwLock<Option<AppHandle>>>,
}

impl AppState {
    pub fn from_dependencies(dependencies: AppStateDependencies) -> Self {
        let api_client = dependencies.api_client;
        let token_store = dependencies.token_store;
        let site_repository = dependencies.site_repository;
        Self {
            admin_api: AdminApiPortAdapter::new(api_client.transport().clone()),
            api_client,
            runtime_config: dependencies.runtime_config,
            ssh_client: SshClientPortAdapter::new(dependencies.ssh_client),
            session_store: SessionStorePortAdapter::new(token_store.clone()),
            token_store,
            store_ports: SiteRepositoryPortAdapter::new(site_repository.clone()),
            site_repository,
            site_manager: Arc::new(RwLock::new(dependencies.site_manager)),
            active_request_context: Arc::new(RwLock::new(
                active_request_context::ActiveApiContext::default(),
            )),
            sites_initialized: Arc::new(RwLock::new(false)),
            master_unlocked: Arc::new(RwLock::new(false)),
            pending_totp_unlock: Arc::new(RwLock::new(false)),
            ssh_sessions: Arc::new(RwLock::new(HashMap::new())),
            sftp_transfer_host: Arc::new(SftpTransferQueueHost::new()),
            ssh_terminal_bridge: Arc::new(SshTerminalBridgeHost::new()),
            app_handle: Arc::new(StdRwLock::new(None)),
        }
    }

    pub fn from_env() -> Result<Self, AppError> {
        Ok(Self::from_dependencies(AppStateDependencies::from_env()?))
    }

    pub fn admin_api(&self) -> &(dyn AdminApiPort + Send + Sync) {
        &self.admin_api
    }

    pub(super) fn session_store(&self) -> &(dyn SessionStorePort + Send + Sync) {
        &self.session_store
    }

    pub(super) fn site_catalog_store(&self) -> &(dyn SiteCatalogStorePort + Send + Sync) {
        &self.store_ports
    }

    pub(super) fn security_store(&self) -> &(dyn SecurityStorePort + Send + Sync) {
        &self.store_ports
    }

    pub(super) fn ssh_profile_store(&self) -> &(dyn SshProfileStorePort + Send + Sync) {
        &self.store_ports
    }

    pub(super) fn ssh_connector(&self) -> &(dyn SshSessionConnectorPort + Send + Sync) {
        &self.ssh_client
    }

    pub(super) fn ssh_host_verifier(&self) -> &(dyn SshHostVerificationPort + Send + Sync) {
        &self.ssh_client
    }

    pub(super) fn backup_store(&self) -> &(dyn BackupStorePort + Send + Sync) {
        &self.store_ports
    }

    async fn ensure_master_unlocked(&self) -> Result<(), AppError> {
        if self.site_repository.load_app_lock()?.is_none() {
            return Err(AppError::Auth {
                message: "앱 잠금이 아직 설정되지 않았습니다.".to_string(),
            });
        }

        if !*self.master_unlocked.read().await {
            return Err(AppError::Auth {
                message: "앱 잠금이 해제되지 않았습니다.".to_string(),
            });
        }

        Ok(())
    }

    pub fn database_path(&self) -> String {
        self.site_repository.config().path.display().to_string()
    }

    pub fn set_app_handle(&self, app_handle: AppHandle) {
        if let Ok(mut current) = self.app_handle.write() {
            *current = Some(app_handle);
        }
    }

    pub(super) fn current_app_handle(&self) -> Option<AppHandle> {
        self.app_handle
            .read()
            .ok()
            .and_then(|current| current.clone())
    }

    pub(super) fn ssh_terminal_bridge(&self) -> Arc<SshTerminalBridgeHost> {
        self.ssh_terminal_bridge.clone()
    }
}

#[cfg(test)]
mod tests;
