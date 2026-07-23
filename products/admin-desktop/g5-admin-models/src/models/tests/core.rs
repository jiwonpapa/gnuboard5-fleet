use crate::models::auth::{AuthLoginInput, AuthSessionState, CommandMessage};
use crate::models::backup::{
    SiteBackupExportInput, SiteBackupExportResult, SiteBackupImportInput, SiteBackupImportResult,
};
use crate::models::debug::{
    DebugDevBootstrapResult, DebugDevBootstrapStatus, DebugLogTailResponse, DebugRuntimeInfo,
};
use crate::models::health::HealthResponse;
use crate::models::maintenance::{AdminMaintenanceResponse, AdminMaintenanceResult};
use crate::models::master_lock::{
    MasterLockSetupInput, MasterLockStatus, MasterLockTotpInput, MasterLockUnlockInput,
};
use crate::models::problem::{AppErrorPayload, ErrorGuide};
use crate::models::security::{
    FastUnlockStatus, MasterPasswordChangeInput, SecurityIdleTimeoutUpdateInput, SecuritySettings,
    SecurityStepUpAuthInput, TotpDisableInput, TotpEnrollmentChallenge, TotpSetupStartInput,
    TotpVerifyEnableInput,
};
use crate::models::site::{
    Site, SiteActivityListResponse, SiteActivityLog, SiteAddInput, SiteCatalog, SiteCatalogEntry,
    SiteDeleteInput, SiteHealthCheckInput, SiteHealthCheckResult, SiteSessionStatus,
    SiteSwitchInput, SiteUpdateInput,
};
use crate::models::ssh::{
    SftpChmodInput, SftpChmodResponse, SftpCopyInput, SftpCopyResponse, SftpDeleteInput,
    SftpDeleteResponse, SftpDirectoryEntry, SftpDirectoryListResponse, SftpDownloadInput,
    SftpDownloadResponse, SftpEntryKind, SftpListDirInput, SftpMkdirInput, SftpMkdirResponse,
    SftpMoveInput, SftpMoveResponse, SftpPathMetadata, SftpReadFileInput, SftpReadFileResponse,
    SftpStatInput, SftpStatResponse, SftpUploadInput, SftpUploadResponse, SftpWriteFileInput,
    SftpWriteFileResponse, SshAuthType, SshConnectInput, SshDisconnectInput, SshHostTrustInput,
    SshHostVerificationInput, SshHostVerificationResponse, SshKnownHostTrustState, SshProfile,
    SshProfileAddInput, SshProfileDeleteInput, SshProfileListInput, SshProfileListResponse,
    SshProfileUpdateInput, SshSessionProfileSummary, SshSessionStatusResponse, SshShellCloseInput,
    SshShellOpenInput, SshShellReadInput, SshShellReadResponse, SshShellResizeInput,
    SshShellStreamEvent, SshShellWriteInput, SshTerminalBridgeConnectInput,
    SshTerminalBridgeConnectionResponse,
};
use std::error::Error;
use ts_rs::{Config, TS};

pub(super) fn export(config: &Config) -> Result<(), Box<dyn Error>> {
    AuthLoginInput::export(config)?;
    AuthSessionState::export(config)?;
    CommandMessage::export(config)?;
    HealthResponse::export(config)?;
    SiteBackupExportResult::export(config)?;
    SiteBackupExportInput::export(config)?;
    SiteBackupImportInput::export(config)?;
    SiteBackupImportResult::export(config)?;
    MasterLockStatus::export(config)?;
    MasterLockSetupInput::export(config)?;
    MasterLockUnlockInput::export(config)?;
    MasterLockTotpInput::export(config)?;
    SecuritySettings::export(config)?;
    FastUnlockStatus::export(config)?;
    SecurityStepUpAuthInput::export(config)?;
    MasterPasswordChangeInput::export(config)?;
    SecurityIdleTimeoutUpdateInput::export(config)?;
    TotpSetupStartInput::export(config)?;
    TotpEnrollmentChallenge::export(config)?;
    TotpVerifyEnableInput::export(config)?;
    TotpDisableInput::export(config)?;
    Site::export(config)?;
    SiteSessionStatus::export(config)?;
    SiteCatalogEntry::export(config)?;
    SiteCatalog::export(config)?;
    SiteAddInput::export(config)?;
    SiteUpdateInput::export(config)?;
    SiteDeleteInput::export(config)?;
    SiteSwitchInput::export(config)?;
    SiteHealthCheckInput::export(config)?;
    SiteHealthCheckResult::export(config)?;
    SiteActivityLog::export(config)?;
    SiteActivityListResponse::export(config)?;
    SshAuthType::export(config)?;
    SshProfile::export(config)?;
    SshProfileListInput::export(config)?;
    SshProfileListResponse::export(config)?;
    SshProfileAddInput::export(config)?;
    SshProfileUpdateInput::export(config)?;
    SshProfileDeleteInput::export(config)?;
    SshConnectInput::export(config)?;
    SshKnownHostTrustState::export(config)?;
    SshHostVerificationInput::export(config)?;
    SshHostTrustInput::export(config)?;
    SshDisconnectInput::export(config)?;
    SshShellOpenInput::export(config)?;
    SshShellWriteInput::export(config)?;
    SshShellReadInput::export(config)?;
    SshShellResizeInput::export(config)?;
    SshShellCloseInput::export(config)?;
    SshTerminalBridgeConnectInput::export(config)?;
    SshTerminalBridgeConnectionResponse::export(config)?;
    SshSessionProfileSummary::export(config)?;
    SshSessionStatusResponse::export(config)?;
    SshHostVerificationResponse::export(config)?;
    SshShellReadResponse::export(config)?;
    SshShellStreamEvent::export(config)?;
    SftpEntryKind::export(config)?;
    SftpPathMetadata::export(config)?;
    SftpDirectoryEntry::export(config)?;
    SftpListDirInput::export(config)?;
    SftpDirectoryListResponse::export(config)?;
    SftpStatInput::export(config)?;
    SftpStatResponse::export(config)?;
    SftpReadFileInput::export(config)?;
    SftpReadFileResponse::export(config)?;
    SftpDownloadInput::export(config)?;
    SftpDownloadResponse::export(config)?;
    SftpUploadInput::export(config)?;
    SftpUploadResponse::export(config)?;
    SftpCopyInput::export(config)?;
    SftpCopyResponse::export(config)?;
    SftpMoveInput::export(config)?;
    SftpMoveResponse::export(config)?;
    SftpChmodInput::export(config)?;
    SftpChmodResponse::export(config)?;
    SftpDeleteInput::export(config)?;
    SftpDeleteResponse::export(config)?;
    SftpWriteFileInput::export(config)?;
    SftpWriteFileResponse::export(config)?;
    SftpMkdirInput::export(config)?;
    SftpMkdirResponse::export(config)?;
    ErrorGuide::export(config)?;
    AppErrorPayload::export(config)?;
    DebugRuntimeInfo::export(config)?;
    DebugLogTailResponse::export(config)?;
    DebugDevBootstrapStatus::export(config)?;
    DebugDevBootstrapResult::export(config)?;
    AdminMaintenanceResult::export(config)?;
    AdminMaintenanceResponse::export(config)?;
    Ok(())
}
