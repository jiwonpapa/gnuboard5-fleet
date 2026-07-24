use std::{
    collections::HashMap,
    fs,
    net::IpAddr,
    os::unix::fs::PermissionsExt,
    path::{Path, PathBuf},
    process::Stdio,
    sync::Arc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use g5_fleet_security::{OutboundTarget, SystemResolver, UrlGuard};
use g5_fleet_store::{FleetStore, JobRecord};
use getrandom::fill as random_fill;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use tempfile::TempDir;
use tokio::{
    io::{AsyncWriteExt, BufReader},
    process::{Child, ChildStderr, ChildStdin, ChildStdout, Command},
    sync::Mutex,
    time::timeout,
};

const SSH_BINARY: &str = "/usr/bin/ssh";
const SFTP_BINARY: &str = "/usr/bin/sftp";
const TICKET_TTL_SECONDS: i64 = 60;
const MAX_ACTIVE_TICKETS: usize = 1024;
const MAX_KEY_BYTES: usize = 256 * 1024;
const MAX_KNOWN_HOSTS_BYTES: usize = 256 * 1024;
const MAX_REMOTE_PATH_BYTES: usize = 4096;

#[derive(Debug, thiserror::Error)]
pub enum RemoteError {
    #[error("remote profile is invalid")]
    InvalidProfile,
    #[error("remote path is invalid")]
    InvalidPath,
    #[error("remote address failed public network validation")]
    AddressForbidden,
    #[error("terminal ticket is invalid, expired, consumed, or outside its owner/site boundary")]
    InvalidTicket,
    #[error("terminal ticket capacity is exhausted")]
    TicketCapacity,
    #[error("remote credential staging failed")]
    CredentialStaging,
    #[error("OpenSSH process failed")]
    Process,
    #[error("OpenSSH operation timed out")]
    Timeout,
    #[error("transfer job state failed")]
    Job,
}

pub type RemoteResult<T> = Result<T, RemoteError>;

#[derive(Clone, Deserialize, Serialize, PartialEq, Eq)]
pub struct SshProfile {
    pub username: String,
    pub host: String,
    pub port: u16,
    pub private_key: String,
    pub known_hosts: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct SshProfileSummary {
    pub username: String,
    pub host: String,
    pub port: u16,
    pub host_key_verification: String,
}

impl SshProfile {
    pub fn validate(&self) -> RemoteResult<()> {
        if self.username.is_empty()
            || self.username.len() > 64
            || !self
                .username
                .chars()
                .all(|character| character.is_ascii_alphanumeric() || "._-".contains(character))
            || self.host.is_empty()
            || self.host.len() > 253
            || self.port == 0
            || self.private_key.len() > MAX_KEY_BYTES
            || !self.private_key.contains("BEGIN")
            || !self.private_key.contains("PRIVATE KEY")
            || self.known_hosts.is_empty()
            || self.known_hosts.len() > MAX_KNOWN_HOSTS_BYTES
            || self.private_key.contains('\0')
            || self.known_hosts.contains('\0')
        {
            return Err(RemoteError::InvalidProfile);
        }
        let alias = host_key_alias(&self.host, self.port);
        if !self.known_hosts.lines().any(|line| {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                return false;
            }
            line.split_whitespace().next().is_some_and(|hosts| {
                hosts.starts_with("|1|") || hosts.split(',').any(|host| host == alias)
            })
        }) {
            return Err(RemoteError::InvalidProfile);
        }
        Ok(())
    }

    pub fn summary(&self) -> SshProfileSummary {
        SshProfileSummary {
            username: self.username.clone(),
            host: self.host.clone(),
            port: self.port,
            host_key_verification: "strict_known_hosts".to_owned(),
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct TerminalTicket {
    pub ticket: String,
    pub expires_at_unix: i64,
}

#[derive(Clone)]
pub struct TerminalTicketStore {
    inner: Arc<Mutex<HashMap<[u8; 32], TicketRecord>>>,
}

#[derive(Clone)]
struct TicketRecord {
    principal_id: String,
    site_id: String,
    expires_at_unix: i64,
}

impl Default for TerminalTicketStore {
    fn default() -> Self {
        Self {
            inner: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl TerminalTicketStore {
    pub async fn issue(&self, principal_id: &str, site_id: &str) -> RemoteResult<TerminalTicket> {
        let now = unix_timestamp()?;
        let mut tickets = self.inner.lock().await;
        tickets.retain(|_, record| record.expires_at_unix > now);
        if tickets.len() >= MAX_ACTIVE_TICKETS {
            return Err(RemoteError::TicketCapacity);
        }
        let ticket = random_token()?;
        let expires_at_unix = now + TICKET_TTL_SECONDS;
        tickets.insert(
            token_hash(&ticket),
            TicketRecord {
                principal_id: principal_id.to_owned(),
                site_id: site_id.to_owned(),
                expires_at_unix,
            },
        );
        Ok(TerminalTicket {
            ticket,
            expires_at_unix,
        })
    }

    pub async fn consume(
        &self,
        ticket: &str,
        principal_id: &str,
        site_id: &str,
    ) -> RemoteResult<()> {
        let now = unix_timestamp()?;
        let record = self
            .inner
            .lock()
            .await
            .remove(&token_hash(ticket))
            .ok_or(RemoteError::InvalidTicket)?;
        if record.expires_at_unix <= now
            || record.principal_id != principal_id
            || record.site_id != site_id
        {
            return Err(RemoteError::InvalidTicket);
        }
        Ok(())
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum SftpCommand {
    List { path: String },
    Mkdir { path: String },
    Rename { from: String, to: String },
    DeleteFile { path: String },
    DeleteDirectory { path: String },
}

impl SftpCommand {
    pub fn validate(&self) -> RemoteResult<()> {
        match self {
            Self::List { path }
            | Self::Mkdir { path }
            | Self::DeleteFile { path }
            | Self::DeleteDirectory { path } => validate_remote_path(path),
            Self::Rename { from, to } => {
                validate_remote_path(from)?;
                validate_remote_path(to)
            }
        }
    }

    fn batch_line(&self) -> RemoteResult<String> {
        self.validate()?;
        Ok(match self {
            Self::List { path } => format!("ls -la {}", quote_sftp(path)),
            Self::Mkdir { path } => format!("mkdir {}", quote_sftp(path)),
            Self::Rename { from, to } => {
                format!("rename {} {}", quote_sftp(from), quote_sftp(to))
            }
            Self::DeleteFile { path } => format!("rm {}", quote_sftp(path)),
            Self::DeleteDirectory { path } => format!("rmdir {}", quote_sftp(path)),
        })
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct SftpResult {
    pub output: String,
}

#[derive(Clone, Debug, Default)]
pub struct OpenSshExecutor;

impl OpenSshExecutor {
    pub async fn validate_target(&self, profile: &SshProfile) -> RemoteResult<()> {
        profile.validate()?;
        let guard = UrlGuard::new(SystemResolver);
        let target = guard
            .resolve_host_port(&profile.host, profile.port)
            .await
            .map_err(|_| RemoteError::AddressForbidden)?;
        guard
            .revalidate_before_connect(&target)
            .await
            .map_err(|_| RemoteError::AddressForbidden)
    }

    pub async fn spawn_terminal(&self, profile: &SshProfile) -> RemoteResult<TerminalProcess> {
        let prepared = PreparedConnection::new(profile).await?;
        let mut command = Command::new(SSH_BINARY);
        command
            .args(prepared.ssh_args())
            .arg("-tt")
            .arg(prepared.destination())
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);
        let mut child = command.spawn().map_err(|_| RemoteError::Process)?;
        let stdin = child.stdin.take().ok_or(RemoteError::Process)?;
        let stdout = child.stdout.take().ok_or(RemoteError::Process)?;
        let stderr = child.stderr.take().ok_or(RemoteError::Process)?;
        Ok(TerminalProcess {
            child,
            stdin: Some(stdin),
            stdout: Some(stdout),
            stderr: Some(stderr),
            _credentials: prepared.credentials,
        })
    }

    pub async fn sftp(
        &self,
        profile: &SshProfile,
        operation: &SftpCommand,
    ) -> RemoteResult<SftpResult> {
        let prepared = PreparedConnection::new(profile).await?;
        let mut command = Command::new(SFTP_BINARY);
        command
            .args(prepared.sftp_args())
            .arg(prepared.destination())
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);
        let mut child = command.spawn().map_err(|_| RemoteError::Process)?;
        child
            .stdin
            .take()
            .ok_or(RemoteError::Process)?
            .write_all(format!("{}\nquit\n", operation.batch_line()?).as_bytes())
            .await
            .map_err(|_| RemoteError::Process)?;
        let output = timeout(Duration::from_secs(30), child.wait_with_output())
            .await
            .map_err(|_| RemoteError::Timeout)?
            .map_err(|_| RemoteError::Process)?;
        if !output.status.success() {
            return Err(RemoteError::Process);
        }
        Ok(SftpResult {
            output: String::from_utf8_lossy(&output.stdout).into_owned(),
        })
    }

    pub async fn upload(
        &self,
        profile: &SshProfile,
        local_path: &Path,
        remote_path: &str,
    ) -> RemoteResult<()> {
        validate_remote_path(remote_path)?;
        if !local_path.is_file() || local_path.is_symlink() {
            return Err(RemoteError::InvalidPath);
        }
        let line = format!(
            "put {} {}",
            quote_sftp(&local_path.to_string_lossy()),
            quote_sftp(remote_path)
        );
        self.run_sftp_batch(profile, &line, Duration::from_secs(300))
            .await
            .map(|_| ())
    }

    pub async fn download(
        &self,
        profile: &SshProfile,
        remote_path: &str,
        local_path: &Path,
    ) -> RemoteResult<()> {
        validate_remote_path(remote_path)?;
        if local_path.exists() || local_path.is_symlink() {
            return Err(RemoteError::InvalidPath);
        }
        let line = format!(
            "get {} {}",
            quote_sftp(remote_path),
            quote_sftp(&local_path.to_string_lossy())
        );
        self.run_sftp_batch(profile, &line, Duration::from_secs(300))
            .await
            .map(|_| ())
    }

    async fn run_sftp_batch(
        &self,
        profile: &SshProfile,
        line: &str,
        deadline: Duration,
    ) -> RemoteResult<String> {
        let prepared = PreparedConnection::new(profile).await?;
        let mut command = Command::new(SFTP_BINARY);
        command
            .args(prepared.sftp_args())
            .arg(prepared.destination())
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);
        let mut child = command.spawn().map_err(|_| RemoteError::Process)?;
        child
            .stdin
            .take()
            .ok_or(RemoteError::Process)?
            .write_all(format!("{line}\nquit\n").as_bytes())
            .await
            .map_err(|_| RemoteError::Process)?;
        let output = timeout(deadline, child.wait_with_output())
            .await
            .map_err(|_| RemoteError::Timeout)?
            .map_err(|_| RemoteError::Process)?;
        if !output.status.success() {
            return Err(RemoteError::Process);
        }
        Ok(String::from_utf8_lossy(&output.stdout).into_owned())
    }
}

pub struct TerminalProcess {
    child: Child,
    stdin: Option<ChildStdin>,
    stdout: Option<ChildStdout>,
    stderr: Option<ChildStderr>,
    _credentials: TempDir,
}

impl TerminalProcess {
    pub fn take_stdin(&mut self) -> RemoteResult<ChildStdin> {
        self.stdin.take().ok_or(RemoteError::Process)
    }

    pub fn take_stdout(&mut self) -> RemoteResult<BufReader<ChildStdout>> {
        self.stdout
            .take()
            .map(BufReader::new)
            .ok_or(RemoteError::Process)
    }

    pub fn take_stderr(&mut self) -> RemoteResult<BufReader<ChildStderr>> {
        self.stderr
            .take()
            .map(BufReader::new)
            .ok_or(RemoteError::Process)
    }

    pub async fn terminate(&mut self) {
        let _ = self.child.kill().await;
        let _ = self.child.wait().await;
    }
}

#[derive(Clone)]
pub struct TransferCoordinator {
    store: FleetStore,
}

impl TransferCoordinator {
    pub fn new(store: FleetStore) -> Self {
        Self { store }
    }

    pub async fn queue(
        &self,
        owner_user_id: &str,
        site_id: &str,
        kind: &str,
        input: &Value,
    ) -> RemoteResult<JobRecord> {
        if !matches!(kind, "sftp_upload" | "sftp_download") {
            return Err(RemoteError::Job);
        }
        let job_id = format!("job_{}", random_token()?);
        self.store
            .create_job(&job_id, owner_user_id, Some(site_id), kind, input)
            .await
            .map_err(|_| RemoteError::Job)?;
        self.get(owner_user_id, &job_id).await
    }

    pub async fn get(&self, owner_user_id: &str, job_id: &str) -> RemoteResult<JobRecord> {
        self.store
            .owned_job(owner_user_id, job_id)
            .await
            .map_err(|_| RemoteError::Job)?
            .ok_or(RemoteError::Job)
    }

    pub async fn start(&self, owner_user_id: &str, job_id: &str) -> RemoteResult<()> {
        self.transition(owner_user_id, job_id, &["queued"], "running", None)
            .await
    }

    pub async fn succeed(&self, owner_user_id: &str, job_id: &str, bytes: u64) -> RemoteResult<()> {
        self.transition(
            owner_user_id,
            job_id,
            &["running"],
            "succeeded",
            Some(&json!({"bytes": bytes, "progress": 100})),
        )
        .await
    }

    pub async fn fail(&self, owner_user_id: &str, job_id: &str) -> RemoteResult<()> {
        self.transition(
            owner_user_id,
            job_id,
            &["running"],
            "failed",
            Some(&json!({"error_code": "remote_transfer_failed"})),
        )
        .await
    }

    pub async fn cancel(&self, owner_user_id: &str, job_id: &str) -> RemoteResult<()> {
        self.transition(
            owner_user_id,
            job_id,
            &["queued", "running"],
            "cancelled",
            Some(&json!({"cancelled": true})),
        )
        .await
    }

    pub async fn retry(&self, owner_user_id: &str, job_id: &str) -> RemoteResult<()> {
        self.transition(
            owner_user_id,
            job_id,
            &["failed", "cancelled"],
            "queued",
            None,
        )
        .await
    }

    async fn transition(
        &self,
        owner_user_id: &str,
        job_id: &str,
        from: &[&str],
        to: &str,
        result: Option<&Value>,
    ) -> RemoteResult<()> {
        self.store
            .transition_job(owner_user_id, job_id, from, to, result)
            .await
            .map_err(|_| RemoteError::Job)
    }
}

struct PreparedConnection {
    profile: SshProfileSummary,
    target: OutboundTarget,
    credentials: TempDir,
    key_path: PathBuf,
    known_hosts_path: PathBuf,
}

impl PreparedConnection {
    async fn new(profile: &SshProfile) -> RemoteResult<Self> {
        profile.validate()?;
        let guard = UrlGuard::new(SystemResolver);
        let target = guard
            .resolve_host_port(&profile.host, profile.port)
            .await
            .map_err(|_| RemoteError::AddressForbidden)?;
        guard
            .revalidate_before_connect(&target)
            .await
            .map_err(|_| RemoteError::AddressForbidden)?;
        let credentials = tempfile::Builder::new()
            .prefix("g5-fleet-remote-")
            .tempdir()
            .map_err(|_| RemoteError::CredentialStaging)?;
        fs::set_permissions(credentials.path(), fs::Permissions::from_mode(0o700))
            .map_err(|_| RemoteError::CredentialStaging)?;
        let key_path = credentials.path().join("identity");
        let known_hosts_path = credentials.path().join("known_hosts");
        write_private_file(&key_path, profile.private_key.as_bytes())?;
        write_private_file(&known_hosts_path, profile.known_hosts.as_bytes())?;
        Ok(Self {
            profile: profile.summary(),
            target,
            credentials,
            key_path,
            known_hosts_path,
        })
    }

    fn ssh_args(&self) -> Vec<String> {
        self.common_args("-p")
    }

    fn sftp_args(&self) -> Vec<String> {
        let mut args = vec!["-b".to_owned(), "-".to_owned()];
        args.extend(self.common_args("-P"));
        args
    }

    fn common_args(&self, port_flag: &str) -> Vec<String> {
        vec![
            "-i".to_owned(),
            self.key_path.to_string_lossy().into_owned(),
            port_flag.to_owned(),
            self.profile.port.to_string(),
            "-o".to_owned(),
            "BatchMode=yes".to_owned(),
            "-o".to_owned(),
            "IdentitiesOnly=yes".to_owned(),
            "-o".to_owned(),
            "StrictHostKeyChecking=yes".to_owned(),
            "-o".to_owned(),
            format!(
                "UserKnownHostsFile={}",
                self.known_hosts_path.to_string_lossy()
            ),
            "-o".to_owned(),
            "GlobalKnownHostsFile=/dev/null".to_owned(),
            "-o".to_owned(),
            format!(
                "HostKeyAlias={}",
                host_key_alias(&self.profile.host, self.profile.port)
            ),
            "-o".to_owned(),
            "ConnectTimeout=10".to_owned(),
            "-o".to_owned(),
            "LogLevel=ERROR".to_owned(),
        ]
    }

    fn destination(&self) -> String {
        let address = self
            .target
            .pinned_addresses
            .iter()
            .next()
            .expect("validated target has an address");
        let host = match address {
            IpAddr::V4(value) => value.to_string(),
            IpAddr::V6(value) => format!("[{value}]"),
        };
        format!("{}@{host}", self.profile.username)
    }
}

fn write_private_file(path: &Path, value: &[u8]) -> RemoteResult<()> {
    fs::write(path, value).map_err(|_| RemoteError::CredentialStaging)?;
    fs::set_permissions(path, fs::Permissions::from_mode(0o600))
        .map_err(|_| RemoteError::CredentialStaging)
}

fn validate_remote_path(path: &str) -> RemoteResult<()> {
    if path.is_empty()
        || path.len() > MAX_REMOTE_PATH_BYTES
        || !path.starts_with('/')
        || path.contains('\0')
        || path.contains('\n')
        || path.contains('\r')
    {
        Err(RemoteError::InvalidPath)
    } else {
        Ok(())
    }
}

fn quote_sftp(value: &str) -> String {
    format!("\"{}\"", value.replace('\\', "\\\\").replace('"', "\\\""))
}

fn host_key_alias(host: &str, port: u16) -> String {
    if port == 22 {
        host.to_owned()
    } else {
        format!("[{host}]:{port}")
    }
}

fn random_token() -> RemoteResult<String> {
    let mut bytes = [0_u8; 32];
    random_fill(&mut bytes).map_err(|_| RemoteError::Process)?;
    Ok(URL_SAFE_NO_PAD.encode(bytes))
}

fn token_hash(token: &str) -> [u8; 32] {
    Sha256::digest(token.as_bytes()).into()
}

fn unix_timestamp() -> RemoteResult<i64> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_secs() as i64)
        .map_err(|_| RemoteError::Process)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn profile() -> SshProfile {
        SshProfile {
            username: "deploy".to_owned(),
            host: "example.com".to_owned(),
            port: 22,
            private_key: [
                "-----BEGIN OPENSSH ",
                "PRIVATE KEY-----\nfixture\n-----END OPENSSH ",
                "PRIVATE KEY-----\n",
            ]
            .concat(),
            known_hosts: "example.com ssh-ed25519 AAAAC3NzaFixture".to_owned(),
        }
    }

    #[tokio::test]
    async fn terminal_ticket_is_single_use_and_owner_site_bound() {
        let tickets = TerminalTicketStore::default();
        let ticket = tickets.issue("user-a", "site-a").await.unwrap();
        assert!(
            tickets
                .consume(&ticket.ticket, "user-b", "site-a")
                .await
                .is_err()
        );
        let ticket = tickets.issue("user-a", "site-a").await.unwrap();
        tickets
            .consume(&ticket.ticket, "user-a", "site-a")
            .await
            .unwrap();
        assert!(
            tickets
                .consume(&ticket.ticket, "user-a", "site-a")
                .await
                .is_err()
        );
    }

    #[test]
    fn profile_and_sftp_paths_fail_closed() {
        assert!(profile().validate().is_ok());
        let mut invalid = profile();
        invalid.known_hosts = "other.example ssh-ed25519 key".to_owned();
        assert!(invalid.validate().is_err());
        assert!(
            SftpCommand::DeleteFile {
                path: "/safe/file.txt".to_owned()
            }
            .validate()
            .is_ok()
        );
        assert!(
            SftpCommand::DeleteFile {
                path: "/safe/file\nrm /other".to_owned()
            }
            .validate()
            .is_err()
        );
    }

    #[tokio::test]
    async fn transfer_jobs_are_persistent_owned_and_retryable() {
        let data = tempfile::tempdir().unwrap();
        let store = FleetStore::initialize(data.path(), "remote-test")
            .await
            .unwrap();
        store
            .create_user("user-a", "admin", b"fixture-password-hash-a")
            .await
            .unwrap();
        store
            .create_user("user-b", "other", b"fixture-password-hash-b")
            .await
            .unwrap();
        store
            .create_site("site-a", "user-a", "Site A", "https://example.com")
            .await
            .unwrap();
        let transfers = TransferCoordinator::new(store);
        let job = transfers
            .queue(
                "user-a",
                "site-a",
                "sftp_upload",
                &json!({"remote_path":"/uploads/file.bin","bytes":100}),
            )
            .await
            .unwrap();
        assert_eq!(job.state, "queued");
        assert!(transfers.get("user-b", &job.job_id).await.is_err());
        transfers.start("user-a", &job.job_id).await.unwrap();
        transfers.fail("user-a", &job.job_id).await.unwrap();
        transfers.retry("user-a", &job.job_id).await.unwrap();
        transfers.cancel("user-a", &job.job_id).await.unwrap();
        assert_eq!(
            transfers.get("user-a", &job.job_id).await.unwrap().state,
            "cancelled"
        );
    }
}
