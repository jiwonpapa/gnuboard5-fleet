use super::*;
use crate::site_manager::model_site_from_manager;

#[async_trait::async_trait]
pub(super) trait MasterLockSiteSync: Send + Sync {
    async fn prepare_sites(&self) -> Result<(), AppError>;
    async fn sync_runtime_site(&self, active_site: Option<&Site>) -> Result<(), AppError>;
}

pub(super) trait MasterLockTotpGuard: Send + Sync {
    fn totp_is_enabled(&self) -> Result<bool, AppError>;
    fn check_totp(&self, code: &str) -> Result<bool, AppError>;
}

pub(super) struct MasterLockRuntime<'a> {
    unlocked_flag: &'a RwLock<bool>,
    totp_challenge: &'a RwLock<bool>,
    sites: &'a RwLock<SiteManager>,
}

impl<'a> MasterLockRuntime<'a> {
    pub(super) fn new(
        unlocked_flag: &'a RwLock<bool>,
        totp_challenge: &'a RwLock<bool>,
        sites: &'a RwLock<SiteManager>,
    ) -> Self {
        Self {
            unlocked_flag,
            totp_challenge,
            sites,
        }
    }

    async fn is_unlocked(&self) -> bool {
        *self.unlocked_flag.read().await
    }

    async fn requires_totp(&self) -> bool {
        *self.totp_challenge.read().await
    }

    async fn set_unlock_phase(&self, is_unlocked: bool, requires_totp: bool) {
        {
            let mut unlocked = self.unlocked_flag.write().await;
            *unlocked = is_unlocked;
        }
        {
            let mut pending = self.totp_challenge.write().await;
            *pending = requires_totp;
        }
    }

    async fn active_site(&self) -> Option<Site> {
        self.sites
            .read()
            .await
            .active_site()
            .map(model_site_from_manager)
    }
}

pub(crate) struct MasterLockService<'a> {
    totp_guard: &'a (dyn MasterLockTotpGuard + Send + Sync),
    site_sync: &'a (dyn MasterLockSiteSync + Send + Sync),
    security_store: &'a (dyn SecurityStorePort + Send + Sync),
    site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
    runtime: MasterLockRuntime<'a>,
}

impl<'a> MasterLockService<'a> {
    pub(super) fn new(
        totp_guard: &'a (dyn MasterLockTotpGuard + Send + Sync),
        site_sync: &'a (dyn MasterLockSiteSync + Send + Sync),
        security_store: &'a (dyn SecurityStorePort + Send + Sync),
        site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
        runtime: MasterLockRuntime<'a>,
    ) -> Self {
        Self {
            totp_guard,
            site_sync,
            security_store,
            site_catalog_store,
            runtime,
        }
    }

    pub(crate) async fn master_lock_status(
        &self,
        request_id: &str,
    ) -> Result<MasterLockStatus, AppError> {
        let trace = ResponseTrace::local(request_id.to_string());
        let app_lock = self.security_store.load_app_lock()?;
        let is_unlocked = self.runtime.is_unlocked().await;
        let requires_totp = self.runtime.requires_totp().await;
        let totp_enabled = self.totp_guard.totp_is_enabled()?;
        let now = epoch_now();
        let unlock_locked_until_epoch = self.load_unlock_locked_until_epoch()?;
        let unlock_retry_after_seconds = unlock_locked_until_epoch
            .filter(|until| *until > now)
            .map(|until| until.saturating_sub(now));

        Ok(MasterLockStatus::from_parts(
            trace,
            app_lock.is_some(),
            app_lock.is_some() && is_unlocked,
            app_lock
                .as_ref()
                .is_some_and(|record| record.passkey_enabled),
            app_lock.is_some() && totp_enabled,
            app_lock.is_some() && requires_totp,
            unlock_retry_after_seconds,
            unlock_locked_until_epoch,
        ))
    }

