use super::sftp_support::{
    ensure_site_exists, record_move_activity, record_opened_activity, require_sftp_session,
    SftpAccessGate,
};
use super::ssh_runtime::SshSessionRuntime;
use crate::core::ports::{SftpEntryKindResult, SiteCatalogStorePort};
use crate::error::AppError;
use g5_admin_models::models::ssh::{SftpEntryKind, SftpMoveInput, SftpMoveResponse};
use g5_admin_models::models::trace::ResponseTrace;

pub(crate) struct SftpMoveService<'a> {
    access_gate: &'a (dyn SftpAccessGate + Send + Sync),
    site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
    runtime: SshSessionRuntime<'a>,
}

impl<'a> SftpMoveService<'a> {
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

    pub(crate) async fn move_path(
        &self,
        request_id: &str,
        input: SftpMoveInput,
    ) -> Result<SftpMoveResponse, AppError> {
        self.access_gate.require_unlocked().await?;
        ensure_site_exists(self.site_catalog_store, &input.site_id)?;
        let source_path =
            normalize_remote_path(&input.source_path, "이동할 원격 경로가 비어 있습니다.")?;
        let destination_path = normalize_remote_path(
            &input.destination_path,
            "이동 대상 원격 경로가 비어 있습니다.",
        )?;
        let (session, opened) = require_sftp_session(self.runtime, &input.site_id).await?;
        if opened {
            record_opened_activity(self.site_catalog_store, &input.site_id)?;
        }

        let moved = session
            .move_path(source_path.as_str(), destination_path.as_str())
            .await?;
        record_move_activity(
            self.site_catalog_store,
            &input.site_id,
            moved.resolved_destination_path.as_str(),
        )?;
        let trace = ResponseTrace::local(request_id.to_string());
        Ok(SftpMoveResponse {
            site_id: input.site_id,
            requested_source_path: moved.requested_source_path,
            source_resolved_path: moved.source_resolved_path,
            requested_destination_path: moved.requested_destination_path,
            resolved_destination_path: moved.resolved_destination_path,
            kind: map_entry_kind(moved.kind),
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
