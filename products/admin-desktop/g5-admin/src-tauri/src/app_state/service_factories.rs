use std::sync::Arc;

use super::dev_bootstrap_service::DevBootstrapService;
use super::session_service::SessionService;
use super::sftp_chmod_service::SftpChmodService;
use super::sftp_copy_service::SftpCopyService;
use super::sftp_delete_service::SftpDeleteService;
use super::sftp_download_service::SftpDownloadService;
use super::sftp_mkdir_service::SftpMkdirService;
use super::sftp_move_service::SftpMoveService;
use super::sftp_service::SftpService;
use super::sftp_transfer_service::SftpTransferService;
use super::sftp_upload_service::SftpUploadService;
use super::sftp_write_service::SftpWriteService;
use super::site_catalog_service::{SiteCatalogRuntime, SiteCatalogService};
use super::ssh_host_verification_service::SshHostVerificationService;
use super::ssh_profile_service::SshProfileService;
use super::ssh_runtime::SshSessionRuntime;
use super::ssh_session_service::SshSessionService;
use super::ssh_terminal_bridge_service::SshTerminalBridgeService;
use super::AppState;

impl AppState {
    pub(crate) fn dev_bootstrap_service(&self) -> DevBootstrapService<'_> {
        DevBootstrapService::new(
            self,
            &self.runtime_config,
            self.admin_api(),
            self.master_lock_service(),
            self.session_service(),
            self.site_catalog_service(),
            self.ssh_profile_service(),
            self.site_catalog_store(),
            self.ssh_profile_store(),
        )
    }

    pub(crate) fn site_catalog_service(&self) -> SiteCatalogService<'_> {
        SiteCatalogService::new(
            self,
            self.admin_api(),
            self.session_store(),
            self.site_catalog_store(),
            &self.active_request_context,
            SiteCatalogRuntime::new(&self.site_manager, &self.sites_initialized),
        )
    }

    pub(crate) fn session_service(&self) -> SessionService<'_> {
        SessionService::new(self.session_store(), self.site_catalog_store())
    }

    pub(crate) fn ssh_profile_service(&self) -> SshProfileService<'_> {
        SshProfileService::new(self, self.site_catalog_store(), self.ssh_profile_store())
    }

    pub(crate) fn ssh_session_service(&self) -> SshSessionService<'_> {
        SshSessionService::new(
            self,
            self.site_catalog_store(),
            self.ssh_profile_store(),
            self.ssh_connector(),
            self.current_app_handle(),
            SshSessionRuntime::new(&self.ssh_sessions),
        )
    }

    pub(crate) fn ssh_host_verification_service(&self) -> SshHostVerificationService<'_> {
        SshHostVerificationService::new(
            self,
            self.site_catalog_store(),
            self.ssh_profile_store(),
            self.ssh_host_verifier(),
        )
    }

    pub(crate) fn ssh_terminal_bridge_service(&self) -> SshTerminalBridgeService<'_> {
        SshTerminalBridgeService::new(
            self,
            self.site_catalog_store(),
            SshSessionRuntime::new(&self.ssh_sessions),
            self.ssh_terminal_bridge(),
            self.current_app_handle(),
        )
    }

    pub(crate) fn sftp_service(&self) -> SftpService<'_> {
        SftpService::new(
            self,
            self.site_catalog_store(),
            SshSessionRuntime::new(&self.ssh_sessions),
        )
    }

    pub(crate) fn sftp_transfer_service(&self) -> SftpTransferService {
        SftpTransferService::new(
            Arc::new(self.clone()),
            Arc::new(self.store_ports.clone()),
            Arc::clone(&self.ssh_sessions),
            Arc::clone(&self.sftp_transfer_host),
            self.current_app_handle(),
        )
    }

    pub(crate) fn sftp_download_service(&self) -> SftpDownloadService<'_> {
        SftpDownloadService::new(
            self,
            self.site_catalog_store(),
            SshSessionRuntime::new(&self.ssh_sessions),
        )
    }

    pub(crate) fn sftp_copy_service(&self) -> SftpCopyService<'_> {
        SftpCopyService::new(
            self,
            self.site_catalog_store(),
            SshSessionRuntime::new(&self.ssh_sessions),
        )
    }

    pub(crate) fn sftp_move_service(&self) -> SftpMoveService<'_> {
        SftpMoveService::new(
            self,
            self.site_catalog_store(),
            SshSessionRuntime::new(&self.ssh_sessions),
        )
    }

    pub(crate) fn sftp_chmod_service(&self) -> SftpChmodService<'_> {
        SftpChmodService::new(
            self,
            self.site_catalog_store(),
            SshSessionRuntime::new(&self.ssh_sessions),
        )
    }

    pub(crate) fn sftp_delete_service(&self) -> SftpDeleteService<'_> {
        SftpDeleteService::new(
            self,
            self.site_catalog_store(),
            SshSessionRuntime::new(&self.ssh_sessions),
        )
    }

    pub(crate) fn sftp_upload_service(&self) -> SftpUploadService<'_> {
        SftpUploadService::new(
            self,
            self.site_catalog_store(),
            SshSessionRuntime::new(&self.ssh_sessions),
        )
    }

    pub(crate) fn sftp_mkdir_service(&self) -> SftpMkdirService<'_> {
        SftpMkdirService::new(
            self,
            self.site_catalog_store(),
            SshSessionRuntime::new(&self.ssh_sessions),
        )
    }

    pub(crate) fn sftp_write_service(&self) -> SftpWriteService<'_> {
        SftpWriteService::new(
            self,
            self.site_catalog_store(),
            SshSessionRuntime::new(&self.ssh_sessions),
        )
    }
}
