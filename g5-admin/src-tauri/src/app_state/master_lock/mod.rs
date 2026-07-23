use super::master_lock_service::{
    MasterLockRuntime, MasterLockService, MasterLockSiteSync, MasterLockTotpGuard,
};
use super::*;

mod status;
mod totp;
mod unlock;

impl MasterLockTotpGuard for AppState {
    fn totp_is_enabled(&self) -> Result<bool, AppError> {
        self.load_totp_enabled()
    }

    fn check_totp(&self, code: &str) -> Result<bool, AppError> {
        self.verify_totp_code(code)
    }
}

#[async_trait::async_trait]
impl MasterLockSiteSync for AppState {
    async fn prepare_sites(&self) -> Result<(), AppError> {
        self.site_catalog_service().ensure_sites_loaded().await
    }

    async fn sync_runtime_site(&self, active_site: Option<&Site>) -> Result<(), AppError> {
        self.site_catalog_service()
            .sync_active_site_runtime(active_site)
            .await
    }
}

impl AppState {
    pub(crate) fn master_lock_service(&self) -> MasterLockService<'_> {
        MasterLockService::new(
            self,
            self,
            self.security_store(),
            self.site_catalog_store(),
            MasterLockRuntime::new(
                &self.master_unlocked,
                &self.pending_totp_unlock,
                &self.site_manager,
            ),
        )
    }
}
