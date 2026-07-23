use super::*;

const IDLE_TIMEOUT_FALLBACK_MINUTES: u32 = 15;
const OTP_ISSUER_LABEL: &str = "G5Admin";
const OTP_ACCOUNT_LABEL: &str = "local-master";

#[async_trait::async_trait]
pub(super) trait SecurityUnlockGate: Send + Sync {
    async fn confirm_unlocked(&self) -> Result<(), AppError>;
}

pub(super) trait SecurityTotpGuard: Send + Sync {
    fn check_totp(&self, code: &str) -> Result<bool, AppError>;
}

#[async_trait::async_trait]
pub(super) trait SecurityRestoreSiteSync: Send + Sync {
    async fn sync_restored_sites(
        &self,
        requested_active_site_id: Option<String>,
    ) -> Result<(), AppError>;
}

pub(super) struct SecuritySettingsRuntime<'a> {
    sites: &'a RwLock<SiteManager>,
    totp_pending: &'a RwLock<bool>,
}

impl<'a> SecuritySettingsRuntime<'a> {
    pub(super) fn new(sites: &'a RwLock<SiteManager>, totp_pending: &'a RwLock<bool>) -> Self {
        Self {
            sites,
            totp_pending,
        }
    }

    async fn requested_active_site_id(&self) -> Option<String> {
        self.sites.read().await.active_site_id()
    }

    async fn clear_totp_pending(&self) {
        let mut pending = self.totp_pending.write().await;
        *pending = false;
    }
}

pub(crate) struct SecuritySettingsService<'a> {
    unlock_gate: &'a (dyn SecurityUnlockGate + Send + Sync),
    totp_guard: &'a (dyn SecurityTotpGuard + Send + Sync),
    restore_site_sync: &'a (dyn SecurityRestoreSiteSync + Send + Sync),
    security_store: &'a (dyn SecurityStorePort + Send + Sync),
    site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
    backup_store: &'a (dyn BackupStorePort + Send + Sync),
    runtime: SecuritySettingsRuntime<'a>,
}

impl<'a> SecuritySettingsService<'a> {
    pub(super) fn new(
        unlock_gate: &'a (dyn SecurityUnlockGate + Send + Sync),
        totp_guard: &'a (dyn SecurityTotpGuard + Send + Sync),
        restore_site_sync: &'a (dyn SecurityRestoreSiteSync + Send + Sync),
        security_store: &'a (dyn SecurityStorePort + Send + Sync),
        site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
        backup_store: &'a (dyn BackupStorePort + Send + Sync),
        runtime: SecuritySettingsRuntime<'a>,
    ) -> Self {
        Self {
            unlock_gate,
            totp_guard,
            restore_site_sync,
            security_store,
            site_catalog_store,
            backup_store,
            runtime,
        }
    }

    pub(crate) fn load_totp_enabled(&self) -> Result<bool, AppError> {
        Ok(matches!(
            self.security_store
                .get_app_setting(APP_SETTING_TOTP_ENABLED)?
                .as_deref(),
            Some("1" | "true" | "yes" | "on")
        ))
    }

    pub(crate) fn load_idle_timeout_minutes(&self) -> Result<Option<u32>, AppError> {
        let value = self
            .security_store
            .get_app_setting(APP_SETTING_IDLE_TIMEOUT_MINUTES)?;
        match value.as_deref() {
            None => Ok(Some(IDLE_TIMEOUT_FALLBACK_MINUTES)),
            Some("0") => Ok(None),
            Some(raw) => raw
                .parse::<u32>()
                .map(Some)
                .map_err(|error| AppError::Storage {
                    target: APP_SETTING_IDLE_TIMEOUT_MINUTES.to_string(),
                    error: error.to_string(),
                }),
        }
    }

    pub(crate) fn confirm_security_factors(
        &self,
        current_password: &str,
        current_totp_code: Option<&str>,
    ) -> Result<(), AppError> {
        if !self.security_store.verify_app_lock(current_password)? {
            return Err(AppError::Auth {
                message: "현재 마스터 비밀번호가 일치하지 않습니다.".to_string(),
            });
        }

        if !self.load_totp_enabled()? {
            return Ok(());
        }

        let Some(code) = current_totp_code else {
            return Err(AppError::Auth {
                message: "이 작업을 진행하려면 현재 OTP 코드를 입력해 주십시오.".to_string(),
            });
        };
        let verified = self.totp_guard.check_totp(code)?;
        if !verified {
            return Err(AppError::Auth {
                message: "OTP 코드가 올바르지 않습니다.".to_string(),
            });
        }

        Ok(())
    }

