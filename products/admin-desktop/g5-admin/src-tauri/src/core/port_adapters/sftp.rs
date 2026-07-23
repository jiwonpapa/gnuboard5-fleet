use crate::core::ports::{
    SftpChmodResult, SftpCopyResult, SftpDeleteResult, SftpDirectoryEntryResult,
    SftpDirectoryListResult, SftpDownloadResult, SftpEntryKindResult, SftpMkdirResult,
    SftpMoveResult, SftpPathMetadataResult, SftpReadFileResult, SftpSessionPort, SftpStatResult,
    SftpUploadResult, SftpWriteFileResult,
};
use crate::error::AppError;
use g5_admin_ssh::{
    SftpChmod as RemoteSftpChmod, SftpCopy as RemoteSftpCopy, SftpDelete as RemoteSftpDelete,
    SftpDirectoryCreate as RemoteSftpDirectoryCreate,
    SftpDirectoryEntry as RemoteSftpDirectoryEntry,
    SftpDirectoryListing as RemoteSftpDirectoryListing, SftpDownload as RemoteSftpDownload,
    SftpEntryKind as RemoteSftpEntryKind, SftpFileRead as RemoteSftpFileRead,
    SftpFileWrite as RemoteSftpFileWrite, SftpMove as RemoteSftpMove,
    SftpPathMetadata as RemoteSftpPathMetadata, SftpStat as RemoteSftpStat,
    SftpUpload as RemoteSftpUpload, SshSftpSession,
};
use std::path::Path;

pub(super) struct RusshSftpAdapter {
    inner: SshSftpSession,
}

impl RusshSftpAdapter {
    pub(super) fn new(inner: SshSftpSession) -> Self {
        Self { inner }
    }
}

#[async_trait::async_trait]
impl SftpSessionPort for RusshSftpAdapter {
    async fn list_dir(&self, path: &str) -> Result<SftpDirectoryListResult, AppError> {
        let listing = self.inner.list_dir(path).await.map_err(AppError::from)?;
        Ok(map_sftp_directory_listing(listing))
    }

    async fn stat(&self, path: &str) -> Result<SftpStatResult, AppError> {
        let stat = self.inner.stat(path).await.map_err(AppError::from)?;
        Ok(map_sftp_stat(stat))
    }

    async fn read_file(
        &self,
        path: &str,
        max_bytes: usize,
    ) -> Result<SftpReadFileResult, AppError> {
        let content = self
            .inner
            .read_file(path, max_bytes)
            .await
            .map_err(AppError::from)?;
        Ok(map_sftp_file_read(content))
    }

    async fn download_file(
        &self,
        path: &str,
        destination_path: &Path,
    ) -> Result<SftpDownloadResult, AppError> {
        let download = self
            .inner
            .download_file(path, destination_path)
            .await
            .map_err(AppError::from)?;
        Ok(map_sftp_download(download))
    }

    async fn upload_file(
        &self,
        source_path: &Path,
        destination_path: &str,
    ) -> Result<SftpUploadResult, AppError> {
        let upload = self
            .inner
            .upload_file(source_path, destination_path)
            .await
            .map_err(AppError::from)?;
        Ok(map_sftp_upload(upload))
    }

    async fn copy_path(
        &self,
        source_path: &str,
        destination_path: &str,
    ) -> Result<SftpCopyResult, AppError> {
        let copied = self
            .inner
            .copy_path(source_path, destination_path)
            .await
            .map_err(AppError::from)?;
        Ok(map_sftp_copy(copied))
    }

    async fn move_path(
        &self,
        source_path: &str,
        destination_path: &str,
    ) -> Result<SftpMoveResult, AppError> {
        let moved = self
            .inner
            .move_path(source_path, destination_path)
            .await
            .map_err(AppError::from)?;
        Ok(map_sftp_move(moved))
    }

    async fn chmod(
        &self,
        path: &str,
        permissions_octal: &str,
    ) -> Result<SftpChmodResult, AppError> {
        let chmod = self
            .inner
            .chmod(path, permissions_octal)
            .await
            .map_err(AppError::from)?;
        Ok(map_sftp_chmod(chmod))
    }

    async fn delete(&self, path: &str, recursive: bool) -> Result<SftpDeleteResult, AppError> {
        let deleted = self
            .inner
            .delete(path, recursive)
            .await
            .map_err(AppError::from)?;
        Ok(map_sftp_delete(deleted))
    }

    async fn mkdir(&self, path: &str) -> Result<SftpMkdirResult, AppError> {
        let created = self.inner.mkdir(path).await.map_err(AppError::from)?;
        Ok(map_sftp_mkdir(created))
    }

    async fn write_file(
        &self,
        path: &str,
        content: &[u8],
    ) -> Result<SftpWriteFileResult, AppError> {
        let write = self
            .inner
            .write_file(path, content)
            .await
            .map_err(AppError::from)?;
        Ok(map_sftp_write(write))
    }

