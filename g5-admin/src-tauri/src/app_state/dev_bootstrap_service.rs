use super::master_lock_service::MasterLockService;
use super::session_service::SessionService;
use super::site_catalog_service::SiteCatalogService;
use super::ssh_profile_service::SshProfileService;
use super::AppState;
use crate::core::api_records::{
    login_record_from_model, model_member_profile_from_record, model_token_pair_from_record,
};
use crate::core::ports::{SiteCatalogStorePort, SshProfileStorePort};
use crate::core::store_records::{model_site_from_record, model_ssh_profile_from_record};
use crate::error::AppError;
use crate::runtime_config::{
    DevBootstrapConfig, DevBootstrapSiteAuthConfig, DevBootstrapSiteConfig,
    DevBootstrapSshProfileConfig, RuntimeConfig, RuntimeSshAuthType,
};
use g5_admin_models::models::auth::{AuthLoginInput, StoredSession};
use g5_admin_models::models::debug::{DebugDevBootstrapResult, DebugDevBootstrapStatus};
use g5_admin_models::models::master_lock::{MasterLockSetupInput, MasterLockUnlockInput};
use g5_admin_models::models::site::{Site, SiteAddInput, SiteUpdateInput};
use g5_admin_models::models::ssh::{SshAuthType, SshProfileAddInput, SshProfileUpdateInput};
use g5_admin_models::models::trace::ResponseTrace;
use g5_admin_models::models::trace::Traced;

pub(crate) struct DevBootstrapService<'a> {
    request_context: &'a AppState,
    runtime_config: &'a RuntimeConfig,
    admin_api: &'a (dyn crate::core::ports::AdminApiPort + Send + Sync),
    master_lock_service: MasterLockService<'a>,
    session_service: SessionService<'a>,
    site_catalog_service: SiteCatalogService<'a>,
    ssh_profile_service: SshProfileService<'a>,
    site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
    ssh_profile_store: &'a (dyn SshProfileStorePort + Send + Sync),
}

