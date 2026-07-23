use crate::connection::SshConnection;
use std::path::PathBuf;

#[derive(Debug, Clone)]
pub enum SshAuthConfig {
    Password {
        password: String,
    },
    Key {
        key_path: PathBuf,
        passphrase: Option<String>,
    },
    Agent,
}

#[derive(Debug, Clone)]
pub struct SshConnectRequest {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth: SshAuthConfig,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SshKnownHostTrustState {
    Trusted,
    Missing,
    Changed,
}

#[derive(Debug, Clone)]
pub struct SshConnectedMetadata {
    pub server_key_algorithm: String,
    pub server_key_fingerprint: String,
}

pub struct SshConnectedSession {
    pub connection: SshConnection,
    pub metadata: SshConnectedMetadata,
}

#[derive(Debug, Clone)]
pub struct SshHostVerificationInspection {
    pub server_key_algorithm: String,
    pub server_key_fingerprint: String,
    pub trust_state: SshKnownHostTrustState,
}

#[derive(Debug, Clone, Default)]
pub struct SshShellReadOutput {
    pub stdout: String,
    pub stderr: String,
    pub closed: bool,
    pub exit_status: Option<u32>,
    pub exit_signal: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SftpEntryKind {
    Directory,
    File,
    Symlink,
    Other,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpPathMetadata {
    pub kind: SftpEntryKind,
    pub size_bytes: Option<u64>,
    pub permissions_octal: Option<String>,
    pub modified_at_epoch: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpDirectoryEntry {
    pub name: String,
    pub path: String,
    pub metadata: SftpPathMetadata,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpDirectoryListing {
    pub requested_path: String,
    pub resolved_path: String,
    pub parent_path: Option<String>,
    pub entries: Vec<SftpDirectoryEntry>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpStat {
    pub requested_path: String,
    pub resolved_path: String,
    pub metadata: SftpPathMetadata,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpFileRead {
    pub requested_path: String,
    pub resolved_path: String,
    pub content: Vec<u8>,
    pub truncated: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpDownload {
    pub requested_path: String,
    pub resolved_path: String,
    pub copied_bytes: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpUpload {
    pub source_path: String,
    pub destination_path: String,
    pub resolved_path: String,
    pub copied_bytes: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpCopy {
    pub requested_source_path: String,
    pub source_resolved_path: String,
    pub requested_destination_path: String,
    pub resolved_destination_path: String,
    pub kind: SftpEntryKind,
    pub copied_bytes: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpMove {
    pub requested_source_path: String,
    pub source_resolved_path: String,
    pub requested_destination_path: String,
    pub resolved_destination_path: String,
    pub kind: SftpEntryKind,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpChmod {
    pub requested_path: String,
    pub resolved_path: String,
    pub permissions_octal: String,
    pub kind: SftpEntryKind,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpFileWrite {
    pub requested_path: String,
    pub resolved_path: String,
    pub written_bytes: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpDirectoryCreate {
    pub requested_path: String,
    pub resolved_path: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpDelete {
    pub requested_path: String,
    pub resolved_path: String,
    pub kind: SftpEntryKind,
    pub deleted_count: u32,
}
