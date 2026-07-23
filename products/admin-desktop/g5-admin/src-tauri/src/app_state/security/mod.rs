use super::security_settings_service::{
    SecurityRestoreSiteSync, SecuritySettingsRuntime, SecuritySettingsService, SecurityTotpGuard,
    SecurityUnlockGate,
};
use super::*;

mod backup;
mod fast_unlock;
mod settings;
mod totp;

#[async_trait::async_trait]
impl SecurityUnlockGate for AppState {
    async fn confirm_unlocked(&self) -> Result<(), AppError> {
        self.ensure_master_unlocked().await
    }
}

impl SecurityTotpGuard for AppState {
    fn check_totp(&self, code: &str) -> Result<bool, AppError> {
        self.verify_totp_code(code)
    }
}

#[async_trait::async_trait]
impl SecurityRestoreSiteSync for AppState {
    async fn sync_restored_sites(
        &self,
        requested_active_site_id: Option<String>,
    ) -> Result<(), AppError> {
        self.site_catalog_service()
            .reload_sites(requested_active_site_id)
            .await
    }
}

impl AppState {
    pub(crate) fn security_settings_service(&self) -> SecuritySettingsService<'_> {
        SecuritySettingsService::new(
            self,
            self,
            self,
            self.security_store(),
            self.site_catalog_store(),
            self.backup_store(),
            SecuritySettingsRuntime::new(&self.site_manager, &self.pending_totp_unlock),
        )
    }

    pub(super) fn load_totp_enabled(&self) -> Result<bool, AppError> {
        self.security_settings_service().load_totp_enabled()
    }

    pub(super) fn verify_sensitive_action(
        &self,
        current_password: &str,
        current_totp_code: Option<&str>,
    ) -> Result<(), AppError> {
        self.security_settings_service()
            .confirm_security_factors(current_password, current_totp_code)
    }
}
