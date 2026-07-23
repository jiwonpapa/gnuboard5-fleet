use super::sftp_support::SftpAccessGate;
use super::site_catalog_service::SiteCatalogAccessGate;
use super::ssh_host_verification_service::SshHostVerificationAccessGate;
use super::ssh_profile_service::SshProfileAccessGate;
use super::ssh_session_service::SshSessionAccessGate;
use super::ssh_terminal_bridge_service::SshTerminalBridgeAccessGate;
use super::AppState;
use crate::error::AppError;

#[async_trait::async_trait]
impl SiteCatalogAccessGate for AppState {
    async fn require_unlocked(&self) -> Result<(), AppError> {
        self.ensure_master_unlocked().await
    }

    fn authorize_sensitive_action(
        &self,
        current_password: &str,
        current_totp_code: Option<&str>,
    ) -> Result<(), AppError> {
        self.verify_sensitive_action(current_password, current_totp_code)
    }
}

#[async_trait::async_trait]
impl SshProfileAccessGate for AppState {
    async fn require_unlocked(&self) -> Result<(), AppError> {
        self.ensure_master_unlocked().await
    }
}

#[async_trait::async_trait]
impl SshSessionAccessGate for AppState {
    async fn require_unlocked(&self) -> Result<(), AppError> {
        self.ensure_master_unlocked().await
    }
}

#[async_trait::async_trait]
impl SshTerminalBridgeAccessGate for AppState {
    async fn require_unlocked(&self) -> Result<(), AppError> {
        self.ensure_master_unlocked().await
    }
}

#[async_trait::async_trait]
impl SshHostVerificationAccessGate for AppState {
    async fn require_unlocked(&self) -> Result<(), AppError> {
        self.ensure_master_unlocked().await
    }
}

#[async_trait::async_trait]
impl SftpAccessGate for AppState {
    async fn require_unlocked(&self) -> Result<(), AppError> {
        self.ensure_master_unlocked().await
    }
}
