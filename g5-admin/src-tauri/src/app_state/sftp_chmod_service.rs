use super::sftp_support::{
    ensure_site_exists, record_chmod_activity, record_opened_activity, require_sftp_session,
    SftpAccessGate,
};
use super::ssh_runtime::SshSessionRuntime;
use crate::core::ports::{SftpEntryKindResult, SiteCatalogStorePort};
use crate::error::AppError;
use g5_admin_models::models::ssh::{SftpChmodInput, SftpChmodResponse, SftpEntryKind};
use g5_admin_models::models::trace::ResponseTrace;

pub(crate) struct SftpChmodService<'a> {
    access_gate: &'a (dyn SftpAccessGate + Send + Sync),
    site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
    runtime: SshSessionRuntime<'a>,
}

impl<'a> SftpChmodService<'a> {
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

    pub(crate) async fn chmod(
        &self,
        request_id: &str,
        input: SftpChmodInput,
    ) -> Result<SftpChmodResponse, AppError> {
        self.access_gate.require_unlocked().await?;
        ensure_site_exists(self.site_catalog_store, &input.site_id)?;
        let path = normalize_remote_path(&input.path)?;
        let permissions_octal = normalize_permissions_octal(&input.permissions_octal)?;
        let (session, opened) = require_sftp_session(self.runtime, &input.site_id).await?;
        if opened {
            record_opened_activity(self.site_catalog_store, &input.site_id)?;
        }

        let chmod = session
            .chmod(path.as_str(), permissions_octal.as_str())
            .await?;
        record_chmod_activity(
            self.site_catalog_store,
            &input.site_id,
            chmod.resolved_path.as_str(),
        )?;
        let trace = ResponseTrace::local(request_id.to_string());
        Ok(SftpChmodResponse {
            site_id: input.site_id,
            requested_path: chmod.requested_path,
            resolved_path: chmod.resolved_path,
            permissions_octal: chmod.permissions_octal,
            kind: map_entry_kind(chmod.kind),
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
            message: "권한을 변경할 원격 경로가 비어 있습니다.".to_string(),
        });
    }

    Ok(trimmed.to_string())
}

fn normalize_permissions_octal(permissions_octal: &str) -> Result<String, AppError> {
    let trimmed = permissions_octal.trim();
    if trimmed.is_empty() {
        return Err(AppError::Config {
            message: "적용할 권한 8진수 값이 비어 있습니다.".to_string(),
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
