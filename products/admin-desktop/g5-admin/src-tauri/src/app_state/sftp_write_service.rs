use super::sftp_support::{
    ensure_site_exists, record_opened_activity, record_write_activity, require_sftp_session,
    SftpAccessGate,
};
use super::ssh_runtime::SshSessionRuntime;
use crate::core::ports::SiteCatalogStorePort;
use crate::error::AppError;
use g5_admin_models::models::ssh::{SftpWriteFileInput, SftpWriteFileResponse};
use g5_admin_models::models::trace::ResponseTrace;

pub(crate) struct SftpWriteService<'a> {
    access_gate: &'a (dyn SftpAccessGate + Send + Sync),
    site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
    runtime: SshSessionRuntime<'a>,
}

impl<'a> SftpWriteService<'a> {
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

    pub(crate) async fn write_file(
        &self,
        request_id: &str,
        input: SftpWriteFileInput,
    ) -> Result<SftpWriteFileResponse, AppError> {
        self.access_gate.require_unlocked().await?;
        ensure_site_exists(self.site_catalog_store, &input.site_id)?;
        let path = normalize_remote_path(&input.path)?;
        let (session, opened) = require_sftp_session(self.runtime, &input.site_id).await?;
        if opened {
            record_opened_activity(self.site_catalog_store, &input.site_id)?;
        }

        let write = session
            .write_file(path.as_str(), input.content.as_bytes())
            .await?;
        record_write_activity(
            self.site_catalog_store,
            &input.site_id,
            write.resolved_path.as_str(),
        )?;
        let byte_length = u32::try_from(write.written_bytes).map_err(|_| AppError::Config {
            message: "SFTP 파일 저장 결과 크기를 안전한 숫자로 변환하지 못했습니다.".to_string(),
        })?;
        let trace = ResponseTrace::local(request_id.to_string());
        Ok(SftpWriteFileResponse {
            site_id: input.site_id,
            requested_path: write.requested_path,
            resolved_path: write.resolved_path,
            byte_length,
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
            message: "저장할 원격 파일 경로가 비어 있습니다.".to_string(),
        });
    }

    Ok(trimmed.to_string())
}
