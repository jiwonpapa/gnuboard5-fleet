use super::sftp_support::{
    ensure_site_exists, record_download_activity, record_opened_activity, record_upload_activity,
    require_sftp_session, SftpAccessGate,
};
use super::ssh_runtime::SshSessionRuntime;
use crate::core::ports::SiteCatalogStorePort;
use crate::core::ports::{SftpEntryKindResult, SftpSessionPort};
use crate::error::AppError;
use g5_admin_models::models::ssh::{
    SftpDownloadInput, SftpDownloadResponse, SftpUploadInput, SftpUploadResponse,
};
use g5_admin_models::models::trace::ResponseTrace;
use std::path::{Path, PathBuf};
use tokio::fs;

pub(super) async fn download_file(
    access_gate: &(dyn SftpAccessGate + Send + Sync),
    site_catalog_store: &(dyn SiteCatalogStorePort + Send + Sync),
    runtime: SshSessionRuntime<'_>,
    request_id: &str,
    input: SftpDownloadInput,
) -> Result<SftpDownloadResponse, AppError> {
    access_gate.require_unlocked().await?;
    ensure_site_exists(site_catalog_store, &input.site_id)?;
    let destination_path = normalize_local_destination_path(&input.destination_path)?;
    let (session, opened) = require_sftp_session(runtime, &input.site_id).await?;
    if opened {
        record_opened_activity(site_catalog_store, &input.site_id)?;
    }

    let remote_stat = session.stat(&input.path).await?;
    let (download, local_destination_path) = match remote_stat.metadata.kind {
        SftpEntryKindResult::Directory => {
            let destination_root =
                destination_path.join(infer_path_name(&remote_stat.resolved_path));
            (
                download_directory_recursive(
                    session.as_ref(),
                    &remote_stat.resolved_path,
                    destination_root.as_path(),
                )
                .await?,
                destination_root.display().to_string(),
            )
        }
        _ => (
            session
                .download_file(&input.path, destination_path.as_path())
                .await?,
            destination_path.display().to_string(),
        ),
    };
    record_download_activity(
        site_catalog_store,
        &input.site_id,
        download.resolved_path.as_str(),
    )?;
    let trace = ResponseTrace::local(request_id.to_string());
    Ok(SftpDownloadResponse {
        site_id: input.site_id,
        requested_path: download.requested_path,
        resolved_path: download.resolved_path,
        destination_path: local_destination_path,
        copied_bytes: download.copied_bytes,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

pub(super) async fn upload_file(
    access_gate: &(dyn SftpAccessGate + Send + Sync),
    site_catalog_store: &(dyn SiteCatalogStorePort + Send + Sync),
    runtime: SshSessionRuntime<'_>,
    request_id: &str,
    input: SftpUploadInput,
) -> Result<SftpUploadResponse, AppError> {
    access_gate.require_unlocked().await?;
    ensure_site_exists(site_catalog_store, &input.site_id)?;
    let source_path = normalize_local_source_path(&input.source_path)?;
    let destination_path = normalize_remote_destination_path(&input.destination_path)?;
    let (session, opened) = require_sftp_session(runtime, &input.site_id).await?;
    if opened {
        record_opened_activity(site_catalog_store, &input.site_id)?;
    }

    let metadata =
        fs::metadata(source_path.as_path())
            .await
            .map_err(|error| AppError::Storage {
                target: source_path.display().to_string(),
                error: error.to_string(),
            })?;
    let upload = if metadata.is_dir() {
        upload_directory_recursive(
            session.as_ref(),
            source_path.as_path(),
            destination_path.as_str(),
        )
        .await?
    } else {
        session
            .upload_file(source_path.as_path(), destination_path.as_str())
            .await?
    };
    record_upload_activity(
        site_catalog_store,
        &input.site_id,
        upload.resolved_path.as_str(),
    )?;
    let trace = ResponseTrace::local(request_id.to_string());
    Ok(SftpUploadResponse {
        site_id: input.site_id,
        source_path: upload.source_path,
        destination_path: upload.destination_path,
        resolved_path: upload.resolved_path,
        copied_bytes: upload.copied_bytes,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

fn normalize_local_destination_path(destination_path: &str) -> Result<PathBuf, AppError> {
    let trimmed = destination_path.trim();
    if trimmed.is_empty() {
        return Err(AppError::Config {
            message: "다운로드 저장 경로가 비어 있습니다.".to_string(),
        });
    }

    Ok(PathBuf::from(trimmed))
}

fn normalize_local_source_path(source_path: &str) -> Result<PathBuf, AppError> {
    let trimmed = source_path.trim();
    if trimmed.is_empty() {
        return Err(AppError::Config {
            message: "업로드할 로컬 파일 경로가 비어 있습니다.".to_string(),
        });
    }

    Ok(PathBuf::from(trimmed))
}

fn normalize_remote_destination_path(destination_path: &str) -> Result<String, AppError> {
    let trimmed = destination_path.trim();
    if trimmed.is_empty() {
        return Err(AppError::Config {
            message: "업로드 대상 원격 경로가 비어 있습니다.".to_string(),
        });
    }

    Ok(trimmed.to_string())
}

async fn download_directory_recursive(
    session: &(dyn SftpSessionPort + Send + Sync),
    remote_root: &str,
    destination_root: &Path,
) -> Result<crate::core::ports::SftpDownloadResult, AppError> {
    ensure_local_directory(destination_root).await?;

    let mut copied_bytes = 0_u64;
    let mut pending = vec![(remote_root.to_string(), destination_root.to_path_buf())];

    while let Some((current_remote, current_local)) = pending.pop() {
        ensure_local_directory(current_local.as_path()).await?;
        let listing = session.list_dir(current_remote.as_str()).await?;
        for entry in listing.entries {
            let child_local_path = current_local.join(entry.name.as_str());
            match entry.metadata.kind {
                SftpEntryKindResult::Directory => {
                    ensure_local_directory(child_local_path.as_path()).await?;
                    pending.push((entry.path, child_local_path));
                }
                _ => {
                    let download = session
                        .download_file(entry.path.as_str(), child_local_path.as_path())
                        .await?;
                    copied_bytes = copied_bytes.saturating_add(download.copied_bytes);
                }
            }
        }
    }

    Ok(crate::core::ports::SftpDownloadResult {
        requested_path: remote_root.to_string(),
        resolved_path: remote_root.to_string(),
        copied_bytes,
    })
}

async fn upload_directory_recursive(
    session: &(dyn SftpSessionPort + Send + Sync),
    source_root: &Path,
    destination_root: &str,
) -> Result<crate::core::ports::SftpUploadResult, AppError> {
    ensure_remote_directory(session, destination_root).await?;

    let mut copied_bytes = 0_u64;
    let mut pending = vec![(source_root.to_path_buf(), destination_root.to_string())];

    while let Some((current_local, current_remote)) = pending.pop() {
        let mut directory = fs::read_dir(current_local.as_path())
            .await
            .map_err(|error| AppError::Storage {
                target: current_local.display().to_string(),
                error: error.to_string(),
            })?;

        while let Some(entry) = directory
            .next_entry()
            .await
            .map_err(|error| AppError::Storage {
                target: current_local.display().to_string(),
                error: error.to_string(),
            })?
        {
            let child_local_path = entry.path();
            let child_name = entry.file_name().to_string_lossy().into_owned();
            let child_remote_path =
                join_remote_child_path(current_remote.as_str(), child_name.as_str());
            let child_metadata = entry.metadata().await.map_err(|error| AppError::Storage {
                target: child_local_path.display().to_string(),
                error: error.to_string(),
            })?;

            if child_metadata.is_dir() {
                ensure_remote_directory(session, child_remote_path.as_str()).await?;
                pending.push((child_local_path, child_remote_path));
                continue;
            }

            let upload = session
                .upload_file(child_local_path.as_path(), child_remote_path.as_str())
                .await?;
            copied_bytes = copied_bytes.saturating_add(upload.copied_bytes);
        }
    }

    Ok(crate::core::ports::SftpUploadResult {
        source_path: source_root.display().to_string(),
        destination_path: destination_root.to_string(),
        resolved_path: destination_root.to_string(),
        copied_bytes,
    })
}

async fn ensure_local_directory(path: &Path) -> Result<(), AppError> {
    fs::create_dir_all(path)
        .await
        .map_err(|error| AppError::Storage {
            target: path.display().to_string(),
            error: error.to_string(),
        })
}

async fn ensure_remote_directory(
    session: &(dyn SftpSessionPort + Send + Sync),
    path: &str,
) -> Result<(), AppError> {
    match session.mkdir(path).await {
        Ok(_) => Ok(()),
        Err(error) => match session.stat(path).await {
            Ok(stat) if stat.metadata.kind == SftpEntryKindResult::Directory => Ok(()),
            _ => Err(error),
        },
    }
}

fn infer_path_name(path: &str) -> String {
    let trimmed = path.trim().trim_end_matches('/');
    trimmed
        .split('/')
        .rfind(|segment| !segment.is_empty())
        .unwrap_or("download")
        .to_string()
}

fn join_remote_child_path(parent_path: &str, child_name: &str) -> String {
    if parent_path == "/" {
        return format!("/{child_name}");
    }

    format!("{}/{}", parent_path.trim_end_matches('/'), child_name)
}
