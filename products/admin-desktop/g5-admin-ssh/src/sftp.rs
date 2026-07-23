use crate::error::SshClientError;
use crate::types::{
    SftpChmod, SftpCopy, SftpDelete, SftpDirectoryCreate, SftpDirectoryEntry, SftpDirectoryListing,
    SftpDownload, SftpEntryKind, SftpFileRead, SftpFileWrite, SftpMove, SftpPathMetadata, SftpStat,
    SftpUpload,
};
use russh_sftp::client::{fs::Metadata, SftpSession};
use std::path::Path;
use tokio::fs::File;
use tokio::io::copy;
use tokio::io::AsyncReadExt;
use tokio::io::AsyncWriteExt;

pub struct SshSftpSession {
    inner: SftpSession,
}

impl SshSftpSession {
    pub(crate) fn new(inner: SftpSession) -> Self {
        Self { inner }
    }

    pub async fn list_dir(&self, path: &str) -> Result<SftpDirectoryListing, SshClientError> {
        let requested_path = normalize_requested_path(path);
        let resolved_path = self.inner.canonicalize(requested_path.as_str()).await?;
        let mut entries = self
            .inner
            .read_dir(resolved_path.as_str())
            .await?
            .map(|entry| SftpDirectoryEntry {
                name: entry.file_name(),
                path: build_child_path(&resolved_path, &entry.file_name()),
                metadata: map_metadata(&entry.metadata()),
            })
            .collect::<Vec<_>>();
        entries.sort_by(|left, right| {
            entry_kind_rank(left.metadata.kind)
                .cmp(&entry_kind_rank(right.metadata.kind))
                .then_with(|| {
                    left.name
                        .to_ascii_lowercase()
                        .cmp(&right.name.to_ascii_lowercase())
                })
                .then_with(|| left.name.cmp(&right.name))
        });

        Ok(SftpDirectoryListing {
            requested_path,
            resolved_path: resolved_path.clone(),
            parent_path: parent_path(&resolved_path),
            entries,
        })
    }

    pub async fn stat(&self, path: &str) -> Result<SftpStat, SshClientError> {
        let requested_path = normalize_requested_path(path);
        let resolved_path = self.inner.canonicalize(requested_path.as_str()).await?;
        let metadata = self.inner.metadata(resolved_path.as_str()).await?;
        Ok(SftpStat {
            requested_path,
            resolved_path,
            metadata: map_metadata(&metadata),
        })
    }

    pub async fn read_file(
        &self,
        path: &str,
        max_bytes: usize,
    ) -> Result<SftpFileRead, SshClientError> {
        let requested_path = normalize_requested_path(path);
        let resolved_path = self.inner.canonicalize(requested_path.as_str()).await?;
        let file = self.inner.open(resolved_path.as_str()).await?;
        let mut content = Vec::with_capacity(max_bytes.saturating_add(1).min(131_072));
        file.take(max_bytes as u64 + 1)
            .read_to_end(&mut content)
            .await?;
        let truncated = content.len() > max_bytes;
        if truncated {
            content.truncate(max_bytes);
        }

        Ok(SftpFileRead {
            requested_path,
            resolved_path,
            content,
            truncated,
        })
    }

    pub async fn download_file(
        &self,
        path: &str,
        destination_path: &Path,
    ) -> Result<SftpDownload, SshClientError> {
        let requested_path = normalize_requested_path(path);
        let resolved_path = self.inner.canonicalize(requested_path.as_str()).await?;
        let mut remote_file = self.inner.open(resolved_path.as_str()).await?;
        let mut local_file =
            File::create(destination_path)
                .await
                .map_err(|error| SshClientError::Storage {
                    target: destination_path.display().to_string(),
                    error: error.to_string(),
                })?;
        let copied_bytes = copy(&mut remote_file, &mut local_file)
            .await
            .map_err(|error| SshClientError::Storage {
                target: destination_path.display().to_string(),
                error: error.to_string(),
            })?;
        local_file
            .sync_all()
            .await
            .map_err(|error| SshClientError::Storage {
                target: destination_path.display().to_string(),
                error: error.to_string(),
            })?;

        Ok(SftpDownload {
            requested_path,
            resolved_path,
            copied_bytes,
        })
    }