    async fn close(&self) -> Result<(), AppError> {
        self.inner.close().await.map_err(AppError::from)
    }
}

fn map_sftp_directory_listing(listing: RemoteSftpDirectoryListing) -> SftpDirectoryListResult {
    SftpDirectoryListResult {
        requested_path: listing.requested_path,
        resolved_path: listing.resolved_path,
        parent_path: listing.parent_path,
        entries: listing
            .entries
            .into_iter()
            .map(map_sftp_directory_entry)
            .collect(),
    }
}

fn map_sftp_directory_entry(entry: RemoteSftpDirectoryEntry) -> SftpDirectoryEntryResult {
    SftpDirectoryEntryResult {
        name: entry.name,
        path: entry.path,
        metadata: map_sftp_metadata(entry.metadata),
    }
}

fn map_sftp_stat(stat: RemoteSftpStat) -> SftpStatResult {
    SftpStatResult {
        requested_path: stat.requested_path,
        resolved_path: stat.resolved_path,
        metadata: map_sftp_metadata(stat.metadata),
    }
}

fn map_sftp_file_read(read: RemoteSftpFileRead) -> SftpReadFileResult {
    SftpReadFileResult {
        requested_path: read.requested_path,
        resolved_path: read.resolved_path,
        content: read.content,
        truncated: read.truncated,
    }
}

fn map_sftp_download(download: RemoteSftpDownload) -> SftpDownloadResult {
    SftpDownloadResult {
        requested_path: download.requested_path,
        resolved_path: download.resolved_path,
        copied_bytes: download.copied_bytes,
    }
}

fn map_sftp_upload(upload: RemoteSftpUpload) -> SftpUploadResult {
    SftpUploadResult {
        source_path: upload.source_path,
        destination_path: upload.destination_path,
        resolved_path: upload.resolved_path,
        copied_bytes: upload.copied_bytes,
    }
}

fn map_sftp_copy(copied: RemoteSftpCopy) -> SftpCopyResult {
    SftpCopyResult {
        requested_source_path: copied.requested_source_path,
        source_resolved_path: copied.source_resolved_path,
        requested_destination_path: copied.requested_destination_path,
        resolved_destination_path: copied.resolved_destination_path,
        kind: map_sftp_entry_kind(copied.kind),
        copied_bytes: copied.copied_bytes,
    }
}

fn map_sftp_move(moved: RemoteSftpMove) -> SftpMoveResult {
    SftpMoveResult {
        requested_source_path: moved.requested_source_path,
        source_resolved_path: moved.source_resolved_path,
        requested_destination_path: moved.requested_destination_path,
        resolved_destination_path: moved.resolved_destination_path,
        kind: map_sftp_entry_kind(moved.kind),
    }
}

fn map_sftp_chmod(chmod: RemoteSftpChmod) -> SftpChmodResult {
    SftpChmodResult {
        requested_path: chmod.requested_path,
        resolved_path: chmod.resolved_path,
        permissions_octal: chmod.permissions_octal,
        kind: map_sftp_entry_kind(chmod.kind),
    }
}

fn map_sftp_delete(deleted: RemoteSftpDelete) -> SftpDeleteResult {
    SftpDeleteResult {
        requested_path: deleted.requested_path,
        resolved_path: deleted.resolved_path,
        kind: map_sftp_entry_kind(deleted.kind),
        deleted_count: deleted.deleted_count,
    }
}

fn map_sftp_mkdir(created: RemoteSftpDirectoryCreate) -> SftpMkdirResult {
    SftpMkdirResult {
        requested_path: created.requested_path,
        resolved_path: created.resolved_path,
    }
}

fn map_sftp_write(write: RemoteSftpFileWrite) -> SftpWriteFileResult {
    SftpWriteFileResult {
        requested_path: write.requested_path,
        resolved_path: write.resolved_path,
        written_bytes: write.written_bytes,
    }
}

fn map_sftp_metadata(metadata: RemoteSftpPathMetadata) -> SftpPathMetadataResult {
    SftpPathMetadataResult {
        kind: map_sftp_entry_kind(metadata.kind),
        size_bytes: metadata.size_bytes,
        permissions_octal: metadata.permissions_octal,
        modified_at_epoch: metadata.modified_at_epoch,
    }
}

fn map_sftp_entry_kind(kind: RemoteSftpEntryKind) -> SftpEntryKindResult {
    match kind {
        RemoteSftpEntryKind::Directory => SftpEntryKindResult::Directory,
        RemoteSftpEntryKind::File => SftpEntryKindResult::File,
        RemoteSftpEntryKind::Symlink => SftpEntryKindResult::Symlink,
        RemoteSftpEntryKind::Other => SftpEntryKindResult::Other,
    }
}
