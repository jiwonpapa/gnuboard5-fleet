use super::sftp_support::{
    ensure_site_exists, record_delete_activity, record_opened_activity, require_sftp_session,
    SftpAccessGate,
};
use super::ssh_runtime::SshSessionRuntime;
use crate::core::ports::{SftpEntryKindResult, SiteCatalogStorePort};
use crate::error::AppError;
use g5_admin_models::models::ssh::{SftpDeleteInput, SftpDeleteResponse, SftpEntryKind};
use g5_admin_models::models::trace::ResponseTrace;

pub(crate) struct SftpDeleteService<'a> {
    access_gate: &'a (dyn SftpAccessGate + Send + Sync),
    site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
    runtime: SshSessionRuntime<'a>,
}

impl<'a> SftpDeleteService<'a> {
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

    pub(crate) async fn delete(
        &self,
        request_id: &str,
        input: SftpDeleteInput,
    ) -> Result<SftpDeleteResponse, AppError> {
        self.access_gate.require_unlocked().await?;
        ensure_site_exists(self.site_catalog_store, &input.site_id)?;
        let path = normalize_remote_path(&input.path)?;
        let (session, opened) = require_sftp_session(self.runtime, &input.site_id).await?;
        if opened {
            record_opened_activity(self.site_catalog_store, &input.site_id)?;
        }

        let deleted = session.delete(path.as_str(), input.recursive).await?;
        record_delete_activity(
            self.site_catalog_store,
            &input.site_id,
            deleted.resolved_path.as_str(),
        )?;
        let trace = ResponseTrace::local(request_id.to_string());
        Ok(SftpDeleteResponse {
            site_id: input.site_id,
            requested_path: deleted.requested_path,
            resolved_path: deleted.resolved_path,
            kind: map_entry_kind(deleted.kind),
            deleted_count: deleted.deleted_count,
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
            message: "삭제할 원격 경로가 비어 있습니다.".to_string(),
        });
    }

    let normalized = trimmed.trim_end_matches('/');
    if normalized.is_empty() || normalized == "." {
        return Err(AppError::Config {
            message: "현재 루트 경로(`.` 또는 `/`)는 삭제할 수 없습니다.".to_string(),
        });
    }

    Ok(trimmed.to_string())
}

fn map_entry_kind(kind: SftpEntryKindResult) -> SftpEntryKind {
    match kind {
        SftpEntryKindResult::Directory => SftpEntryKind::Directory,
        SftpEntryKindResult::File => SftpEntryKind::File,
        SftpEntryKindResult::Symlink => SftpEntryKind::Symlink,
        SftpEntryKindResult::Other => SftpEntryKind::Other,
    }
}
