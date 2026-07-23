use super::sftp_support::{
    ensure_site_exists, record_copy_activity, record_opened_activity, require_sftp_session,
    SftpAccessGate,
};
use super::ssh_runtime::SshSessionRuntime;
use crate::core::ports::{SftpEntryKindResult, SiteCatalogStorePort};
use crate::error::AppError;
use g5_admin_models::models::ssh::{SftpCopyInput, SftpCopyResponse, SftpEntryKind};
use g5_admin_models::models::trace::ResponseTrace;

pub(crate) struct SftpCopyService<'a> {
    access_gate: &'a (dyn SftpAccessGate + Send + Sync),
    site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
    runtime: SshSessionRuntime<'a>,
}

impl<'a> SftpCopyService<'a> {
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

    pub(crate) async fn copy(
        &self,
        request_id: &str,
        input: SftpCopyInput,
    ) -> Result<SftpCopyResponse, AppError> {
        self.access_gate.require_unlocked().await?;
        ensure_site_exists(self.site_catalog_store, &input.site_id)?;
        let source_path =
            normalize_remote_path(&input.source_path, "복사할 원격 경로가 비어 있습니다.")?;
        let destination_path = normalize_remote_path(
            &input.destination_path,
            "복사 대상 원격 경로가 비어 있습니다.",
        )?;
        let (session, opened) = require_sftp_session(self.runtime, &input.site_id).await?;
        if opened {
            record_opened_activity(self.site_catalog_store, &input.site_id)?;
        }

        let copied = session
            .copy_path(source_path.as_str(), destination_path.as_str())
            .await?;
        record_copy_activity(
            self.site_catalog_store,
            &input.site_id,
            copied.resolved_destination_path.as_str(),
        )?;
        let trace = ResponseTrace::local(request_id.to_string());
        Ok(SftpCopyResponse {
            site_id: input.site_id,
            requested_source_path: copied.requested_source_path,
            source_resolved_path: copied.source_resolved_path,
            requested_destination_path: copied.requested_destination_path,
            resolved_destination_path: copied.resolved_destination_path,
            kind: map_entry_kind(copied.kind),
            copied_bytes: copied.copied_bytes,
            request_id: trace.request_id,
            correlation_id: trace.correlation_id,
            server_request_id: trace.server_request_id,
        })
    }
}

fn normalize_remote_path(path: &str, empty_message: &str) -> Result<String, AppError> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err(AppError::Config {
            message: empty_message.to_string(),
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
