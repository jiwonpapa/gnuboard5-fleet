use super::*;
use crate::core::ports::{SshProfileInsertInput, SshProfileStorePort, SshProfileUpdateRecord};
use crate::core::ssh_auth::model_to_port_auth_type;
use crate::core::store_records::model_ssh_profile_from_record;
use g5_admin_models::models::ssh::{
    SshProfileAddInput, SshProfileDeleteInput, SshProfileListResponse, SshProfileUpdateInput,
};

#[async_trait::async_trait]
pub(super) trait SshProfileAccessGate: Send + Sync {
    async fn require_unlocked(&self) -> Result<(), AppError>;
}

pub(crate) struct SshProfileService<'a> {
    access_gate: &'a (dyn SshProfileAccessGate + Send + Sync),
    site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
    ssh_profile_store: &'a (dyn SshProfileStorePort + Send + Sync),
}

impl<'a> SshProfileService<'a> {
    pub(super) fn new(
        access_gate: &'a (dyn SshProfileAccessGate + Send + Sync),
        site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
        ssh_profile_store: &'a (dyn SshProfileStorePort + Send + Sync),
    ) -> Self {
        Self {
            access_gate,
            site_catalog_store,
            ssh_profile_store,
        }
    }

    pub(crate) async fn list(
        &self,
        request_id: &str,
        site_id: &str,
    ) -> Result<SshProfileListResponse, AppError> {
        self.access_gate.require_unlocked().await?;
        self.ensure_site_exists(site_id)?;
        let trace = ResponseTrace::local(request_id.to_string());
        let profiles = self
            .ssh_profile_store
            .load_ssh_profiles(site_id)?
            .into_iter()
            .map(model_ssh_profile_from_record)
            .collect();

        Ok(SshProfileListResponse {
            site_id: site_id.to_string(),
            profiles,
            request_id: trace.request_id,
            correlation_id: trace.correlation_id,
            server_request_id: trace.server_request_id,
        })
    }

    pub(crate) async fn add(&self, input: SshProfileAddInput) -> Result<(), AppError> {
        self.access_gate.require_unlocked().await?;
        self.ensure_site_exists(&input.site_id)?;
        let profile = self
            .ssh_profile_store
            .insert_ssh_profile(SshProfileInsertInput {
                site_id: input.site_id,
                name: input.name,
                host: input.host,
                port: input.port,
                username: input.username,
                auth_type: model_to_port_auth_type(input.auth_type),
                key_path: input.key_path,
                password: input.password,
                key_passphrase: input.key_passphrase,
            })?;
        self.site_catalog_store.add_activity(
            Some(&profile.site_id),
            "site.ssh_profile.add",
            Some(&format!("registered SSH profile {}", profile.name)),
        )?;
        Ok(())
    }

    pub(crate) async fn update(&self, input: SshProfileUpdateInput) -> Result<(), AppError> {
        self.access_gate.require_unlocked().await?;
        self.ensure_site_exists(&input.site_id)?;
        let profile = self
            .ssh_profile_store
            .update_ssh_profile(SshProfileUpdateRecord {
                site_id: input.site_id,
                ssh_profile_id: input.ssh_profile_id,
                name: input.name,
                host: input.host,
                port: input.port,
                username: input.username,
                auth_type: model_to_port_auth_type(input.auth_type),
                key_path: input.key_path,
                password: input.password,
                key_passphrase: input.key_passphrase,
                clear_password: input.clear_password,
                clear_key_passphrase: input.clear_key_passphrase,
            })?;
        self.site_catalog_store.add_activity(
            Some(&profile.site_id),
            "site.ssh_profile.update",
            Some(&format!("updated SSH profile {}", profile.name)),
        )?;
        Ok(())
    }

    pub(crate) async fn delete(&self, input: SshProfileDeleteInput) -> Result<(), AppError> {
        self.access_gate.require_unlocked().await?;
        self.ensure_site_exists(&input.site_id)?;
        let profile_name = self
            .ssh_profile_store
            .load_ssh_profiles(&input.site_id)?
            .into_iter()
            .find(|profile| profile.id == input.ssh_profile_id)
            .map(|profile| profile.name)
            .unwrap_or_else(|| input.ssh_profile_id.clone());
        self.ssh_profile_store
            .delete_ssh_profile(&input.site_id, &input.ssh_profile_id)?;
        self.site_catalog_store.add_activity(
            Some(&input.site_id),
            "site.ssh_profile.delete",
            Some(&format!("removed SSH profile {}", profile_name)),
        )?;
        Ok(())
    }

    fn ensure_site_exists(&self, site_id: &str) -> Result<(), AppError> {
        let exists = self
            .site_catalog_store
            .load_sites()?
            .into_iter()
            .any(|site| site.id == site_id);
        if exists {
            return Ok(());
        }

        Err(AppError::Config {
            message: format!("등록되지 않은 사이트입니다: {site_id}"),
        })
    }
}
