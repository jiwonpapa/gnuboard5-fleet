use g5_admin_app_error::AppError;
pub use g5_admin_port_types::{
    SftpChmodResult, SftpCopyResult, SftpDeleteResult, SftpDirectoryListResult, SftpDownloadResult,
    SftpMkdirResult, SftpMoveResult, SftpReadFileResult, SftpStatResult, SftpUploadResult,
    SftpWriteFileResult, SshConnectionProfile, SshHostVerificationResult, SshProfileAuthType,
    SshProfileConnectionTarget, SshShellReadResult,
};
use std::path::Path;
use std::sync::Arc;

pub struct EstablishedSshConnection {
    pub connection: Arc<dyn SshConnectionPort + Send + Sync>,
    pub server_key_algorithm: String,
    pub server_key_fingerprint: String,
}

#[async_trait::async_trait]
pub trait SshConnectionPort: Send + Sync {
    async fn open_shell(&self) -> Result<Arc<dyn SshShellPort + Send + Sync>, AppError>;
    async fn open_sftp(&self) -> Result<Arc<dyn SftpSessionPort + Send + Sync>, AppError>;
    async fn disconnect(&self) -> Result<(), AppError>;
}

#[async_trait::async_trait]
pub trait SshShellPort: Send + Sync {
    async fn write(&self, data: &str) -> Result<(), AppError>;
    async fn read(&self) -> Result<SshShellReadResult, AppError>;
    async fn read_blocking(&self) -> Result<SshShellReadResult, AppError>;
    async fn snapshot(&self) -> Result<String, AppError>;
    async fn resize(&self, cols: u32, rows: u32) -> Result<(), AppError>;
    async fn close(&self) -> Result<(), AppError>;
}

#[async_trait::async_trait]
pub trait SftpSessionPort: Send + Sync {
    async fn list_dir(&self, path: &str) -> Result<SftpDirectoryListResult, AppError>;
    async fn stat(&self, path: &str) -> Result<SftpStatResult, AppError>;
    async fn read_file(&self, path: &str, max_bytes: usize)
        -> Result<SftpReadFileResult, AppError>;
    async fn download_file(
        &self,
        path: &str,
        destination_path: &Path,
    ) -> Result<SftpDownloadResult, AppError>;
    async fn upload_file(
        &self,
        source_path: &Path,
        destination_path: &str,
    ) -> Result<SftpUploadResult, AppError>;
    async fn copy_path(
        &self,
        source_path: &str,
        destination_path: &str,
    ) -> Result<SftpCopyResult, AppError>;
    async fn move_path(
        &self,
        source_path: &str,
        destination_path: &str,
    ) -> Result<SftpMoveResult, AppError>;
    async fn chmod(&self, path: &str, permissions_octal: &str)
        -> Result<SftpChmodResult, AppError>;
    async fn delete(&self, path: &str, recursive: bool) -> Result<SftpDeleteResult, AppError>;
    async fn mkdir(&self, path: &str) -> Result<SftpMkdirResult, AppError>;
    async fn write_file(&self, path: &str, content: &[u8])
        -> Result<SftpWriteFileResult, AppError>;
    async fn close(&self) -> Result<(), AppError>;
}

#[async_trait::async_trait]
pub trait SshSessionConnectorPort: Send + Sync {
    async fn connect(
        &self,
        target: SshProfileConnectionTarget,
    ) -> Result<EstablishedSshConnection, AppError>;
}

#[async_trait::async_trait]
pub trait SshHostVerificationPort: Send + Sync {
    async fn inspect_host_verification(
        &self,
        host: &str,
        port: u16,
    ) -> Result<SshHostVerificationResult, AppError>;
    async fn trust_host_verification(
        &self,
        host: &str,
        port: u16,
        expected_fingerprint: &str,
    ) -> Result<SshHostVerificationResult, AppError>;
}

#[cfg(test)]
mod tests;
