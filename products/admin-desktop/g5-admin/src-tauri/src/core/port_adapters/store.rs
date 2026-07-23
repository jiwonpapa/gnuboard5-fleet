use crate::core::ports::{
    AppLockState, BackupImportReport, BackupStorePort, SecurityStorePort, SessionStorePort,
    SiteActivityLogRecord, SiteCatalogInsertInput, SiteCatalogStorePort, SiteCatalogUpdateInput,
    SiteRecord, SshProfileConnectionTarget, SshProfileInsertInput, SshProfileRecord,
    SshProfileStorePort, SshProfileUpdateRecord, StoredSessionRecord,
};
use crate::core::store_records::{
    model_session_from_record, session_record_from_model, site_insert_from_port,
    site_update_from_port, ssh_connection_profile_from_record, ssh_profile_insert_from_port,
    ssh_profile_update_from_port,
};
use crate::db::{BackupImportSummary, SiteRepository};
use crate::error::AppError;
use crate::token_store::{model_session_from_token, token_session_from_model, TokenStore};
use std::path::Path;

#[derive(Clone)]
pub(crate) struct SessionStorePortAdapter {
    inner: TokenStore,
}

impl SessionStorePortAdapter {
    pub(crate) fn new(inner: TokenStore) -> Self {
        Self { inner }
    }
}

#[derive(Clone)]
pub(crate) struct SiteRepositoryPortAdapter {
    inner: SiteRepository,
}

impl SiteRepositoryPortAdapter {
    pub(crate) fn new(inner: SiteRepository) -> Self {
        Self { inner }
    }
}

#[async_trait::async_trait]
impl SessionStorePort for SessionStorePortAdapter {
    async fn load_active_site_session(&self) -> Result<Option<StoredSessionRecord>, AppError> {
        Ok(TokenStore::load_session(&self.inner)
            .await?
            .map(|session| session_record_from_model(model_session_from_token(&session))))
    }

    async fn save_active_site_session(
        &self,
        session: &StoredSessionRecord,
    ) -> Result<(), AppError> {
        let model_session = model_session_from_record(session);
        Ok(TokenStore::save_session(&self.inner, &token_session_from_model(model_session)).await?)
    }

    async fn clear_active_site_session(&self) -> Result<(), AppError> {
        Ok(TokenStore::clear_session(&self.inner).await?)
    }

    async fn clear_session_for_site(&self, site_id: &str) -> Result<(), AppError> {
        Ok(TokenStore::clear_session_for_site(&self.inner, site_id).await?)
    }

    async fn set_active_site_id(&self, site_id: Option<String>) {
        TokenStore::set_active_site_id(&self.inner, site_id).await
    }

    async fn active_site_id(&self) -> Option<String> {
        TokenStore::active_site_id(&self.inner).await
    }
}

impl SiteCatalogStorePort for SiteRepositoryPortAdapter {
    fn load_sites(&self) -> Result<Vec<SiteRecord>, AppError> {
        Ok(SiteRepository::load_sites(&self.inner)?)
    }

    fn insert_site(&self, input: SiteCatalogInsertInput) -> Result<SiteRecord, AppError> {
        Ok(SiteRepository::insert_site(
            &self.inner,
            site_insert_from_port(input),
        )?)
    }

    fn update_site(&self, input: SiteCatalogUpdateInput) -> Result<SiteRecord, AppError> {
        Ok(SiteRepository::update_site(
            &self.inner,
            site_update_from_port(input),
        )?)
    }

    fn delete_site(&self, site_id: &str) -> Result<(), AppError> {
        Ok(SiteRepository::delete_site(&self.inner, site_id)?)
    }

    fn site_has_session_hint(&self, site_id: &str) -> Result<bool, AppError> {
        Ok(SiteRepository::site_has_session_hint(&self.inner, site_id)?)
    }

    fn set_site_session_hint(&self, site_id: &str, has_session: bool) -> Result<(), AppError> {
        Ok(SiteRepository::set_site_session_hint(
            &self.inner,
            site_id,
            has_session,
        )?)
    }

    fn add_activity(
        &self,
        site_id: Option<&str>,
        action: &str,
        detail: Option<&str>,
    ) -> Result<(), AppError> {
        Ok(SiteRepository::add_activity(
            &self.inner,
            site_id,
            action,
            detail,
        )?)
    }

    fn list_activity(
        &self,
        site_id: Option<&str>,
        limit: usize,
    ) -> Result<Vec<SiteActivityLogRecord>, AppError> {
        Ok(SiteRepository::list_activity(&self.inner, site_id, limit)?)
    }
}

impl SshProfileStorePort for SiteRepositoryPortAdapter {
    fn load_ssh_profiles(&self, site_id: &str) -> Result<Vec<SshProfileRecord>, AppError> {
        Ok(SiteRepository::load_ssh_profiles(&self.inner, site_id)?)
    }

