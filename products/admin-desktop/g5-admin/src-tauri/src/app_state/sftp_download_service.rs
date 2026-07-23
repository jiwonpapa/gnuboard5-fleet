use super::sftp_support::SftpAccessGate;
use super::sftp_transfer_ops;
use super::ssh_runtime::SshSessionRuntime;
use crate::core::ports::SiteCatalogStorePort;
use crate::error::AppError;
use g5_admin_models::models::ssh::{SftpDownloadInput, SftpDownloadResponse};

pub(crate) struct SftpDownloadService<'a> {
    access_gate: &'a (dyn SftpAccessGate + Send + Sync),
    site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
    runtime: SshSessionRuntime<'a>,
}

impl<'a> SftpDownloadService<'a> {
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

    pub(crate) async fn download_file(
        &self,
        request_id: &str,
        input: SftpDownloadInput,
    ) -> Result<SftpDownloadResponse, AppError> {
        sftp_transfer_ops::download_file(
            self.access_gate,
            self.site_catalog_store,
            self.runtime,
            request_id,
            input,
        )
        .await
    }
}
