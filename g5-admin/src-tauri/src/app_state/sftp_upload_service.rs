use super::sftp_support::SftpAccessGate;
use super::sftp_transfer_ops;
use super::ssh_runtime::SshSessionRuntime;
use crate::core::ports::SiteCatalogStorePort;
use crate::error::AppError;
use g5_admin_models::models::ssh::{SftpUploadInput, SftpUploadResponse};

pub(crate) struct SftpUploadService<'a> {
    access_gate: &'a (dyn SftpAccessGate + Send + Sync),
    site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
    runtime: SshSessionRuntime<'a>,
}

impl<'a> SftpUploadService<'a> {
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

    pub(crate) async fn upload_file(
        &self,
        request_id: &str,
        input: SftpUploadInput,
    ) -> Result<SftpUploadResponse, AppError> {
        sftp_transfer_ops::upload_file(
            self.access_gate,
            self.site_catalog_store,
            self.runtime,
            request_id,
            input,
        )
        .await
    }
}
