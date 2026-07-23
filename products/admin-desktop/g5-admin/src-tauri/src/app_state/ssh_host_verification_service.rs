use super::*;
use crate::core::ports::{SiteCatalogStorePort, SshHostVerificationPort, SshProfileStorePort};
use g5_admin_models::models::ssh::{
    SshHostTrustInput, SshHostVerificationInput, SshHostVerificationResponse,
    SshKnownHostTrustState,
};
use g5_admin_models::models::trace::ResponseTrace;

#[async_trait::async_trait]
pub(super) trait SshHostVerificationAccessGate: Send + Sync {
    async fn require_unlocked(&self) -> Result<(), AppError>;
}

pub(crate) struct SshHostVerificationService<'a> {
    access_gate: &'a (dyn SshHostVerificationAccessGate + Send + Sync),
    site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
    ssh_host_verifier: &'a (dyn SshHostVerificationPort + Send + Sync),
    ssh_profile_store: &'a (dyn SshProfileStorePort + Send + Sync),
}

impl<'a> SshHostVerificationService<'a> {
    pub(super) fn new(
        access_gate: &'a (dyn SshHostVerificationAccessGate + Send + Sync),
        site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
        ssh_profile_store: &'a (dyn SshProfileStorePort + Send + Sync),
        ssh_host_verifier: &'a (dyn SshHostVerificationPort + Send + Sync),
    ) -> Self {
        Self {
            access_gate,
            site_catalog_store,
            ssh_host_verifier,
            ssh_profile_store,
        }
    }

    pub(crate) async fn inspect(
        &self,
        request_id: &str,
        input: SshHostVerificationInput,
    ) -> Result<SshHostVerificationResponse, AppError> {
        self.access_gate.require_unlocked().await?;
        self.ensure_site_exists(&input.site_id)?;

        let target = self
            .ssh_profile_store
            .load_ssh_profile_connection_target(&input.site_id, &input.ssh_profile_id)?;
        let inspection = self
            .ssh_host_verifier
            .inspect_host_verification(&target.profile.host, target.profile.port)
            .await?;

        Ok(build_host_verification_response(
            request_id,
            &input.site_id,
            &target.profile,
            inspection,
        ))
    }

    pub(crate) async fn trust(
        &self,
        request_id: &str,
        input: SshHostTrustInput,
    ) -> Result<SshHostVerificationResponse, AppError> {
        self.access_gate.require_unlocked().await?;
        self.ensure_site_exists(&input.site_id)?;

        let target = self
            .ssh_profile_store
            .load_ssh_profile_connection_target(&input.site_id, &input.ssh_profile_id)?;
        let inspection = self
            .ssh_host_verifier
            .trust_host_verification(
                &target.profile.host,
                target.profile.port,
                &input.expected_fingerprint,
            )
            .await?;
        self.site_catalog_store.add_activity(
            Some(&input.site_id),
            "site.ssh.host.trust",
            Some(&format!(
                "trusted SSH host {}:{} for profile {}",
                target.profile.host, target.profile.port, target.profile.name
            )),
        )?;

        Ok(build_host_verification_response(
            request_id,
            &input.site_id,
            &target.profile,
            inspection,
        ))
    }

    fn ensure_site_exists(&self, site_id: &str) -> Result<(), AppError> {
        let site_exists = self
            .site_catalog_store
            .load_sites()?
            .into_iter()
            .any(|site| site.id == site_id);
        if site_exists {
            return Ok(());
        }

        Err(AppError::Config {
            message: format!("site_id `{site_id}`에 해당하는 사이트를 찾지 못했습니다."),
        })
    }
}

fn build_host_verification_response(
    request_id: &str,
    site_id: &str,
    profile: &crate::core::ports::SshConnectionProfile,
    inspection: crate::core::ports::SshHostVerificationResult,
) -> SshHostVerificationResponse {
    let trace = ResponseTrace::local(request_id.to_string());
    SshHostVerificationResponse {
        site_id: site_id.to_string(),
        ssh_profile_id: profile.id.clone(),
        host: profile.host.clone(),
        port: profile.port,
        username: profile.username.clone(),
        server_key_algorithm: inspection.server_key_algorithm,
        server_key_fingerprint: inspection.server_key_fingerprint,
        trust_state: match inspection.trust_state {
            crate::core::ports::SshKnownHostTrustStateResult::Trusted => {
                SshKnownHostTrustState::Trusted
            }
            crate::core::ports::SshKnownHostTrustStateResult::Missing => {
                SshKnownHostTrustState::Missing
            }
            crate::core::ports::SshKnownHostTrustStateResult::Changed => {
                SshKnownHostTrustState::Changed
            }
        },
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}