    fn load_ssh_profile_connection_target(
        &self,
        site_id: &str,
        ssh_profile_id: &str,
    ) -> Result<SshProfileConnectionTarget, AppError> {
        let record = SiteRepository::load_ssh_profile_connection_record(
            &self.inner,
            site_id,
            ssh_profile_id,
        )?;
        Ok(SshProfileConnectionTarget {
            profile: ssh_connection_profile_from_record(record.profile),
            password: record.password,
            key_passphrase: record.key_passphrase,
        })
    }

    fn insert_ssh_profile(
        &self,
        input: SshProfileInsertInput,
    ) -> Result<SshProfileRecord, AppError> {
        Ok(SiteRepository::insert_ssh_profile(
            &self.inner,
            ssh_profile_insert_from_port(input),
        )?)
    }

    fn update_ssh_profile(
        &self,
        input: SshProfileUpdateRecord,
    ) -> Result<SshProfileRecord, AppError> {
        Ok(SiteRepository::update_ssh_profile(
            &self.inner,
            ssh_profile_update_from_port(input),
        )?)
    }

    fn delete_ssh_profile(&self, site_id: &str, ssh_profile_id: &str) -> Result<(), AppError> {
        Ok(SiteRepository::delete_ssh_profile(
            &self.inner,
            site_id,
            ssh_profile_id,
        )?)
    }
}

impl SecurityStorePort for SiteRepositoryPortAdapter {
    fn load_app_lock(&self) -> Result<Option<AppLockState>, AppError> {
        Ok(
            SiteRepository::load_app_lock(&self.inner)?.map(|record| AppLockState {
                passkey_enabled: record.passkey_enabled,
            }),
        )
    }

    fn create_app_lock(&self, password: &str) -> Result<AppLockState, AppError> {
        let record = SiteRepository::create_app_lock(&self.inner, password)?;
        Ok(AppLockState {
            passkey_enabled: record.passkey_enabled,
        })
    }

    fn verify_app_lock(&self, password: &str) -> Result<bool, AppError> {
        Ok(SiteRepository::verify_app_lock(&self.inner, password)?)
    }

    fn update_app_lock_password(&self, password: &str) -> Result<AppLockState, AppError> {
        let record = SiteRepository::update_app_lock_password(&self.inner, password)?;
        Ok(AppLockState {
            passkey_enabled: record.passkey_enabled,
        })
    }

    fn fast_unlock_enabled(&self) -> Result<bool, AppError> {
        Ok(SiteRepository::fast_unlock_enabled(&self.inner)?)
    }

    fn store_fast_unlock_verifier(&self, secret: &str) -> Result<(), AppError> {
        Ok(SiteRepository::store_fast_unlock_verifier(
            &self.inner,
            secret,
        )?)
    }

    fn verify_fast_unlock_secret(&self, secret: &str) -> Result<bool, AppError> {
        Ok(SiteRepository::verify_fast_unlock_secret(
            &self.inner,
            secret,
        )?)
    }

    fn clear_fast_unlock_verifier(&self) -> Result<(), AppError> {
        Ok(SiteRepository::clear_fast_unlock_verifier(&self.inner)?)
    }

    fn get_app_setting(&self, key: &str) -> Result<Option<String>, AppError> {
        Ok(SiteRepository::get_app_setting(&self.inner, key)?)
    }

    fn set_app_setting(&self, key: &str, value: &str) -> Result<(), AppError> {
        Ok(SiteRepository::set_app_setting(&self.inner, key, value)?)
    }

    fn delete_app_setting(&self, key: &str) -> Result<(), AppError> {
        Ok(SiteRepository::delete_app_setting(&self.inner, key)?)
    }

    fn load_totp_secret(&self) -> Result<Option<String>, AppError> {
        Ok(SiteRepository::load_totp_secret(&self.inner)?)
    }

    fn store_totp_secret(&self, secret: &str) -> Result<(), AppError> {
        Ok(SiteRepository::store_totp_secret(&self.inner, secret)?)
    }

    fn clear_totp_secret(&self) -> Result<(), AppError> {
        Ok(SiteRepository::clear_totp_secret(&self.inner)?)
    }
}

impl BackupStorePort for SiteRepositoryPortAdapter {
    fn export_backup(
        &self,
        destination_path: &Path,
        backup_password: &str,
    ) -> Result<(u64, usize), AppError> {
        Ok(SiteRepository::export_backup(
            &self.inner,
            destination_path,
            backup_password,
        )?)
    }

    fn import_backup(
        &self,
        source_path: &Path,
        backup_password: &str,
    ) -> Result<BackupImportReport, AppError> {
        let summary: BackupImportSummary =
            SiteRepository::import_backup(&self.inner, source_path, backup_password)?;
        Ok(BackupImportReport {
            imported_site_count: summary.imported_site_count,
            reused_site_count: summary.reused_site_count,
            copied_setting_count: summary.copied_setting_count,
        })
    }
}