    pub async fn upload_file(
        &self,
        source_path: &Path,
        destination_path: &str,
    ) -> Result<SftpUpload, SshClientError> {
        let resolved_path = resolve_destination_file_path(&self.inner, destination_path).await?;
        let mut local_file =
            File::open(source_path)
                .await
                .map_err(|error| SshClientError::Storage {
                    target: source_path.display().to_string(),
                    error: error.to_string(),
                })?;
        let mut remote_file = self.inner.create(resolved_path.as_str()).await?;
        let copied_bytes = copy(&mut local_file, &mut remote_file)
            .await
            .map_err(|error| SshClientError::Transport {
                error: format!("SFTP upload stream failed: {error}"),
            })?;
        remote_file.sync_all().await?;
        remote_file.shutdown().await?;

        Ok(SftpUpload {
            source_path: source_path.display().to_string(),
            destination_path: normalize_requested_path(destination_path),
            resolved_path,
            copied_bytes,
        })
    }

    pub async fn copy_path(
        &self,
        source_path: &str,
        destination_path: &str,
    ) -> Result<SftpCopy, SshClientError> {
        let requested_source_path = normalize_requested_path(source_path);
        let requested_destination_path = normalize_requested_path(destination_path);
        let source_resolved_path = self
            .inner
            .canonicalize(requested_source_path.as_str())
            .await?;
        let destination_resolved_path = resolve_child_path(
            &self.inner,
            requested_destination_path.as_str(),
            "복사 대상 원격 경로에 항목명이 필요합니다.",
        )
        .await?;
        let metadata = self.inner.metadata(source_resolved_path.as_str()).await?;
        let kind = map_metadata(&metadata).kind;
        let copied_bytes = match kind {
            SftpEntryKind::Directory => {
                copy_directory_recursive(
                    &self.inner,
                    source_resolved_path.as_str(),
                    destination_resolved_path.as_str(),
                )
                .await?
            }
            SftpEntryKind::File | SftpEntryKind::Symlink | SftpEntryKind::Other => {
                copy_remote_file(
                    &self.inner,
                    source_resolved_path.as_str(),
                    destination_resolved_path.as_str(),
                )
                .await?
            }
        };

        Ok(SftpCopy {
            requested_source_path,
            source_resolved_path,
            requested_destination_path,
            resolved_destination_path: destination_resolved_path,
            kind,
            copied_bytes,
        })
    }

    pub async fn move_path(
        &self,
        source_path: &str,
        destination_path: &str,
    ) -> Result<SftpMove, SshClientError> {
        let requested_source_path = normalize_requested_path(source_path);
        let requested_destination_path = normalize_requested_path(destination_path);
        let source_resolved_path = self
            .inner
            .canonicalize(requested_source_path.as_str())
            .await?;
        let destination_resolved_path = resolve_child_path(
            &self.inner,
            requested_destination_path.as_str(),
            "이동 대상 원격 경로에 항목명이 필요합니다.",
        )
        .await?;
        let metadata = self.inner.metadata(source_resolved_path.as_str()).await?;
        let kind = map_metadata(&metadata).kind;
        self.inner
            .rename(
                source_resolved_path.as_str(),
                destination_resolved_path.as_str(),
            )
            .await?;

        Ok(SftpMove {
            requested_source_path,
            source_resolved_path,
            requested_destination_path,
            resolved_destination_path: destination_resolved_path,
            kind,
        })
    }

    pub async fn chmod(
        &self,
        path: &str,
        permissions_octal: &str,
    ) -> Result<SftpChmod, SshClientError> {
        let requested_path = normalize_requested_path(path);
        let resolved_path = self.inner.canonicalize(requested_path.as_str()).await?;
        let normalized_permissions = normalize_permissions_octal(permissions_octal)?;
        let permissions_value =
            u32::from_str_radix(normalized_permissions.as_str(), 8).map_err(|_| {
                SshClientError::Config {
                    message: format!(
                        "유효한 권한 8진수(예: 644, 755)를 입력해 주십시오: {permissions_octal}"
                    ),
                }
            })?;
        let mut metadata = self.inner.metadata(resolved_path.as_str()).await?;
        metadata.permissions = Some(permissions_value);
        self.inner
            .set_metadata(resolved_path.as_str(), metadata)
            .await?;
        let updated_metadata = self.inner.metadata(resolved_path.as_str()).await?;
        let kind = map_metadata(&updated_metadata).kind;

        Ok(SftpChmod {
            requested_path,
            resolved_path,
            permissions_octal: normalized_permissions,
            kind,
        })
    }