impl<'a> DevBootstrapService<'a> {
    #[allow(
        clippy::too_many_arguments,
        reason = "the bootstrap orchestrator receives explicit domain services and ports"
    )]
    pub(super) fn new(
        request_context: &'a AppState,
        runtime_config: &'a RuntimeConfig,
        admin_api: &'a (dyn crate::core::ports::AdminApiPort + Send + Sync),
        master_lock_service: MasterLockService<'a>,
        session_service: SessionService<'a>,
        site_catalog_service: SiteCatalogService<'a>,
        ssh_profile_service: SshProfileService<'a>,
        site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
        ssh_profile_store: &'a (dyn SshProfileStorePort + Send + Sync),
    ) -> Self {
        Self {
            request_context,
            runtime_config,
            admin_api,
            master_lock_service,
            session_service,
            site_catalog_service,
            ssh_profile_service,
            site_catalog_store,
            ssh_profile_store,
        }
    }

    pub(crate) async fn status(
        &self,
        request_id: &str,
    ) -> Result<DebugDevBootstrapStatus, AppError> {
        let trace = ResponseTrace::local(request_id.to_string());
        let bootstrap = self.runtime_config.dev_bootstrap.as_ref();

        Ok(DebugDevBootstrapStatus {
            available: self.runtime_config.debug_overlay
                && bootstrap.is_some_and(DevBootstrapConfig::is_enabled),
            debug_overlay: self.runtime_config.debug_overlay,
            has_master_password: bootstrap
                .and_then(|config| config.master_password.as_ref())
                .is_some(),
            has_site: bootstrap.and_then(|config| config.site.as_ref()).is_some(),
            has_site_auth: bootstrap
                .and_then(|config| config.site_auth.as_ref())
                .is_some(),
            site_name: bootstrap
                .and_then(|config| config.site.as_ref())
                .map(|site| site.name.clone()),
            ssh_profile_count: bootstrap
                .map(|config| config.ssh_profiles.len() as u32)
                .unwrap_or(0),
            request_id: trace.request_id,
            correlation_id: trace.correlation_id,
            server_request_id: trace.server_request_id,
        })
    }

    pub(crate) async fn apply(
        &self,
        request_id: &str,
    ) -> Result<DebugDevBootstrapResult, AppError> {
        if !self.runtime_config.debug_overlay {
            return Err(AppError::Config {
                message: "개발용 bootstrap은 debugOverlay가 켜진 환경에서만 사용할 수 있습니다."
                    .to_string(),
            });
        }

        let Some(config) = self.runtime_config.dev_bootstrap.as_ref() else {
            return Err(AppError::Config {
                message: "개발용 bootstrap 설정이 app-config.json에 없습니다.".to_string(),
            });
        };

        if !config.is_enabled() {
            return Err(AppError::Config {
                message: "개발용 bootstrap 설정이 비어 있습니다.".to_string(),
            });
        }

        let trace = ResponseTrace::local(request_id.to_string());
        let master_status = self.apply_master_lock(config, request_id).await?;
        if !master_status.is_unlocked {
            return Err(AppError::Auth {
                message: "개발용 bootstrap으로 앱 잠금을 해제하지 못했습니다. 마스터 비밀번호 또는 OTP 설정을 확인해 주십시오.".to_string(),
            });
        }

        let (
            active_site,
            site_login_mb_id,
            site_login_authenticated,
            created_ssh_profile_count,
            updated_ssh_profile_count,
        ) = self.apply_site_and_profiles(config).await?;

        Ok(DebugDevBootstrapResult {
            master_lock_configured: master_status.is_configured,
            master_lock_unlocked: master_status.is_unlocked,
            site_id: active_site.as_ref().map(|site| site.id.clone()),
            site_name: active_site.as_ref().map(|site| site.name.clone()),
            site_login_mb_id,
            site_login_authenticated,
            created_ssh_profile_count,
            updated_ssh_profile_count,
            request_id: trace.request_id,
            correlation_id: trace.correlation_id,
            server_request_id: trace.server_request_id,
        })
    }

    async fn apply_master_lock(
        &self,
        config: &DevBootstrapConfig,
        request_id: &str,
    ) -> Result<g5_admin_models::models::master_lock::MasterLockStatus, AppError> {
        let status = self
            .master_lock_service
            .master_lock_status(request_id)
            .await?;

        if status.is_unlocked {
            return Ok(status);
        }

        let Some(master_password) = config.master_password.as_ref() else {
            return Err(AppError::Config {
                message: "개발용 bootstrap에 masterPassword가 없어 앱 잠금을 자동으로 해제할 수 없습니다.".to_string(),
            });
        };

        if !status.is_configured {
            return self
                .master_lock_service
                .setup_master_lock(
                    request_id,
                    MasterLockSetupInput {
                        password: master_password.clone(),
                        password_confirm: master_password.clone(),
                    },
                )
                .await;
        }

        self.master_lock_service
            .unlock_master_lock(
                request_id,
                MasterLockUnlockInput {
                    password: master_password.clone(),
                },
            )
            .await
    }

    async fn apply_site_and_profiles(
        &self,
        config: &DevBootstrapConfig,
    ) -> Result<(Option<Site>, Option<String>, bool, u32, u32), AppError> {
        let site = match config.site.as_ref() {
            Some(site_config) => Some(self.upsert_site(site_config).await?),
            None => self.site_catalog_service.active_site().await?,
        };

        let Some(site) = site else {
            if config.ssh_profiles.is_empty() {
                return Ok((None, None, false, 0, 0));
            }

            return Err(AppError::Config {
                message:
                    "개발용 bootstrap에 사이트가 없어서 SSH 프로필을 적용할 대상을 찾지 못했습니다."
                        .to_string(),
            });
        };

        self.site_catalog_service.switch_site(&site.id).await?;
        let (site_login_mb_id, site_login_authenticated) = match config.site_auth.as_ref() {
            Some(site_auth) => {
                self.apply_site_auth(site_auth, "dev-bootstrap-site-auth")
                    .await?
            }
            None => (None, false),
        };
        let (created_ssh_profile_count, updated_ssh_profile_count) = self
            .upsert_ssh_profiles(&site, &config.ssh_profiles)
            .await?;
        let active_site = self.site_catalog_service.active_site().await?;
        Ok((
            active_site,
            site_login_mb_id,
            site_login_authenticated,
            created_ssh_profile_count,
            updated_ssh_profile_count,
        ))
    }

    async fn apply_site_auth(
        &self,
        config: &DevBootstrapSiteAuthConfig,
        request_id: &str,
    ) -> Result<(Option<String>, bool), AppError> {
        let _request_context = self
            .request_context
            .acquire_active_request_context()
            .await?;
        let login_input = AuthLoginInput {
            mb_id: config.mb_id.clone(),
            mb_password: config.mb_password.clone(),
        };
        let Traced { value: tokens, .. } = self
            .admin_api
            .login(request_id, &login_record_from_model(&login_input))
            .await?
            .map(model_token_pair_from_record);
        let Traced {
            value: profile,
            trace: _,
        } = self
            .admin_api
            .get_my_profile(request_id, &tokens.access_token)
            .await?
            .map(model_member_profile_from_record);

        self.session_service
            .save_active_site_session(&StoredSession::new(profile.mb_id.clone(), tokens))
            .await?;

        Ok((Some(profile.mb_id), true))
    }

    async fn upsert_site(&self, config: &DevBootstrapSiteConfig) -> Result<Site, AppError> {
        let sites = self
            .site_catalog_store
            .load_sites()?
            .into_iter()
            .map(model_site_from_record)
            .collect::<Vec<_>>();
        let existing = find_matching_site(&sites, config);

        let Some(existing) = existing else {
            return self
                .site_catalog_service
                .add_site(SiteAddInput {
                    name: config.name.clone(),
                    api_base_url: config.api_base_url.clone(),
                })
                .await;
        };

        if existing.name == config.name && existing.api_base_url == config.api_base_url {
            return Ok(existing);
        }

        self.site_catalog_service
            .update_site(SiteUpdateInput {
                site_id: existing.id.clone(),
                name: config.name.clone(),
                api_base_url: config.api_base_url.clone(),
                is_default: existing.is_default,
            })
            .await
    }

    async fn upsert_ssh_profiles(
        &self,
        site: &Site,
        configs: &[DevBootstrapSshProfileConfig],
    ) -> Result<(u32, u32), AppError> {
        let mut existing_profiles = self
            .ssh_profile_store
            .load_ssh_profiles(&site.id)?
            .into_iter()
            .map(model_ssh_profile_from_record)
            .collect::<Vec<_>>();
        let mut created_count = 0_u32;
        let mut updated_count = 0_u32;
        for config in configs {
            let existing = find_matching_profile(&existing_profiles, config);
            let (password, clear_password, key_passphrase, clear_key_passphrase) =
                build_secret_update(config);
            let auth_type = to_ssh_auth_type(config.auth_type);

            match existing {
                Some(profile) => {
                    self.ssh_profile_service
                        .update(SshProfileUpdateInput {
                            site_id: site.id.clone(),
                            ssh_profile_id: profile.id.clone(),
                            name: config.name.clone(),
                            host: config.host.clone(),
                            port: config.port,
                            username: config.username.clone(),
                            auth_type,
                            key_path: config.key_path.clone(),
                            password,
                            key_passphrase,
                            clear_password,
                            clear_key_passphrase,
                        })
                        .await?;
                    updated_count = updated_count.saturating_add(1);
                }
                None => {
                    self.ssh_profile_service
                        .add(SshProfileAddInput {
                            site_id: site.id.clone(),
                            name: config.name.clone(),
                            host: config.host.clone(),
                            port: config.port,
                            username: config.username.clone(),
                            auth_type,
                            key_path: config.key_path.clone(),
                            password,
                            key_passphrase,
                        })
                        .await?;
                    created_count = created_count.saturating_add(1);
                }
            }
            existing_profiles = self
                .ssh_profile_store
                .load_ssh_profiles(&site.id)?
                .into_iter()
                .map(model_ssh_profile_from_record)
                .collect();
        }

        Ok((created_count, updated_count))
    }
}

