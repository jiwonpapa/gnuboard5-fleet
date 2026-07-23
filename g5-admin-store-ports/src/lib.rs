use g5_admin_app_error::AppError;
use g5_admin_port_types::SshProfileConnectionTarget;
pub use g5_admin_port_types::{
    AppLockState, BackupImportReport, SiteActivityLogRecord, SiteCatalogInsertInput,
    SiteCatalogUpdateInput, SiteRecord, SshProfileAuthType, SshProfileInsertInput,
    SshProfileRecord, SshProfileUpdateRecord, StoredSessionRecord,
};
use std::path::Path;

#[async_trait::async_trait]
pub trait SessionStorePort: Send + Sync {
    async fn load_active_site_session(&self) -> Result<Option<StoredSessionRecord>, AppError>;
    async fn save_active_site_session(&self, session: &StoredSessionRecord)
        -> Result<(), AppError>;
    async fn clear_active_site_session(&self) -> Result<(), AppError>;
    async fn clear_session_for_site(&self, site_id: &str) -> Result<(), AppError>;
    async fn set_active_site_id(&self, site_id: Option<String>);
    async fn active_site_id(&self) -> Option<String>;
}

pub trait SiteCatalogStorePort: Send + Sync {
    fn load_sites(&self) -> Result<Vec<SiteRecord>, AppError>;
    fn insert_site(&self, input: SiteCatalogInsertInput) -> Result<SiteRecord, AppError>;
    fn update_site(&self, input: SiteCatalogUpdateInput) -> Result<SiteRecord, AppError>;
    fn delete_site(&self, site_id: &str) -> Result<(), AppError>;
    fn site_has_session_hint(&self, site_id: &str) -> Result<bool, AppError>;
    fn set_site_session_hint(&self, site_id: &str, has_session: bool) -> Result<(), AppError>;
    fn add_activity(
        &self,
        site_id: Option<&str>,
        action: &str,
        detail: Option<&str>,
    ) -> Result<(), AppError>;
    fn list_activity(
        &self,
        site_id: Option<&str>,
        limit: usize,
    ) -> Result<Vec<SiteActivityLogRecord>, AppError>;
}

pub trait SshProfileStorePort: Send + Sync {
    fn load_ssh_profiles(&self, site_id: &str) -> Result<Vec<SshProfileRecord>, AppError>;
    fn load_ssh_profile_connection_target(
        &self,
        site_id: &str,
        ssh_profile_id: &str,
    ) -> Result<SshProfileConnectionTarget, AppError>;
    fn insert_ssh_profile(
        &self,
        input: SshProfileInsertInput,
    ) -> Result<SshProfileRecord, AppError>;
    fn update_ssh_profile(
        &self,
        input: SshProfileUpdateRecord,
    ) -> Result<SshProfileRecord, AppError>;
    fn delete_ssh_profile(&self, site_id: &str, ssh_profile_id: &str) -> Result<(), AppError>;
}

pub trait SecurityStorePort: Send + Sync {
    fn load_app_lock(&self) -> Result<Option<AppLockState>, AppError>;
    fn create_app_lock(&self, password: &str) -> Result<AppLockState, AppError>;
    fn verify_app_lock(&self, password: &str) -> Result<bool, AppError>;
    fn update_app_lock_password(&self, password: &str) -> Result<AppLockState, AppError>;
    fn fast_unlock_enabled(&self) -> Result<bool, AppError>;
    fn store_fast_unlock_verifier(&self, secret: &str) -> Result<(), AppError>;
    fn verify_fast_unlock_secret(&self, secret: &str) -> Result<bool, AppError>;
    fn clear_fast_unlock_verifier(&self) -> Result<(), AppError>;
    fn get_app_setting(&self, key: &str) -> Result<Option<String>, AppError>;
    fn set_app_setting(&self, key: &str, value: &str) -> Result<(), AppError>;
    fn delete_app_setting(&self, key: &str) -> Result<(), AppError>;
    fn load_totp_secret(&self) -> Result<Option<String>, AppError>;
    fn store_totp_secret(&self, secret: &str) -> Result<(), AppError>;
    fn clear_totp_secret(&self) -> Result<(), AppError>;
}

pub trait BackupStorePort: Send + Sync {
    fn export_backup(
        &self,
        destination_path: &Path,
        backup_password: &str,
    ) -> Result<(u64, usize), AppError>;
    fn import_backup(
        &self,
        source_path: &Path,
        backup_password: &str,
    ) -> Result<BackupImportReport, AppError>;
}

#[cfg(test)]
mod tests;
