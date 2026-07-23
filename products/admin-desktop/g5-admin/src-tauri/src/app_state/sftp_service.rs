use super::sftp_support::{
    ensure_site_exists, record_opened_activity, require_sftp_session, SftpAccessGate,
};
use super::ssh_runtime::SshSessionRuntime;
use super::*;
use crate::core::ports::{SftpDirectoryEntryResult, SftpEntryKindResult, SiteCatalogStorePort};
use g5_admin_models::models::ssh::{
    SftpDirectoryEntry, SftpDirectoryListResponse, SftpEntryKind, SftpListDirInput,
    SftpPathMetadata, SftpReadFileInput, SftpReadFileResponse, SftpStatInput, SftpStatResponse,
};

const SFTP_PREVIEW_MAX_BYTES: usize = 128 * 1024;

pub(crate) struct SftpService<'a> {
    access_gate: &'a (dyn SftpAccessGate + Send + Sync),
    site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
    runtime: SshSessionRuntime<'a>,
}

impl<'a> SftpService<'a> {
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

    pub(crate) async fn list_dir(
        &self,
        request_id: &str,
        input: SftpListDirInput,
    ) -> Result<SftpDirectoryListResponse, AppError> {
        self.access_gate.require_unlocked().await?;
        ensure_site_exists(self.site_catalog_store, &input.site_id)?;
        let (session, opened) = require_sftp_session(self.runtime, &input.site_id).await?;
        if opened {
            record_opened_activity(self.site_catalog_store, &input.site_id)?;
        }

        let listing = session.list_dir(&input.path).await?;
        let trace = ResponseTrace::local(request_id.to_string());
        Ok(SftpDirectoryListResponse {
            site_id: input.site_id,
            requested_path: listing.requested_path,
            resolved_path: listing.resolved_path,
            parent_path: listing.parent_path,
            entries: listing
                .entries
                .into_iter()
                .map(map_directory_entry)
                .collect(),
            request_id: trace.request_id,
            correlation_id: trace.correlation_id,
            server_request_id: trace.server_request_id,
        })
    }

    pub(crate) async fn stat(
        &self,
        request_id: &str,
        input: SftpStatInput,
    ) -> Result<SftpStatResponse, AppError> {
        self.access_gate.require_unlocked().await?;
        ensure_site_exists(self.site_catalog_store, &input.site_id)?;
        let (session, opened) = require_sftp_session(self.runtime, &input.site_id).await?;
        if opened {
            record_opened_activity(self.site_catalog_store, &input.site_id)?;
        }

        let stat = session.stat(&input.path).await?;
        let trace = ResponseTrace::local(request_id.to_string());
        Ok(SftpStatResponse {
            site_id: input.site_id,
            requested_path: stat.requested_path,
            resolved_path: stat.resolved_path,
            metadata: map_metadata(stat.metadata),
            request_id: trace.request_id,
            correlation_id: trace.correlation_id,
            server_request_id: trace.server_request_id,
        })
    }

    pub(crate) async fn read_file(
        &self,
        request_id: &str,
        input: SftpReadFileInput,
    ) -> Result<SftpReadFileResponse, AppError> {
        self.access_gate.require_unlocked().await?;
        ensure_site_exists(self.site_catalog_store, &input.site_id)?;
        let (session, opened) = require_sftp_session(self.runtime, &input.site_id).await?;
        if opened {
            record_opened_activity(self.site_catalog_store, &input.site_id)?;
        }

        let read = session
            .read_file(&input.path, SFTP_PREVIEW_MAX_BYTES)
            .await?;
        let utf8_lossy = std::str::from_utf8(&read.content).is_err();
        let content = String::from_utf8_lossy(&read.content).into_owned();
        let byte_length = u32::try_from(read.content.len()).map_err(|_| AppError::Config {
            message: "SFTP 파일 미리보기 길이를 안전한 숫자로 변환하지 못했습니다.".to_string(),
        })?;
        let trace = ResponseTrace::local(request_id.to_string());
        Ok(SftpReadFileResponse {
            site_id: input.site_id,
            requested_path: read.requested_path,
            resolved_path: read.resolved_path,
            content,
            byte_length,
            truncated: read.truncated,
            utf8_lossy,
            request_id: trace.request_id,
            correlation_id: trace.correlation_id,
            server_request_id: trace.server_request_id,
        })
    }
}

fn map_directory_entry(entry: SftpDirectoryEntryResult) -> SftpDirectoryEntry {
    SftpDirectoryEntry {
        name: entry.name,
        path: entry.path,
        metadata: map_metadata(entry.metadata),
    }
}

fn map_metadata(metadata: crate::core::ports::SftpPathMetadataResult) -> SftpPathMetadata {
    SftpPathMetadata {
        kind: match metadata.kind {
            SftpEntryKindResult::Directory => SftpEntryKind::Directory,
            SftpEntryKindResult::File => SftpEntryKind::File,
            SftpEntryKindResult::Symlink => SftpEntryKind::Symlink,
            SftpEntryKindResult::Other => SftpEntryKind::Other,
        },
        size_bytes: metadata.size_bytes,
        permissions_octal: metadata.permissions_octal,
        modified_at_epoch: metadata.modified_at_epoch,
    }
}