fn find_matching_site(existing: &[Site], config: &DevBootstrapSiteConfig) -> Option<Site> {
    existing
        .iter()
        .find(|site| site.api_base_url == config.api_base_url)
        .cloned()
        .or_else(|| {
            existing
                .iter()
                .find(|site| site.name == config.name)
                .cloned()
        })
}

fn find_matching_profile<'a>(
    existing: &'a [g5_admin_models::models::ssh::SshProfile],
    config: &DevBootstrapSshProfileConfig,
) -> Option<&'a g5_admin_models::models::ssh::SshProfile> {
    existing
        .iter()
        .find(|profile| profile.name == config.name)
        .or_else(|| {
            existing.iter().find(|profile| {
                profile.host == config.host
                    && profile.port == config.port
                    && profile.username == config.username
            })
        })
}

fn build_secret_update(
    config: &DevBootstrapSshProfileConfig,
) -> (Option<String>, bool, Option<String>, bool) {
    match config.auth_type {
        RuntimeSshAuthType::Password => (
            config.password.clone(),
            config.password.is_none(),
            None,
            true,
        ),
        RuntimeSshAuthType::Key => (
            None,
            true,
            config.key_passphrase.clone(),
            config.key_passphrase.is_none(),
        ),
        RuntimeSshAuthType::Agent => (None, true, None, true),
    }
}

fn to_ssh_auth_type(auth_type: RuntimeSshAuthType) -> SshAuthType {
    match auth_type {
        RuntimeSshAuthType::Password => SshAuthType::Password,
        RuntimeSshAuthType::Key => SshAuthType::Key,
        RuntimeSshAuthType::Agent => SshAuthType::Agent,
    }
}