    pub async fn write_file(
        &self,
        path: &str,
        content: &[u8],
    ) -> Result<SftpFileWrite, SshClientError> {
        let requested_path = normalize_requested_path(path);
        let resolved_path =
            resolve_destination_file_path(&self.inner, requested_path.as_str()).await?;
        let mut remote_file = self.inner.create(resolved_path.as_str()).await?;
        remote_file.write_all(content).await?;
        remote_file.sync_all().await?;
        remote_file.shutdown().await?;

        Ok(SftpFileWrite {
            requested_path,
            resolved_path,
            written_bytes: content.len() as u64,
        })
    }

    pub async fn mkdir(&self, path: &str) -> Result<SftpDirectoryCreate, SshClientError> {
        let requested_path = normalize_requested_path(path);
        let resolved_path = resolve_child_path(
            &self.inner,
            requested_path.as_str(),
            "생성할 원격 디렉터리 경로에 폴더명이 필요합니다.",
        )
        .await?;
        self.inner.create_dir(resolved_path.as_str()).await?;

        Ok(SftpDirectoryCreate {
            requested_path,
            resolved_path,
        })
    }

    pub async fn delete(&self, path: &str, recursive: bool) -> Result<SftpDelete, SshClientError> {
        let requested_path = normalize_requested_path(path);
        let resolved_path = self.inner.canonicalize(requested_path.as_str()).await?;
        let metadata = self.inner.metadata(resolved_path.as_str()).await?;
        let kind = map_metadata(&metadata).kind;

        let deleted_count = match kind {
            SftpEntryKind::Directory => {
                if recursive {
                    delete_directory_recursive(&self.inner, resolved_path.as_str()).await?
                } else {
                    self.inner.remove_dir(resolved_path.as_str()).await?;
                    1
                }
            }
            SftpEntryKind::File | SftpEntryKind::Symlink | SftpEntryKind::Other => {
                self.inner.remove_file(resolved_path.as_str()).await?;
                1
            }
        };

        Ok(SftpDelete {
            requested_path,
            resolved_path,
            kind,
            deleted_count,
        })
    }

    pub async fn close(&self) -> Result<(), SshClientError> {
        self.inner.close().await?;
        Ok(())
    }
}

fn normalize_requested_path(path: &str) -> String {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        ".".to_string()
    } else {
        trimmed.to_string()
    }
}

async fn resolve_destination_file_path(
    session: &SftpSession,
    destination_path: &str,
) -> Result<String, SshClientError> {
    resolve_child_path(
        session,
        destination_path,
        "업로드 대상 경로에 파일명이 필요합니다.",
    )
    .await
}

fn normalize_permissions_octal(permissions_octal: &str) -> Result<String, SshClientError> {
    let trimmed = permissions_octal.trim();
    if trimmed.is_empty() {
        return Err(SshClientError::Config {
            message: "권한 8진수 값이 비어 있습니다.".to_string(),
        });
    }
    if !trimmed
        .chars()
        .all(|character| matches!(character, '0'..='7'))
    {
        return Err(SshClientError::Config {
            message: format!(
                "유효한 권한 8진수(예: 644, 755)를 입력해 주십시오: {permissions_octal}"
            ),
        });
    }

    let normalized = trimmed.trim_start_matches('0');
    let digits = if normalized.is_empty() {
        "0"
    } else {
        normalized
    };
    if digits.len() > 4 {
        return Err(SshClientError::Config {
            message: format!("권한 8진수는 최대 4자리까지만 허용합니다: {permissions_octal}"),
        });
    }

    Ok(digits.to_string())
}

async fn resolve_child_path(
    session: &SftpSession,
    requested_path: &str,
    missing_name_message: &str,
) -> Result<String, SshClientError> {
    let requested_path = normalize_requested_path(requested_path);
    let trimmed = requested_path.trim_end_matches('/');
    if trimmed.is_empty() || trimmed == "." {
        return Err(SshClientError::Config {
            message: missing_name_message.to_string(),
        });
    }

    let (parent, name) = trimmed
        .rsplit_once('/')
        .map(|(prefix, file_name)| {
            if prefix.is_empty() {
                ("/", file_name)
            } else {
                (prefix, file_name)
            }
        })
        .unwrap_or((".", trimmed));
    if name.is_empty() {
        return Err(SshClientError::Config {
            message: missing_name_message.to_string(),
        });
    }

    let resolved_parent = session.canonicalize(parent).await?;
    Ok(build_child_path(&resolved_parent, name))
}