    pub(crate) async fn setup_master_lock(
        &self,
        request_id: &str,
        input: MasterLockSetupInput,
    ) -> Result<MasterLockStatus, AppError> {
        if self.security_store.load_app_lock()?.is_some() {
            return Err(AppError::Config {
                message: "앱 잠금이 이미 설정되어 있습니다.".to_string(),
            });
        }

        if input.password.trim().is_empty() {
            return Err(AppError::Config {
                message: "마스터 비밀번호를 입력해 주십시오.".to_string(),
            });
        }

        if input.password != input.password_confirm {
            return Err(AppError::Config {
                message: "마스터 비밀번호 확인이 일치하지 않습니다.".to_string(),
            });
        }

        self.security_store.create_app_lock(&input.password)?;
        self.clear_unlock_fail_state()?;
        self.runtime.set_unlock_phase(true, false).await;
        self.site_catalog_store.add_activity(
            None,
            "app_lock.setup",
            Some("configured local master lock"),
        )?;

        self.master_lock_status(request_id).await
    }

    pub(crate) async fn lock_master(&self, request_id: &str) -> Result<MasterLockStatus, AppError> {
        if self.security_store.load_app_lock()?.is_none() {
            return Err(AppError::Config {
                message: "앱 잠금이 아직 설정되지 않았습니다.".to_string(),
            });
        }

        self.runtime.set_unlock_phase(false, false).await;
        self.site_sync.sync_runtime_site(None).await?;
        self.site_catalog_store.add_activity(
            None,
            "app_lock.lock",
            Some("locked local master lock"),
        )?;

        self.master_lock_status(request_id).await
    }

    pub(crate) async fn unlock_master_lock(
        &self,
        request_id: &str,
        input: MasterLockUnlockInput,
    ) -> Result<MasterLockStatus, AppError> {
        let has_lock = self.security_store.load_app_lock()?.is_some();
        if !has_lock {
            return Err(AppError::Config {
                message: "앱 잠금이 아직 설정되지 않았습니다.".to_string(),
            });
        }

        self.ensure_unlock_not_rate_limited()?;

        let verified = self.security_store.verify_app_lock(&input.password)?;
        if !verified {
            let locked_for_seconds = self.record_unlock_failure()?;
            let message = match locked_for_seconds {
                Some(value) => lockout_message(value),
                None => "마스터 비밀번호가 일치하지 않습니다.".to_string(),
            };
            return Err(AppError::Auth { message });
        }

        self.clear_unlock_fail_state()?;
        self.complete_primary_unlock(request_id, "unlocked local master lock")
            .await
    }

    pub(crate) async fn unlock_master_lock_fast(
        &self,
        request_id: &str,
        secret: &str,
    ) -> Result<MasterLockStatus, AppError> {
        let has_lock = self.security_store.load_app_lock()?.is_some();
        if !has_lock {
            return Err(AppError::Config {
                message: "앱 잠금이 아직 설정되지 않았습니다.".to_string(),
            });
        }

        self.ensure_unlock_not_rate_limited()?;
        if !self.security_store.fast_unlock_enabled()? {
            return Err(AppError::Auth {
                message: "빠른 잠금 해제가 아직 등록되지 않았습니다.".to_string(),
            });
        }

        let verified = self.security_store.verify_fast_unlock_secret(secret)?;
        if !verified {
            let locked_for_seconds = self.record_unlock_failure()?;
            let message = match locked_for_seconds {
                Some(value) => lockout_message(value),
                None => {
                    "빠른 잠금 해제 자격을 확인하지 못했습니다. 다시 등록해 주십시오.".to_string()
                }
            };
            return Err(AppError::Auth { message });
        }

        self.clear_unlock_fail_state()?;
        self.complete_primary_unlock(request_id, "unlocked local master lock with fast unlock")
            .await
    }

    pub(crate) async fn verify_master_lock_totp(
        &self,
        request_id: &str,
        input: MasterLockTotpInput,
    ) -> Result<MasterLockStatus, AppError> {
        if !self.runtime.requires_totp().await {
            return Err(AppError::Auth {
                message: "현재 진행 중인 OTP 잠금 해제 요청이 없습니다.".to_string(),
            });
        }

        let verified = self.totp_guard.check_totp(&input.code)?;
        if !verified {
            return Err(AppError::Auth {
                message: "OTP 코드가 올바르지 않습니다.".to_string(),
            });
        }

        self.runtime.set_unlock_phase(true, false).await;
        self.site_sync.prepare_sites().await?;
        let active_site = self.runtime.active_site().await;
        self.site_sync
            .sync_runtime_site(active_site.as_ref())
            .await?;
        self.site_catalog_store.add_activity(
            None,
            "app_lock.unlock",
            Some("completed local master unlock with totp"),
        )?;

        self.master_lock_status(request_id).await
    }

