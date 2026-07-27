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

use base64::{
    Engine,
    engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD},
};
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
    sync::{Mutex, watch},
    time::{sleep, timeout},
};

const SSH_BINARY: &str = "/usr/bin/ssh";
const SFTP_BINARY: &str = "/usr/bin/sftp";
const SSH_KEYSCAN_BINARY: &str = "/usr/bin/ssh-keyscan";
const TICKET_TTL_SECONDS: i64 = 60;
const MAX_ACTIVE_TICKETS: usize = 1024;
const MAX_KEY_BYTES: usize = 256 * 1024;
const MAX_KNOWN_HOSTS_BYTES: usize = 256 * 1024;
const MAX_REMOTE_PATH_BYTES: usize = 4096;

type TransferControlMap = HashMap<(String, String), watch::Sender<bool>>;

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
    #[error("remote operation was cancelled")]
    Cancelled,
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
    pub server_key_algorithm: String,
    pub server_key_fingerprint: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct HostKeyInspection {
    pub host: String,
    pub port: u16,
    pub server_key_algorithm: String,
    pub server_key_fingerprint: String,
    pub known_hosts_line: String,
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
        let (server_key_algorithm, server_key_fingerprint) = known_host_identity(&self.known_hosts)
            .unwrap_or_else(|| ("unknown".to_owned(), "SHA256:unavailable".to_owned()));
        SshProfileSummary {
            username: self.username.clone(),
            host: self.host.clone(),
            port: self.port,
            host_key_verification: "strict_known_hosts".to_owned(),
            server_key_algorithm,
            server_key_fingerprint,
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
    Stat { path: String },
    Mkdir { path: String },
    Chmod { path: String, mode: String },
    Copy { from: String, to: String },
    Rename { from: String, to: String },
    DeleteFile { path: String },
    DeleteDirectory { path: String },
}

impl SftpCommand {
    pub fn validate(&self) -> RemoteResult<()> {
        match self {
            Self::List { path }
            | Self::Stat { path }
            | Self::Mkdir { path }
            | Self::DeleteFile { path }
            | Self::DeleteDirectory { path } => validate_remote_path(path),
            Self::Chmod { path, mode } => {
                validate_remote_path(path)?;
                validate_octal_mode(mode)
            }
            Self::Copy { from, to } | Self::Rename { from, to } => {
                validate_remote_path(from)?;
                validate_remote_path(to)
            }
        }
    }

    fn batch_line(&self) -> RemoteResult<String> {
        self.validate()?;
        Ok(match self {
            Self::List { path } => format!("ls -la {}", quote_sftp(path)),
            Self::Stat { path } => format!("ls -l {}", quote_sftp(path)),
            Self::Mkdir { path } => format!("mkdir {}", quote_sftp(path)),
            Self::Chmod { path, mode } => {
                format!("chmod {mode} {}", quote_sftp(path))
            }
            Self::Copy { .. } => return Err(RemoteError::InvalidPath),
            Self::Rename { from, to } => {
                format!("rename {} {}", quote_sftp(from), quote_sftp(to))
            }
            Self::DeleteFile { path } => format!("rm {}", quote_sftp(path)),
            Self::DeleteDirectory { path } => format!("rmdir {}", quote_sftp(path)),
        })
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SftpEntryKind {
    Directory,
    File,
    Symlink,
    Other,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct SftpEntry {
    pub name: String,
    pub path: String,
    pub kind: SftpEntryKind,
    pub size: Option<u64>,
    pub permissions: String,
    pub owner: String,
    pub group: String,
    pub modified: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct SftpResult {
    pub output: String,
    pub resolved_path: Option<String>,
    pub parent_path: Option<String>,
    pub entries: Vec<SftpEntry>,
}

#[derive(Clone, Debug, Default)]
pub struct OpenSshExecutor;

impl OpenSshExecutor {
    pub async fn validate_target(&self, profile: &SshProfile) -> RemoteResult<()> {
        profile.validate()?;
        let guard = UrlGuard::managed_remote(SystemResolver);
        let target = guard
            .resolve_host_port(&profile.host, profile.port)
            .await
            .map_err(|_| RemoteError::AddressForbidden)?;
        guard
            .revalidate_before_connect(&target)
            .await
            .map_err(|_| RemoteError::AddressForbidden)
    }

    pub async fn inspect_host_key(&self, host: &str, port: u16) -> RemoteResult<HostKeyInspection> {
        let guard = UrlGuard::managed_remote(SystemResolver);
        let target = guard
            .resolve_host_port(host, port)
            .await
            .map_err(|_| RemoteError::AddressForbidden)?;
        guard
            .revalidate_before_connect(&target)
            .await
            .map_err(|_| RemoteError::AddressForbidden)?;
        let address = target
            .pinned_addresses
            .iter()
            .next()
            .ok_or(RemoteError::AddressForbidden)?;
        let output = timeout(
            Duration::from_secs(12),
            Command::new(SSH_KEYSCAN_BINARY)
                .args(["-T", "10", "-p", &port.to_string()])
                .arg(address.to_string())
                .kill_on_drop(true)
                .output(),
        )
        .await
        .map_err(|_| RemoteError::Timeout)?
        .map_err(|_| RemoteError::Process)?;
        if !output.status.success() && output.stdout.is_empty() {
            return Err(RemoteError::Process);
        }
        parse_keyscan_output(host, port, &String::from_utf8_lossy(&output.stdout))
            .ok_or(RemoteError::Process)
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
        if let SftpCommand::Copy { from, to } = operation {
            return self.copy(profile, from, to).await;
        }
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
        let output = String::from_utf8_lossy(&output.stdout).into_owned();
        let (resolved_path, parent_path, entries) = match operation {
            SftpCommand::List { path } => (
                Some(path.clone()),
                remote_parent(path),
                parse_sftp_listing(path, false, &output),
            ),
            SftpCommand::Stat { path } => (
                Some(path.clone()),
                remote_parent(path),
                parse_sftp_listing(path, true, &output),
            ),
            _ => (None, None, Vec::new()),
        };
        Ok(SftpResult {
            output,
            resolved_path,
            parent_path,
            entries,
        })
    }

    async fn copy(&self, profile: &SshProfile, from: &str, to: &str) -> RemoteResult<SftpResult> {
        validate_remote_path(from)?;
        validate_remote_path(to)?;
        let prepared = PreparedConnection::new(profile).await?;
        let output = timeout(
            Duration::from_secs(30),
            Command::new(SSH_BINARY)
                .args(prepared.ssh_args())
                .arg(prepared.destination())
                .arg(format!("cp -- {} {}", quote_shell(from), quote_shell(to)))
                .kill_on_drop(true)
                .output(),
        )
        .await
        .map_err(|_| RemoteError::Timeout)?
        .map_err(|_| RemoteError::Process)?;
        if !output.status.success() {
            return Err(RemoteError::Process);
        }
        Ok(SftpResult {
            output: String::from_utf8_lossy(&output.stdout).into_owned(),
            resolved_path: None,
            parent_path: None,
            entries: Vec::new(),
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
        self.run_sftp_batch(profile, &line, Duration::from_secs(300), None)
            .await
            .map(|_| ())
    }

    pub async fn upload_cancellable(
        &self,
        profile: &SshProfile,
        local_path: &Path,
        remote_path: &str,
        cancellation: TransferCancellation,
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
        self.run_sftp_batch(profile, &line, Duration::from_secs(300), Some(cancellation))
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
        self.run_sftp_batch(profile, &line, Duration::from_secs(300), None)
            .await
            .map(|_| ())
    }

    pub async fn download_cancellable(
        &self,
        profile: &SshProfile,
        remote_path: &str,
        local_path: &Path,
        cancellation: TransferCancellation,
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
        self.run_sftp_batch(profile, &line, Duration::from_secs(300), Some(cancellation))
            .await
            .map(|_| ())
    }

    async fn run_sftp_batch(
        &self,
        profile: &SshProfile,
        line: &str,
        deadline: Duration,
        cancellation: Option<TransferCancellation>,
    ) -> RemoteResult<String> {
        let prepared = PreparedConnection::new(profile).await?;
        let mut command = Command::new(SFTP_BINARY);
        command
            .args(prepared.sftp_args())
            .arg(prepared.destination())
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .kill_on_drop(true);
        let mut child = command.spawn().map_err(|_| RemoteError::Process)?;
        child
            .stdin
            .take()
            .ok_or(RemoteError::Process)?
            .write_all(format!("{line}\nquit\n").as_bytes())
            .await
            .map_err(|_| RemoteError::Process)?;
        let status = if let Some(mut cancellation) = cancellation {
            tokio::select! {
                result = child.wait() => result.map_err(|_| RemoteError::Process)?,
                () = cancellation.cancelled() => {
                    let _ = child.kill().await;
                    let _ = child.wait().await;
                    return Err(RemoteError::Cancelled);
                }
                () = sleep(deadline) => {
                    let _ = child.kill().await;
                    let _ = child.wait().await;
                    return Err(RemoteError::Timeout);
                }
            }
        } else {
            match timeout(deadline, child.wait()).await {
                Ok(result) => result.map_err(|_| RemoteError::Process)?,
                Err(_) => {
                    let _ = child.kill().await;
                    let _ = child.wait().await;
                    return Err(RemoteError::Timeout);
                }
            }
        };
        if !status.success() {
            return Err(RemoteError::Process);
        }
        Ok(String::new())
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
    concurrency: Arc<Mutex<HashMap<(String, String), u8>>>,
    controls: Arc<Mutex<TransferControlMap>>,
    scheduling: Arc<Mutex<()>>,
}

pub struct TransferCancellation {
    receiver: watch::Receiver<bool>,
}

impl TransferCancellation {
    async fn cancelled(&mut self) {
        if *self.receiver.borrow() {
            return;
        }
        while self.receiver.changed().await.is_ok() {
            if *self.receiver.borrow() {
                return;
            }
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct TransferQueueSnapshot {
    pub site_id: String,
    pub jobs: Vec<JobRecord>,
    pub active_count: usize,
    pub queued_count: usize,
    pub paused_count: usize,
    pub failed_count: usize,
    pub concurrency_limit: u8,
}

impl TransferCoordinator {
    pub fn new(store: FleetStore) -> Self {
        Self {
            store,
            concurrency: Arc::new(Mutex::new(HashMap::new())),
            controls: Arc::new(Mutex::new(HashMap::new())),
            scheduling: Arc::new(Mutex::new(())),
        }
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

    pub async fn start(
        &self,
        owner_user_id: &str,
        job_id: &str,
    ) -> RemoteResult<TransferCancellation> {
        let job = self.get(owner_user_id, job_id).await?;
        let site_id = job.site_id.ok_or(RemoteError::Job)?;
        loop {
            {
                let _scheduling = self.scheduling.lock().await;
                let current = self.get(owner_user_id, job_id).await?;
                if current.state != "queued" || current.site_id.as_deref() != Some(&site_id) {
                    return Err(RemoteError::Job);
                }
                let snapshot = self.snapshot(owner_user_id, &site_id).await?;
                if snapshot.active_count < usize::from(snapshot.concurrency_limit) {
                    self.transition(owner_user_id, job_id, &["queued"], "running", None)
                        .await?;
                    let (sender, receiver) = watch::channel(false);
                    self.controls
                        .lock()
                        .await
                        .insert((owner_user_id.to_owned(), job_id.to_owned()), sender);
                    return Ok(TransferCancellation { receiver });
                }
            }
            sleep(Duration::from_millis(100)).await;
        }
    }

    pub async fn succeed(&self, owner_user_id: &str, job_id: &str, bytes: u64) -> RemoteResult<()> {
        let result = self
            .transition(
                owner_user_id,
                job_id,
                &["running"],
                "succeeded",
                Some(&json!({"bytes": bytes, "progress": 100})),
            )
            .await;
        self.clear_control(owner_user_id, job_id).await;
        result
    }

    pub async fn fail(&self, owner_user_id: &str, job_id: &str) -> RemoteResult<()> {
        let result = self
            .transition(
                owner_user_id,
                job_id,
                &["running"],
                "failed",
                Some(&json!({"error_code": "remote_transfer_failed"})),
            )
            .await;
        self.clear_control(owner_user_id, job_id).await;
        result
    }

    pub async fn cancel(&self, owner_user_id: &str, job_id: &str) -> RemoteResult<()> {
        self.signal_control(owner_user_id, job_id).await;
        self.transition(
            owner_user_id,
            job_id,
            &["queued", "running"],
            "cancelled",
            Some(&json!({"cancelled": true})),
        )
        .await
    }

    pub async fn pause(&self, owner_user_id: &str, job_id: &str) -> RemoteResult<()> {
        self.signal_control(owner_user_id, job_id).await;
        self.transition(
            owner_user_id,
            job_id,
            &["queued", "running"],
            "cancelled",
            Some(&json!({"paused": true})),
        )
        .await
    }

    pub async fn retry(&self, owner_user_id: &str, job_id: &str) -> RemoteResult<()> {
        let job = self.get(owner_user_id, job_id).await?;
        let result = match job.state.as_str() {
            "failed" => json!({"retry_requested": true}),
            "cancelled"
                if job
                    .result
                    .as_ref()
                    .and_then(|value| value.get("paused"))
                    .and_then(Value::as_bool)
                    == Some(true) =>
            {
                json!({"paused": true, "retry_requested": true})
            }
            _ => return Err(RemoteError::Job),
        };
        self.transition(
            owner_user_id,
            job_id,
            &[job.state.as_str()],
            job.state.as_str(),
            Some(&result),
        )
        .await
    }

    pub async fn finish_controlled(&self, owner_user_id: &str, job_id: &str) {
        self.clear_control(owner_user_id, job_id).await;
    }

    pub async fn set_concurrency(
        &self,
        owner_user_id: &str,
        site_id: &str,
        limit: u8,
    ) -> RemoteResult<TransferQueueSnapshot> {
        if !(1..=4).contains(&limit) {
            return Err(RemoteError::Job);
        }
        self.concurrency
            .lock()
            .await
            .insert((owner_user_id.to_owned(), site_id.to_owned()), limit);
        self.snapshot(owner_user_id, site_id).await
    }

    pub async fn snapshot(
        &self,
        owner_user_id: &str,
        site_id: &str,
    ) -> RemoteResult<TransferQueueSnapshot> {
        let jobs = self
            .store
            .owned_site_jobs(owner_user_id, site_id, 48)
            .await
            .map_err(|_| RemoteError::Job)?;
        let active_count = jobs.iter().filter(|job| job.state == "running").count();
        let queued_count = jobs.iter().filter(|job| job.state == "queued").count();
        let paused_count = jobs
            .iter()
            .filter(|job| {
                job.state == "cancelled"
                    && job
                        .result
                        .as_ref()
                        .and_then(|result| result.get("paused"))
                        .and_then(Value::as_bool)
                        == Some(true)
            })
            .count();
        let failed_count = jobs.iter().filter(|job| job.state == "failed").count();
        let concurrency_limit = self
            .concurrency
            .lock()
            .await
            .get(&(owner_user_id.to_owned(), site_id.to_owned()))
            .copied()
            .unwrap_or(2);
        Ok(TransferQueueSnapshot {
            site_id: site_id.to_owned(),
            jobs,
            active_count,
            queued_count,
            paused_count,
            failed_count,
            concurrency_limit,
        })
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

    async fn signal_control(&self, owner_user_id: &str, job_id: &str) {
        if let Some(sender) = self
            .controls
            .lock()
            .await
            .get(&(owner_user_id.to_owned(), job_id.to_owned()))
        {
            let _ = sender.send(true);
        }
    }

    async fn clear_control(&self, owner_user_id: &str, job_id: &str) {
        self.controls
            .lock()
            .await
            .remove(&(owner_user_id.to_owned(), job_id.to_owned()));
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
        let guard = UrlGuard::managed_remote(SystemResolver);
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

fn validate_octal_mode(mode: &str) -> RemoteResult<()> {
    if mode.len() != 4
        || !mode.starts_with('0')
        || !mode.chars().all(|character| matches!(character, '0'..='7'))
    {
        return Err(RemoteError::InvalidPath);
    }
    Ok(())
}

fn parse_sftp_listing(path: &str, stat_only: bool, output: &str) -> Vec<SftpEntry> {
    output
        .lines()
        .filter_map(|line| {
            let line = line.trim();
            if line.is_empty()
                || line.starts_with("sftp>")
                || line.starts_with("Connected to ")
                || line.starts_with("Fetching ")
            {
                return None;
            }
            let fields = line.split_whitespace().collect::<Vec<_>>();
            if fields.len() < 9 || fields[0].len() != 10 {
                return None;
            }
            let permissions = fields[0].to_owned();
            let raw_name = fields[8..].join(" ");
            let listed_path = raw_name
                .split(" -> ")
                .next()
                .unwrap_or(raw_name.as_str())
                .trim_end_matches('/');
            let name = listed_path
                .rsplit('/')
                .next()
                .unwrap_or(listed_path)
                .to_owned();
            if matches!(name.as_str(), "." | "..") {
                return None;
            }
            let kind = match permissions.as_bytes().first().copied() {
                Some(b'd') => SftpEntryKind::Directory,
                Some(b'-') => SftpEntryKind::File,
                Some(b'l') => SftpEntryKind::Symlink,
                _ => SftpEntryKind::Other,
            };
            let entry_path = if stat_only {
                path.to_owned()
            } else if listed_path.starts_with('/') {
                let parent_prefix = if path == "/" {
                    "/".to_owned()
                } else {
                    format!("{}/", path.trim_end_matches('/'))
                };
                if !listed_path.starts_with(&parent_prefix) {
                    return None;
                }
                listed_path.to_owned()
            } else {
                join_remote_path(path, &name)
            };
            Some(SftpEntry {
                name,
                path: entry_path,
                kind,
                size: fields[4].parse::<u64>().ok(),
                permissions,
                owner: fields[2].to_owned(),
                group: fields[3].to_owned(),
                modified: fields[5..8].join(" "),
            })
        })
        .collect()
}

fn join_remote_path(base: &str, name: &str) -> String {
    if base == "/" {
        format!("/{name}")
    } else {
        format!("{}/{name}", base.trim_end_matches('/'))
    }
}

fn remote_parent(path: &str) -> Option<String> {
    let trimmed = path.trim_end_matches('/');
    if trimmed.is_empty() || trimmed == "/" {
        return None;
    }
    match trimmed.rsplit_once('/') {
        Some(("", _)) => Some("/".to_owned()),
        Some((parent, _)) => Some(parent.to_owned()),
        None => None,
    }
}

fn quote_sftp(value: &str) -> String {
    format!("\"{}\"", value.replace('\\', "\\\\").replace('"', "\\\""))
}

fn quote_shell(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\"'\"'"))
}

fn host_key_alias(host: &str, port: u16) -> String {
    if port == 22 {
        host.to_owned()
    } else {
        format!("[{host}]:{port}")
    }
}

fn known_host_identity(known_hosts: &str) -> Option<(String, String)> {
    known_hosts.lines().find_map(|line| {
        let mut fields = line.split_whitespace();
        let _hosts = fields.next()?;
        let algorithm = fields.next()?.to_owned();
        let encoded = fields.next()?;
        let key = STANDARD.decode(encoded).ok()?;
        Some((
            algorithm,
            format!("SHA256:{}", URL_SAFE_NO_PAD.encode(Sha256::digest(key))),
        ))
    })
}

fn parse_keyscan_output(host: &str, port: u16, output: &str) -> Option<HostKeyInspection> {
    let alias = host_key_alias(host, port);
    let mut candidates = output
        .lines()
        .filter(|line| !line.trim_start().starts_with('#'))
        .filter_map(|line| {
            let mut fields = line.split_whitespace();
            let _observed_host = fields.next()?;
            let algorithm = fields.next()?.to_owned();
            let encoded = fields.next()?.to_owned();
            let key = STANDARD.decode(&encoded).ok()?;
            let priority = match algorithm.as_str() {
                "ssh-ed25519" => 0,
                value if value.starts_with("ecdsa-") => 1,
                "ssh-rsa" => 2,
                _ => 3,
            };
            Some((priority, algorithm, encoded, key))
        })
        .collect::<Vec<_>>();
    candidates.sort_by_key(|candidate| candidate.0);
    let (_, algorithm, encoded, key) = candidates.into_iter().next()?;
    Some(HostKeyInspection {
        host: host.to_owned(),
        port,
        server_key_algorithm: algorithm.clone(),
        server_key_fingerprint: format!("SHA256:{}", URL_SAFE_NO_PAD.encode(Sha256::digest(key))),
        known_hosts_line: format!("{alias} {algorithm} {encoded}"),
    })
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
        assert!(
            SftpCommand::Chmod {
                path: "/safe/file.txt".to_owned(),
                mode: "0644".to_owned(),
            }
            .validate()
            .is_ok()
        );
        assert!(
            SftpCommand::Chmod {
                path: "/safe/file.txt".to_owned(),
                mode: "47777".to_owned(),
            }
            .validate()
            .is_err()
        );
    }

    #[test]
    fn host_key_inspection_prefers_ed25519_and_rebinds_the_original_alias() {
        let output = ["192.0.2.1 ssh-rsa AQID", "192.0.2.1 ssh-ed25519 BAUG"].join("\n");
        let inspection = parse_keyscan_output("ssh.example.com", 2222, &output).unwrap();
        assert_eq!(inspection.server_key_algorithm, "ssh-ed25519");
        assert_eq!(
            inspection.known_hosts_line,
            "[ssh.example.com]:2222 ssh-ed25519 BAUG"
        );
        assert!(inspection.server_key_fingerprint.starts_with("SHA256:"));
    }

    #[test]
    fn sftp_listing_is_parsed_into_browser_entries_without_losing_spaces() {
        let output = [
            "sftp> ls -la \"/var/www\"",
            "drwxr-xr-x    2 deploy staff        4096 Jul 27 12:30 assets",
            "-rw-r-----    1 deploy staff         128 Jul 27 12:31 index file.html",
            "lrwxrwxrwx    1 deploy staff          10 Jul 27 12:32 current -> releases/v2",
        ]
        .join("\n");
        let entries = parse_sftp_listing("/var/www", false, &output);
        assert_eq!(entries.len(), 3);
        assert_eq!(entries[0].kind, SftpEntryKind::Directory);
        assert_eq!(entries[0].path, "/var/www/assets");
        assert_eq!(entries[1].name, "index file.html");
        assert_eq!(entries[1].size, Some(128));
        assert_eq!(entries[2].kind, SftpEntryKind::Symlink);
        assert_eq!(entries[2].name, "current");
        assert_eq!(remote_parent("/var/www"), Some("/var".to_owned()));

        let absolute_output = [
            "drwxr-xr-x    ? deploy staff 4096 Jul 27 2026 /var/www/.",
            "drwxr-xr-x    ? root root 4096 Jul 27 2026 /var/www/..",
            "-rw-r-----    ? deploy staff 128 Jul 27 2026 /var/www/index file.html",
            "-rw-r-----    ? other staff 128 Jul 27 2026 /tmp/outside.txt",
        ]
        .join("\n");
        let absolute_entries = parse_sftp_listing("/var/www", false, &absolute_output);
        assert_eq!(absolute_entries.len(), 1);
        assert_eq!(absolute_entries[0].name, "index file.html");
        assert_eq!(absolute_entries[0].path, "/var/www/index file.html");
    }

    #[tokio::test]
    async fn transfer_jobs_are_persistent_owned_and_controls_abort_running_work() {
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
        let mut cancellation = transfers.start("user-a", &job.job_id).await.unwrap();
        transfers.pause("user-a", &job.job_id).await.unwrap();
        timeout(Duration::from_secs(1), cancellation.cancelled())
            .await
            .unwrap();
        transfers.finish_controlled("user-a", &job.job_id).await;
        let snapshot = transfers
            .set_concurrency("user-a", "site-a", 4)
            .await
            .unwrap();
        assert_eq!(snapshot.paused_count, 1);
        assert_eq!(snapshot.concurrency_limit, 4);
        transfers.retry("user-a", &job.job_id).await.unwrap();
        assert_eq!(
            transfers.get("user-a", &job.job_id).await.unwrap().state,
            "cancelled"
        );
        assert_eq!(
            transfers
                .get("user-a", &job.job_id)
                .await
                .unwrap()
                .result
                .unwrap()["retry_requested"],
            true
        );

        let failed = transfers
            .queue(
                "user-a",
                "site-a",
                "sftp_download",
                &json!({"remote_path":"/uploads/file.bin"}),
            )
            .await
            .unwrap();
        transfers.start("user-a", &failed.job_id).await.unwrap();
        transfers.fail("user-a", &failed.job_id).await.unwrap();
        transfers.retry("user-a", &failed.job_id).await.unwrap();
        assert_eq!(
            transfers
                .get("user-a", &failed.job_id)
                .await
                .unwrap()
                .result
                .unwrap()["retry_requested"],
            true
        );

        let first = transfers
            .queue(
                "user-a",
                "site-a",
                "sftp_upload",
                &json!({"remote_path":"/uploads/first.bin"}),
            )
            .await
            .unwrap();
        let second = transfers
            .queue(
                "user-a",
                "site-a",
                "sftp_upload",
                &json!({"remote_path":"/uploads/second.bin"}),
            )
            .await
            .unwrap();
        transfers
            .set_concurrency("user-a", "site-a", 1)
            .await
            .unwrap();
        transfers.start("user-a", &first.job_id).await.unwrap();
        let waiting_transfers = transfers.clone();
        let second_job_id = second.job_id.clone();
        let waiting =
            tokio::spawn(async move { waiting_transfers.start("user-a", &second_job_id).await });
        sleep(Duration::from_millis(50)).await;
        assert!(!waiting.is_finished());
        transfers.succeed("user-a", &first.job_id, 1).await.unwrap();
        timeout(Duration::from_secs(1), waiting)
            .await
            .unwrap()
            .unwrap()
            .unwrap();
    }
}
