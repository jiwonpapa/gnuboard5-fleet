use super::sftp_support::{
    ensure_site_exists, record_mkdir_activity, record_opened_activity, require_sftp_session,
    SftpAccessGate,
};
use super::ssh_runtime::SshSessionRuntime;
use crate::core::ports::SiteCatalogStorePort;
use crate::error::AppError;
use g5_admin_models::models::ssh::{SftpMkdirInput, SftpMkdirResponse};
use g5_admin_models::models::trace::ResponseTrace;

pub(crate) struct SftpMkdirService<'a> {
    access_gate: &'a (dyn SftpAccessGate + Send + Sync),
    site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
    runtime: SshSessionRuntime<'a>,
}

impl<'a> SftpMkdirService<'a> {
    pub(super) fn new(
        access_gate: &'a (dyn SftpAccessGate + Send + Sync),
        site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
        runtime: SshSessionRuntime<'a>,
    ) -> Self {
        Self {
            access_gate,
            site_catalog_store,
            runtime,
        }
    }

    pub(crate) async fn mkdir(
        &self,
        request_id: &str,
        input: SftpMkdirInput,
    ) -> Result<SftpMkdirResponse, AppError> {
        self.access_gate.require_unlocked().await?;
        ensure_site_exists(self.site_catalog_store, &input.site_id)?;
        let path = normalize_remote_path(&input.path)?;
        let (session, opened) = require_sftp_session(self.runtime, &input.site_id).await?;
        if opened {
            record_opened_activity(self.site_catalog_store, &input.site_id)?;
        }

        let created = session.mkdir(path.as_str()).await?;
        record_mkdir_activity(
            self.site_catalog_store,
            &input.site_id,
            created.resolved_path.as_str(),
        )?;
        let trace = ResponseTrace::local(request_id.to_string());
        Ok(SftpMkdirResponse {
            site_id: input.site_id,
            requested_path: created.requested_path,
            resolved_path: created.resolved_path,
            request_id: trace.request_id,
            correlation_id: trace.correlation_id,
            server_request_id: trace.server_request_id,
        })
    }
}

fn normalize_remote_path(path: &str) -> Result<String, AppError> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err(AppError::Config {
            message: "생성할 원격 디렉터리 경로가 비어 있습니다.".to_string(),
        });
    }

    Ok(trimmed.to_string())
}