    pub(crate) async fn security_settings(
        &self,
        request_id: &str,
    ) -> Result<SecuritySettings, AppError> {
        self.unlock_gate.confirm_unlocked().await?;
        let trace = ResponseTrace::local(request_id.to_string());
        Ok(SecuritySettings::from_parts(
            trace,
            self.load_idle_timeout_minutes()?,
            self.load_totp_enabled()?,
        ))
    }

    pub(crate) async fn change_master_password(
        &self,
        request_id: &str,
        input: MasterPasswordChangeInput,
    ) -> Result<SecuritySettings, AppError> {
        self.unlock_gate.confirm_unlocked().await?;
        self.confirm_security_factors(&input.current_password, input.current_totp_code.as_deref())?;
        if input.new_password.trim().is_empty() {
            return Err(AppError::Config {
                message: "새 마스터 비밀번호를 입력해 주십시오.".to_string(),
            });
        }
        if input.new_password != input.new_password_confirm {
            return Err(AppError::Config {
                message: "새 마스터 비밀번호 확인이 일치하지 않습니다.".to_string(),
            });
        }

        self.security_store
            .update_app_lock_password(&input.new_password)?;
        self.site_catalog_store.add_activity(
            None,
            "app_lock.password_change",
            Some("updated local master password"),
        )?;

        self.security_settings(request_id).await
    }

    pub(crate) async fn update_idle_timeout(
        &self,
        request_id: &str,
        input: SecurityIdleTimeoutUpdateInput,
    ) -> Result<SecuritySettings, AppError> {
        self.unlock_gate.confirm_unlocked().await?;
        self.confirm_security_factors(
            &input.auth.current_password,
            input.auth.current_totp_code.as_deref(),
        )?;
        if let Some(value) = input.idle_timeout_minutes {
            if !matches!(value, 5 | 15 | 30 | 60) {
                return Err(AppError::Config {
                    message: "자동 잠금 시간은 5/15/30/60분만 허용합니다.".to_string(),
                });
            }
            self.security_store
                .set_app_setting(APP_SETTING_IDLE_TIMEOUT_MINUTES, &value.to_string())?;
        } else {
            self.security_store
                .set_app_setting(APP_SETTING_IDLE_TIMEOUT_MINUTES, "0")?;
        }
        self.site_catalog_store.add_activity(
            None,
            "app_lock.idle_timeout",
            Some("updated idle auto-lock timeout"),
        )?;
        self.security_settings(request_id).await
    }

    pub(crate) async fn fast_unlock_enabled(&self) -> Result<bool, AppError> {
        self.security_store.fast_unlock_enabled()
    }

    pub(crate) async fn enable_fast_unlock(
        &self,
        current_password: &str,
        current_totp_code: Option<&str>,
        secret: &str,
    ) -> Result<(), AppError> {
        self.unlock_gate.confirm_unlocked().await?;
        self.confirm_security_factors(current_password, current_totp_code)?;
        self.security_store.store_fast_unlock_verifier(secret)?;
        self.site_catalog_store.add_activity(
            None,
            "app_lock.fast_unlock.enable",
            Some("enabled fast unlock"),
        )?;
        Ok(())
    }

    pub(crate) async fn disable_fast_unlock(
        &self,
        current_password: &str,
        current_totp_code: Option<&str>,
    ) -> Result<(), AppError> {
        self.unlock_gate.confirm_unlocked().await?;
        self.confirm_security_factors(current_password, current_totp_code)?;
        self.security_store.clear_fast_unlock_verifier()?;
        self.site_catalog_store.add_activity(
            None,
            "app_lock.fast_unlock.disable",
            Some("disabled fast unlock"),
        )?;
        Ok(())
    }

