use super::AppStateDependencies;
use crate::api_client::ApiClient;
use crate::db::{load_database_config, SiteRepository};
use crate::error::AppError;
use crate::runtime_config::RuntimeConfig;
use crate::site_manager::SiteManager;
use crate::token_store::{SiteSessionRepository, TokenStore};
use g5_admin_ssh::SshClient;
use std::sync::Arc;

impl AppStateDependencies {
    pub fn from_env() -> Result<Self, AppError> {
        let runtime_config = RuntimeConfig::load()?;
        let site_repository =
            SiteRepository::new(load_database_config(runtime_config.db_master_storage)?);
        let token_store = TokenStore::from_runtime_settings(
            runtime_config.session_storage,
            Some(Arc::new(SiteSessionRepository::new(
                site_repository.clone(),
            ))),
        )?;

        Ok(Self {
            api_client: ApiClient::new(None::<String>)?,
            runtime_config,
            ssh_client: SshClient::new(),
            token_store,
            site_repository,
            site_manager: SiteManager::new(vec![], None)?,
        })
    }
}