fn build_child_path(parent: &str, name: &str) -> String {
    if parent == "/" {
        format!("/{name}")
    } else {
        format!("{}/{}", parent.trim_end_matches('/'), name)
    }
}

fn parent_path(path: &str) -> Option<String> {
    if path == "/" {
        return None;
    }

    let trimmed = path.trim_end_matches('/');
    let parent = trimmed
        .rsplit_once('/')
        .map(|(prefix, _)| prefix)
        .unwrap_or("");
    Some(if parent.is_empty() {
        "/".to_string()
    } else {
        parent.to_string()
    })
}

fn map_metadata(metadata: &Metadata) -> SftpPathMetadata {
    SftpPathMetadata {
        kind: map_kind(metadata),
        size_bytes: metadata.size,
        permissions_octal: metadata
            .permissions
            .map(|permissions| format!("{permissions:o}")),
        modified_at_epoch: metadata.mtime.map(u64::from),
    }
}

fn map_kind(metadata: &Metadata) -> SftpEntryKind {
    if metadata.is_dir() {
        SftpEntryKind::Directory
    } else if metadata.is_regular() {
        SftpEntryKind::File
    } else if metadata.is_symlink() {
        SftpEntryKind::Symlink
    } else {
        SftpEntryKind::Other
    }
}

fn entry_kind_rank(kind: SftpEntryKind) -> u8 {
    match kind {
        SftpEntryKind::Directory => 0,
        SftpEntryKind::File => 1,
        SftpEntryKind::Symlink => 2,
        SftpEntryKind::Other => 3,
    }
}

async fn copy_remote_file(
    session: &SftpSession,
    source_path: &str,
    destination_path: &str,
) -> Result<u64, SshClientError> {
    let mut remote_source = session.open(source_path).await?;
    let mut remote_destination = session.create(destination_path).await?;
    let copied_bytes = copy(&mut remote_source, &mut remote_destination)
        .await
        .map_err(|error| SshClientError::Transport {
            error: format!("SFTP remote copy stream failed: {error}"),
        })?;
    remote_destination.sync_all().await?;
    remote_destination.shutdown().await?;
    Ok(copied_bytes)
}

async fn copy_directory_recursive(
    session: &SftpSession,
    source_directory_path: &str,
    destination_directory_path: &str,
) -> Result<u64, SshClientError> {
    session.create_dir(destination_directory_path).await?;
    let mut copied_bytes = 0_u64;
    let mut pending_directories = vec![(
        source_directory_path.to_string(),
        destination_directory_path.to_string(),
    )];

    while let Some((current_source_path, current_destination_path)) = pending_directories.pop() {
        let entries = session.read_dir(current_source_path.as_str()).await?;
        for entry in entries {
            let child_source_path = build_child_path(&current_source_path, &entry.file_name());
            let child_destination_path =
                build_child_path(&current_destination_path, &entry.file_name());
            let child_kind = map_metadata(&entry.metadata()).kind;

            match child_kind {
                SftpEntryKind::Directory => {
                    session.create_dir(child_destination_path.as_str()).await?;
                    pending_directories.push((child_source_path, child_destination_path));
                }
                SftpEntryKind::File | SftpEntryKind::Symlink | SftpEntryKind::Other => {
                    copied_bytes += copy_remote_file(
                        session,
                        child_source_path.as_str(),
                        child_destination_path.as_str(),
                    )
                    .await?;
                }
            }
        }
    }

    Ok(copied_bytes)
}

async fn delete_directory_recursive(
    session: &SftpSession,
    root_path: &str,
) -> Result<u32, SshClientError> {
    let mut deleted_count = 0_u32;
    let mut pending = vec![(root_path.to_string(), false)];

    while let Some((current_path, visited)) = pending.pop() {
        let metadata = session.metadata(current_path.as_str()).await?;
        let kind = map_metadata(&metadata).kind;

        if kind == SftpEntryKind::Directory {
            if visited {
                session.remove_dir(current_path.as_str()).await?;
                deleted_count = deleted_count.saturating_add(1);
                continue;
            }

            pending.push((current_path.clone(), true));
            let entries = session.read_dir(current_path.as_str()).await?;
            for entry in entries.collect::<Vec<_>>().into_iter().rev() {
                pending.push((build_child_path(&current_path, &entry.file_name()), false));
            }
            continue;
        }

        session.remove_file(current_path.as_str()).await?;
        deleted_count = deleted_count.saturating_add(1);
    }

    Ok(deleted_count)
}
