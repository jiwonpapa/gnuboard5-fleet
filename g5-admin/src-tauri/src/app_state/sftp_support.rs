use super::ssh_runtime::{ActiveSshSessionHandle, SshSessionRuntime};
use crate::core::ports::{SftpSessionPort, SiteCatalogStorePort};
use crate::error::AppError;
use std::sync::Arc;

pub(super) type SharedSftpSession = Arc<dyn SftpSessionPort + Send + Sync>;

#[async_trait::async_trait]
pub(super) trait SftpAccessGate: Send + Sync {
    async fn require_unlocked(&self) -> Result<(), AppError>;
}

pub(super) fn ensure_site_exists(
    site_catalog_store: &(dyn SiteCatalogStorePort + Send + Sync),
    site_id: &str,
) -> Result<(), AppError> {
    let exists = site_catalog_store
        .load_sites()?
        .into_iter()
        .any(|site| site.id == site_id);
    if exists {
        return Ok(());
    }

    Err(AppError::Config {
        message: format!("등록되지 않은 사이트입니다: {site_id}"),
    })
}

pub(super) fn record_opened_activity(
    site_catalog_store: &(dyn SiteCatalogStorePort + Send + Sync),
    site_id: &str,
) -> Result<(), AppError> {
    site_catalog_store.add_activity(
        Some(site_id),
        "site.sftp.open",
        Some("opened SFTP workspace"),
    )
}

pub(super) fn record_download_activity(
    site_catalog_store: &(dyn SiteCatalogStorePort + Send + Sync),
    site_id: &str,
    resolved_path: &str,
) -> Result<(), AppError> {
    site_catalog_store.add_activity(Some(site_id), "site.sftp.download", Some(resolved_path))
}

pub(super) fn record_upload_activity(
    site_catalog_store: &(dyn SiteCatalogStorePort + Send + Sync),
    site_id: &str,
    resolved_path: &str,
) -> Result<(), AppError> {
    site_catalog_store.add_activity(Some(site_id), "site.sftp.upload", Some(resolved_path))
}

pub(super) fn record_copy_activity(
    site_catalog_store: &(dyn SiteCatalogStorePort + Send + Sync),
    site_id: &str,
    resolved_path: &str,
) -> Result<(), AppError> {
    site_catalog_store.add_activity(Some(site_id), "site.sftp.copy", Some(resolved_path))
}

pub(super) fn record_move_activity(
    site_catalog_store: &(dyn SiteCatalogStorePort + Send + Sync),
    site_id: &str,
    resolved_path: &str,
) -> Result<(), AppError> {
    site_catalog_store.add_activity(Some(site_id), "site.sftp.move", Some(resolved_path))
}

pub(super) fn record_chmod_activity(
    site_catalog_store: &(dyn SiteCatalogStorePort + Send + Sync),
    site_id: &str,
    resolved_path: &str,
) -> Result<(), AppError> {
    site_catalog_store.add_activity(Some(site_id), "site.sftp.chmod", Some(resolved_path))
}

pub(super) fn record_delete_activity(
    site_catalog_store: &(dyn SiteCatalogStorePort + Send + Sync),
    site_id: &str,
    resolved_path: &str,
) -> Result<(), AppError> {
    site_catalog_store.add_activity(Some(site_id), "site.sftp.delete", Some(resolved_path))
}

pub(super) fn record_mkdir_activity(
    site_catalog_store: &(dyn SiteCatalogStorePort + Send + Sync),
    site_id: &str,
    resolved_path: &str,
) -> Result<(), AppError> {
    site_catalog_store.add_activity(Some(site_id), "site.sftp.mkdir", Some(resolved_path))
}

pub(super) fn record_write_activity(
    site_catalog_store: &(dyn SiteCatalogStorePort + Send + Sync),
    site_id: &str,
    resolved_path: &str,
) -> Result<(), AppError> {
    site_catalog_store.add_activity(Some(site_id), "site.sftp.write", Some(resolved_path))
}

pub(super) async fn require_sftp_session(
    runtime: SshSessionRuntime<'_>,
    site_id: &str,
) -> Result<(SharedSftpSession, bool), AppError> {
    let active = runtime
        .connection(site_id)
        .await
        .ok_or_else(|| AppError::Config {
            message: "현재 사이트에 활성 SSH 연결이 없습니다. 먼저 SSH 프로필을 연결해 주십시오."
                .to_string(),
        })?;
    load_or_open_sftp(active).await
}

async fn load_or_open_sftp(
    active: ActiveSshSessionHandle,
) -> Result<(SharedSftpSession, bool), AppError> {
    if let Some(existing) = active.sftp.read().await.clone() {
        return Ok((existing, false));
    }

    let opened = active.connection.open_sftp().await?;
    let mut slot = active.sftp.write().await;
    if let Some(existing) = slot.clone() {
        return Ok((existing, false));
    }
    *slot = Some(opened.clone());
    Ok((opened, true))
}