    fn load_unlock_locked_until_epoch(&self) -> Result<Option<u64>, AppError> {
        self.security_store
            .get_app_setting(APP_SETTING_UNLOCK_LOCKED_UNTIL_EPOCH)?
            .map(|raw| {
                raw.parse::<u64>().map_err(|error| AppError::Storage {
                    target: APP_SETTING_UNLOCK_LOCKED_UNTIL_EPOCH.to_string(),
                    error: error.to_string(),
                })
            })
            .transpose()
    }

    fn ensure_unlock_not_rate_limited(&self) -> Result<(), AppError> {
        let now = epoch_now();
        let Some(until) = self.load_unlock_locked_until_epoch()? else {
            return Ok(());
        };
        if until > now {
            return Err(AppError::Auth {
                message: lockout_message(until.saturating_sub(now)),
            });
        }
        Ok(())
    }

    fn record_unlock_failure(&self) -> Result<Option<u64>, AppError> {
        let current_attempts = self
            .security_store
            .get_app_setting(APP_SETTING_UNLOCK_FAILED_ATTEMPTS)?
            .as_deref()
            .unwrap_or("0")
            .parse::<u32>()
            .map_err(|error| AppError::Storage {
                target: APP_SETTING_UNLOCK_FAILED_ATTEMPTS.to_string(),
                error: error.to_string(),
            })?;
        let next_attempts = current_attempts.saturating_add(1);
        self.security_store.set_app_setting(
            APP_SETTING_UNLOCK_FAILED_ATTEMPTS,
            &next_attempts.to_string(),
        )?;

        if next_attempts < 5 {
            return Ok(None);
        }

        let lockout_windows = next_attempts.saturating_sub(4) as u64;
        let lockout_seconds = (BASE_UNLOCK_LOCKOUT_SECONDS.saturating_mul(lockout_windows))
            .min(MAX_UNLOCK_LOCKOUT_SECONDS);
        let locked_until = epoch_now().saturating_add(lockout_seconds);
        self.security_store.set_app_setting(
            APP_SETTING_UNLOCK_LOCKED_UNTIL_EPOCH,
            &locked_until.to_string(),
        )?;
        Ok(Some(lockout_seconds))
    }

    fn clear_unlock_fail_state(&self) -> Result<(), AppError> {
        self.security_store
            .delete_app_setting(APP_SETTING_UNLOCK_FAILED_ATTEMPTS)?;
        self.security_store
            .delete_app_setting(APP_SETTING_UNLOCK_LOCKED_UNTIL_EPOCH)?;
        Ok(())
    }

    async fn complete_primary_unlock(
        &self,
        request_id: &str,
        success_detail: &str,
    ) -> Result<MasterLockStatus, AppError> {
        if self.totp_guard.totp_is_enabled()? {
            self.runtime.set_unlock_phase(false, true).await;
            self.site_catalog_store.add_activity(
                None,
                "app_lock.unlock.challenge",
                Some("primary unlock completed and totp verification is required"),
            )?;
            return self.master_lock_status(request_id).await;
        }

        self.site_sync.prepare_sites().await?;
        let active_site = self.runtime.active_site().await;
        self.runtime.set_unlock_phase(true, false).await;
        self.site_sync
            .sync_runtime_site(active_site.as_ref())
            .await?;
        self.site_catalog_store
            .add_activity(None, "app_lock.unlock", Some(success_detail))?;

        self.master_lock_status(request_id).await
    }
}

fn lockout_message(remaining_seconds: u64) -> String {
    let remaining_minutes = remaining_seconds.div_ceil(60);
    format!(
        "잠금 해제 시도 횟수를 초과했습니다. 보안을 위해 {}분 후 다시 시도해 주십시오.",
        remaining_minutes
    )
}

fn epoch_now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}