    pub(crate) async fn export_backup(
        &self,
        path: &str,
        current_password: &str,
        current_totp_code: Option<&str>,
        backup_password: &str,
    ) -> Result<(u64, usize), AppError> {
        self.unlock_gate.confirm_unlocked().await?;
        self.confirm_security_factors(current_password, current_totp_code)?;
        let destination_path = std::path::Path::new(path);
        let result = self
            .backup_store
            .export_backup(destination_path, backup_password)?;
        self.site_catalog_store.add_activity(
            None,
            "backup.export",
            Some(&format!(
                "exported portable encrypted backup to {}",
                destination_path.display()
            )),
        )?;
        Ok(result)
    }

    pub(crate) async fn import_backup(
        &self,
        path: &str,
        current_password: &str,
        current_totp_code: Option<&str>,
        backup_password: &str,
    ) -> Result<BackupImportReport, AppError> {
        self.unlock_gate.confirm_unlocked().await?;
        self.confirm_security_factors(current_password, current_totp_code)?;
        let source_path = std::path::Path::new(path);
        let summary = self
            .backup_store
            .import_backup(source_path, backup_password)?;
        let requested_active_site_id = self.runtime.requested_active_site_id().await;
        self.restore_site_sync
            .sync_restored_sites(requested_active_site_id)
            .await?;
        self.site_catalog_store.add_activity(
            None,
            "backup.import",
            Some(&format!(
                "imported portable backup from {}",
                source_path.display()
            )),
        )?;
        Ok(summary)
    }

    pub(crate) async fn start_totp_enrollment(
        &self,
        request_id: &str,
        input: TotpSetupStartInput,
    ) -> Result<TotpEnrollmentChallenge, AppError> {
        self.unlock_gate.confirm_unlocked().await?;
        self.confirm_security_factors(&input.current_password, input.current_totp_code.as_deref())?;

        let challenge = g5_admin_security_core::create_totp_enrollment_challenge(
            OTP_ISSUER_LABEL,
            OTP_ACCOUNT_LABEL,
        )
        .map_err(AppError::from)?;
        let manual_entry_key = challenge.manual_entry_key;
        let otpauth_uri = challenge.otpauth_uri;
        self.security_store.store_totp_secret(&manual_entry_key)?;
        self.site_catalog_store.add_activity(
            None,
            "app_lock.totp.start",
            Some("started totp enrollment challenge"),
        )?;

        Ok(TotpEnrollmentChallenge::from_parts(
            ResponseTrace::local(request_id.to_string()),
            manual_entry_key,
            otpauth_uri,
        ))
    }

    pub(crate) async fn verify_enable_totp(
        &self,
        request_id: &str,
        input: TotpVerifyEnableInput,
    ) -> Result<SecuritySettings, AppError> {
        self.unlock_gate.confirm_unlocked().await?;
        let verified = self.totp_guard.check_totp(&input.code)?;
        if !verified {
            return Err(AppError::Auth {
                message: "OTP 코드가 올바르지 않습니다.".to_string(),
            });
        }

        self.security_store
            .set_app_setting(APP_SETTING_TOTP_ENABLED, "1")?;
        self.security_store.set_app_setting(
            APP_SETTING_TOTP_ENROLLED_AT,
            &epoch_seconds_now().to_string(),
        )?;
        self.site_catalog_store.add_activity(
            None,
            "app_lock.totp.enable",
            Some("enabled totp second factor"),
        )?;
        self.security_settings(request_id).await
    }

    pub(crate) async fn disable_totp(
        &self,
        request_id: &str,
        input: TotpDisableInput,
    ) -> Result<SecuritySettings, AppError> {
        self.unlock_gate.confirm_unlocked().await?;
        self.confirm_security_factors(&input.current_password, input.current_totp_code.as_deref())?;

        self.security_store.clear_totp_secret()?;
        self.security_store
            .set_app_setting(APP_SETTING_TOTP_ENABLED, "0")?;
        self.security_store
            .delete_app_setting(APP_SETTING_TOTP_ENROLLED_AT)?;
        self.runtime.clear_totp_pending().await;
        self.site_catalog_store.add_activity(
            None,
            "app_lock.totp.disable",
            Some("disabled totp second factor"),
        )?;
        self.security_settings(request_id).await
    }
}

fn epoch_seconds_now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}
