#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SshProfileAuthType {
    Password,
    Key,
    Agent,
}

#[derive(Debug, Clone)]
pub struct SiteCatalogInsertInput {
    pub name: String,
    pub api_base_url: String,
    pub is_default: bool,
}

#[derive(Debug, Clone)]
pub struct SiteCatalogUpdateInput {
    pub site_id: String,
    pub name: String,
    pub api_base_url: String,
    pub is_default: bool,
}

#[derive(Debug, Clone)]
pub struct AuthLoginRecord {
    pub mb_id: String,
    pub mb_password: String,
}

#[derive(Debug, Clone)]
pub struct TokenPairRecord {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: u64,
}

#[derive(Debug, Clone)]
pub struct StoredSessionRecord {
    pub mb_id: String,
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: u64,
}

#[derive(Debug, Clone)]
pub struct SiteRecord {
    pub id: String,
    pub name: String,
    pub api_base_url: String,
    pub is_default: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone)]
pub struct SiteActivityLogRecord {
    pub id: i64,
    pub site_id: Option<String>,
    pub action: String,
    pub detail: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone)]
pub struct MemberProfileRecord {
    pub mb_id: String,
    pub mb_name: Option<String>,
    pub mb_nick: Option<String>,
    pub mb_email: Option<String>,
    pub mb_level: Option<i32>,
    pub mb_point: Option<i32>,
}

#[derive(Debug, Clone)]
pub struct SshProfileInsertInput {
    pub site_id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_type: SshProfileAuthType,
    pub key_path: Option<String>,
    pub password: Option<String>,
    pub key_passphrase: Option<String>,
}

#[derive(Debug, Clone)]
pub struct SshProfileUpdateRecord {
    pub site_id: String,
    pub ssh_profile_id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_type: SshProfileAuthType,
    pub key_path: Option<String>,
    pub password: Option<String>,
    pub key_passphrase: Option<String>,
    pub clear_password: bool,
    pub clear_key_passphrase: bool,
}

#[derive(Debug, Clone)]
pub struct SshConnectionProfile {
    pub id: String,
    pub site_id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_type: SshProfileAuthType,
    pub key_path: Option<String>,
}

#[derive(Debug, Clone)]
pub struct SshProfileRecord {
    pub id: String,
    pub site_id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_type: SshProfileAuthType,
    pub key_path: Option<String>,
    pub has_password: bool,
    pub has_key_passphrase: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone)]
pub struct SshProfileConnectionTarget {
    pub profile: SshConnectionProfile,
    pub password: Option<String>,
    pub key_passphrase: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SshKnownHostTrustStateResult {
    Trusted,
    Missing,
    Changed,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SshHostVerificationResult {
    pub server_key_algorithm: String,
    pub server_key_fingerprint: String,
    pub trust_state: SshKnownHostTrustStateResult,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SftpEntryKindResult {
    Directory,
    File,
    Symlink,
    Other,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpPathMetadataResult {
    pub kind: SftpEntryKindResult,
    pub size_bytes: Option<u64>,
    pub permissions_octal: Option<String>,
    pub modified_at_epoch: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpDirectoryEntryResult {
    pub name: String,
    pub path: String,
    pub metadata: SftpPathMetadataResult,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpDirectoryListResult {
    pub requested_path: String,
    pub resolved_path: String,
    pub parent_path: Option<String>,
    pub entries: Vec<SftpDirectoryEntryResult>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpStatResult {
    pub requested_path: String,
    pub resolved_path: String,
    pub metadata: SftpPathMetadataResult,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpReadFileResult {
    pub requested_path: String,
    pub resolved_path: String,
    pub content: Vec<u8>,
    pub truncated: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpDownloadResult {
    pub requested_path: String,
    pub resolved_path: String,
    pub copied_bytes: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpUploadResult {
    pub source_path: String,
    pub destination_path: String,
    pub resolved_path: String,
    pub copied_bytes: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpCopyResult {
    pub requested_source_path: String,
    pub source_resolved_path: String,
    pub requested_destination_path: String,
    pub resolved_destination_path: String,
    pub kind: SftpEntryKindResult,
    pub copied_bytes: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpMoveResult {
    pub requested_source_path: String,
    pub source_resolved_path: String,
    pub requested_destination_path: String,
    pub resolved_destination_path: String,
    pub kind: SftpEntryKindResult,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpChmodResult {
    pub requested_path: String,
    pub resolved_path: String,
    pub permissions_octal: String,
    pub kind: SftpEntryKindResult,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpDeleteResult {
    pub requested_path: String,
    pub resolved_path: String,
    pub kind: SftpEntryKindResult,
    pub deleted_count: u32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpWriteFileResult {
    pub requested_path: String,
    pub resolved_path: String,
    pub written_bytes: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpMkdirResult {
    pub requested_path: String,
    pub resolved_path: String,
}

#[derive(Debug, Clone, Default)]
pub struct SshShellReadResult {
    pub stdout: String,
    pub stderr: String,
    pub closed: bool,
    pub exit_status: Option<u32>,
    pub exit_signal: Option<String>,
}

#[derive(Debug, Clone, Default)]
pub struct AppLockState {
    pub passkey_enabled: bool,
}

#[derive(Debug, Clone, Default)]
pub struct BackupImportReport {
    pub imported_site_count: usize,
    pub reused_site_count: usize,
    pub copied_setting_count: usize,
}

#[cfg(test)]
mod tests;
