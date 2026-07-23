use super::super::ssh_runtime::SshSessionRuntime;
use super::super::ssh_session_service::{SshSessionAccessGate, SshSessionService};
use crate::core::ports::{
    EstablishedSshConnection, SftpChmodResult, SftpCopyResult, SftpDeleteResult,
    SftpDirectoryListResult, SftpDownloadResult, SftpMkdirResult, SftpMoveResult,
    SftpReadFileResult, SftpSessionPort, SftpStatResult, SftpUploadResult, SftpWriteFileResult,
    SiteActivityLogRecord, SiteCatalogInsertInput, SiteCatalogStorePort, SiteCatalogUpdateInput,
    SiteRecord, SshConnectionPort, SshProfileAuthType, SshProfileConnectionTarget,
    SshProfileRecord, SshProfileStorePort, SshSessionConnectorPort, SshShellPort,
    SshShellReadResult,
};
use crate::core::store_records::{site_record_from_model, ssh_profile_record_from_model};
use crate::error::AppError;
use g5_admin_models::models::site::Site;
use g5_admin_models::models::ssh::{
    SshAuthType, SshConnectInput, SshDisconnectInput, SshProfile, SshShellCloseInput,
    SshShellOpenInput, SshShellReadInput, SshShellWriteInput,
};
use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, Mutex};
use tokio::sync::RwLock;

struct AllowAllGate;

#[async_trait::async_trait]
impl SshSessionAccessGate for AllowAllGate {
    async fn require_unlocked(&self) -> Result<(), AppError> {
        Ok(())
    }
}

#[derive(Default)]
struct FakeSftpSession;

#[async_trait::async_trait]
impl SftpSessionPort for FakeSftpSession {
    async fn list_dir(&self, _path: &str) -> Result<SftpDirectoryListResult, AppError> {
        Err(AppError::Config {
            message: "unused in ssh session test".to_string(),
        })
    }

    async fn stat(&self, _path: &str) -> Result<SftpStatResult, AppError> {
        Err(AppError::Config {
            message: "unused in ssh session test".to_string(),
        })
    }

    async fn read_file(
        &self,
        _path: &str,
        _max_bytes: usize,
    ) -> Result<SftpReadFileResult, AppError> {
        Err(AppError::Config {
            message: "unused in ssh session test".to_string(),
        })
    }

    async fn download_file(
        &self,
        _path: &str,
        _destination_path: &Path,
    ) -> Result<SftpDownloadResult, AppError> {
        Err(AppError::Config {
            message: "unused in ssh session test".to_string(),
        })
    }

    async fn upload_file(
        &self,
        _source_path: &Path,
        _destination_path: &str,
    ) -> Result<SftpUploadResult, AppError> {
        Err(AppError::Config {
            message: "unused in ssh session test".to_string(),
        })
    }

    async fn delete(&self, _path: &str, _recursive: bool) -> Result<SftpDeleteResult, AppError> {
        Err(AppError::Config {
            message: "unused in ssh session test".to_string(),
        })
    }

    async fn mkdir(&self, _path: &str) -> Result<SftpMkdirResult, AppError> {
        Err(AppError::Config {
            message: "unused in ssh session test".to_string(),
        })
    }

    async fn copy_path(
        &self,
        _source_path: &str,
        _destination_path: &str,
    ) -> Result<SftpCopyResult, AppError> {
        Err(AppError::Config {
            message: "unused in ssh session test".to_string(),
        })
    }

    async fn move_path(
        &self,
        _source_path: &str,
        _destination_path: &str,
    ) -> Result<SftpMoveResult, AppError> {
        Err(AppError::Config {
            message: "unused in ssh session test".to_string(),
        })
    }

    async fn chmod(
        &self,
        _path: &str,
        _permissions_octal: &str,
    ) -> Result<SftpChmodResult, AppError> {
        Err(AppError::Config {
            message: "unused in ssh session test".to_string(),
        })
    }

    async fn write_file(
        &self,
        _path: &str,
        _content: &[u8],
    ) -> Result<SftpWriteFileResult, AppError> {
        Err(AppError::Config {
            message: "unused in ssh session test".to_string(),
        })
    }

    async fn close(&self) -> Result<(), AppError> {
        Ok(())
    }
}

#[derive(Default)]
struct FakeConnection {
    disconnect_calls: Mutex<usize>,
    open_shell_calls: Mutex<usize>,
    shell_resizes: Arc<Mutex<Vec<(u32, u32)>>>,
    shell_writes: Arc<Mutex<Vec<String>>>,
}

#[derive(Default)]
struct FakeShell {
    close_calls: Mutex<usize>,
    read_closed: Mutex<bool>,
    resizes: Arc<Mutex<Vec<(u32, u32)>>>,
    writes: Arc<Mutex<Vec<String>>>,
}

#[async_trait::async_trait]
impl SshShellPort for FakeShell {
    async fn write(&self, data: &str) -> Result<(), AppError> {
        self.writes
            .lock()
            .expect("shell write lock")
            .push(data.to_string());
        Ok(())
    }

    async fn read(&self) -> Result<SshShellReadResult, AppError> {
        let mut read_closed = self.read_closed.lock().expect("read closed lock");
        let closed = *read_closed;
        *read_closed = false;
        Ok(SshShellReadResult {
            stdout: "prompt$ ".to_string(),
            stderr: String::new(),
            closed,
            exit_status: None,
            exit_signal: None,
        })
    }

    async fn read_blocking(&self) -> Result<SshShellReadResult, AppError> {
        self.read().await
    }

    async fn snapshot(&self) -> Result<String, AppError> {
        Ok("prompt$ ".to_string())
    }

    async fn resize(&self, cols: u32, rows: u32) -> Result<(), AppError> {
        self.resizes
            .lock()
            .expect("shell resize lock")
            .push((cols, rows));
        Ok(())
    }

    async fn close(&self) -> Result<(), AppError> {
        let mut close_calls = self.close_calls.lock().expect("close call lock");
        *close_calls += 1;
        *self.read_closed.lock().expect("read closed lock") = true;
        Ok(())
    }
}

#[async_trait::async_trait]
impl SshConnectionPort for FakeConnection {
    async fn open_shell(&self) -> Result<Arc<dyn SshShellPort + Send + Sync>, AppError> {
        let mut calls = self.open_shell_calls.lock().expect("open shell call lock");
        *calls += 1;
        Ok(Arc::new(FakeShell {
            close_calls: Mutex::new(0),
            read_closed: Mutex::new(false),
            resizes: Arc::clone(&self.shell_resizes),
            writes: Arc::clone(&self.shell_writes),
        }))
    }

    async fn open_sftp(&self) -> Result<Arc<dyn SftpSessionPort + Send + Sync>, AppError> {
        Ok(Arc::new(FakeSftpSession))
    }

    async fn disconnect(&self) -> Result<(), AppError> {
        let mut calls = self.disconnect_calls.lock().expect("disconnect call lock");
        *calls += 1;
        Ok(())
    }
}

struct FakeConnector {
    connection: Arc<FakeConnection>,
}

#[async_trait::async_trait]
impl SshSessionConnectorPort for FakeConnector {
    async fn connect(
        &self,
        _target: SshProfileConnectionTarget,
    ) -> Result<EstablishedSshConnection, AppError> {
        Ok(EstablishedSshConnection {
            connection: self.connection.clone(),
            server_key_algorithm: "Ed25519".to_string(),
            server_key_fingerprint: "SHA256:test".to_string(),
        })
    }
}

struct FakeSiteStore {
    activities: Mutex<Vec<String>>,
    sites: Vec<Site>,
}

impl SiteCatalogStorePort for FakeSiteStore {
    fn load_sites(&self) -> Result<Vec<SiteRecord>, AppError> {
        Ok(self
            .sites
            .clone()
            .into_iter()
            .map(site_record_from_model)
            .collect())
    }

    fn insert_site(&self, _input: SiteCatalogInsertInput) -> Result<SiteRecord, AppError> {
        unreachable!("unused in ssh session service test")
    }

    fn update_site(&self, _input: SiteCatalogUpdateInput) -> Result<SiteRecord, AppError> {
        unreachable!("unused in ssh session service test")
    }

    fn delete_site(&self, _site_id: &str) -> Result<(), AppError> {
        unreachable!("unused in ssh session service test")
    }

    fn site_has_session_hint(&self, _site_id: &str) -> Result<bool, AppError> {
        unreachable!("unused in ssh session service test")
    }

    fn set_site_session_hint(&self, _site_id: &str, _has_session: bool) -> Result<(), AppError> {
        unreachable!("unused in ssh session service test")
    }

    fn add_activity(
        &self,
        _site_id: Option<&str>,
        action: &str,
        _detail: Option<&str>,
    ) -> Result<(), AppError> {
        self.activities
            .lock()
            .expect("activity lock")
            .push(action.to_string());
        Ok(())
    }

    fn list_activity(
        &self,
        _site_id: Option<&str>,
        _limit: usize,
    ) -> Result<Vec<SiteActivityLogRecord>, AppError> {
        unreachable!("unused in ssh session service test")
    }
}

struct FakeProfileStore {
    target: SshProfileConnectionTarget,
}

impl SshProfileStorePort for FakeProfileStore {
    fn load_ssh_profiles(&self, _site_id: &str) -> Result<Vec<SshProfileRecord>, AppError> {
        Ok(vec![ssh_profile_record_from_model(build_profile())])
    }

    fn load_ssh_profile_connection_target(
        &self,
        _site_id: &str,
        _ssh_profile_id: &str,
    ) -> Result<SshProfileConnectionTarget, AppError> {
        Ok(self.target.clone())
    }

    fn insert_ssh_profile(
        &self,
        _input: crate::core::ports::SshProfileInsertInput,
    ) -> Result<SshProfileRecord, AppError> {
        unreachable!("unused in ssh session service test")
    }

    fn update_ssh_profile(
        &self,
        _input: crate::core::ports::SshProfileUpdateRecord,
    ) -> Result<SshProfileRecord, AppError> {
        unreachable!("unused in ssh session service test")
    }

    fn delete_ssh_profile(&self, _site_id: &str, _ssh_profile_id: &str) -> Result<(), AppError> {
        unreachable!("unused in ssh session service test")
    }
}

fn build_site() -> Site {
    Site {
        id: "site-alpha".to_string(),
        name: "알파몰".to_string(),
        api_base_url: "https://alpha.example.com/api/v1".to_string(),
        is_default: true,
        created_at: "2026-03-10T00:00:00Z".to_string(),
        updated_at: "2026-03-10T00:00:00Z".to_string(),
    }
}

fn build_profile() -> SshProfile {
    SshProfile {
        id: "ssh-profile-1".to_string(),
        site_id: "site-alpha".to_string(),
        name: "운영 SSH".to_string(),
        host: "ssh.alpha.example.com".to_string(),
        port: 22,
        username: "deploy".to_string(),
        auth_type: SshAuthType::Key,
        key_path: Some("~/.ssh/id_ed25519".to_string()),
        has_password: false,
        has_key_passphrase: true,
        created_at: "2026-03-10T00:00:00Z".to_string(),
        updated_at: "2026-03-10T00:00:00Z".to_string(),
    }
}

fn build_connection_profile() -> crate::core::ports::SshConnectionProfile {
    crate::core::ports::SshConnectionProfile {
        id: "ssh-profile-1".to_string(),
        site_id: "site-alpha".to_string(),
        name: "운영 SSH".to_string(),
        host: "ssh.alpha.example.com".to_string(),
        port: 22,
        username: "deploy".to_string(),
        auth_type: SshProfileAuthType::Key,
        key_path: Some("~/.ssh/id_ed25519".to_string()),
    }
}

#[tokio::test]
async fn connect_status_and_disconnect_follow_site_runtime() {
    let gate = AllowAllGate;
    let site_store = FakeSiteStore {
        activities: Mutex::new(Vec::new()),
        sites: vec![build_site()],
    };
    let profile_store = FakeProfileStore {
        target: SshProfileConnectionTarget {
            profile: build_connection_profile(),
            password: None,
            key_passphrase: Some("passphrase".to_string()),
        },
    };
    let fake_connection = Arc::new(FakeConnection::default());
    let connector = FakeConnector {
        connection: fake_connection.clone(),
    };
    let sessions = RwLock::new(HashMap::new());
    let service = SshSessionService::new(
        &gate,
        &site_store,
        &profile_store,
        &connector,
        None,
        SshSessionRuntime::new(&sessions),
    );

    let connected = service
        .connect(
            "req-connect",
            SshConnectInput {
                site_id: "site-alpha".to_string(),
                ssh_profile_id: "ssh-profile-1".to_string(),
            },
        )
        .await
        .expect("ssh should connect");
    assert!(connected.connected);
    assert_eq!(
        connected
            .active_profile
            .expect("active profile")
            .ssh_profile_id,
        "ssh-profile-1"
    );

    let status = service
        .status("req-status", "site-alpha")
        .await
        .expect("status should load");
    assert!(status.connected);
    assert!(!status.shell_open);
    assert_eq!(
        status.server_key_fingerprint.as_deref(),
        Some("SHA256:test")
    );

    let disconnected = service
        .disconnect(
            "req-disconnect",
            SshDisconnectInput {
                site_id: "site-alpha".to_string(),
            },
        )
        .await
        .expect("ssh should disconnect");
    assert!(!disconnected.connected);
    assert_eq!(
        *fake_connection
            .disconnect_calls
            .lock()
            .expect("disconnect call lock"),
        1
    );
    assert_eq!(
        site_store
            .activities
            .lock()
            .expect("activity lock")
            .as_slice(),
        ["site.ssh.connect", "site.ssh.disconnect"]
    );
}

#[tokio::test]
async fn connect_rejects_replacing_an_existing_site_session() {
    let gate = AllowAllGate;
    let site_store = FakeSiteStore {
        activities: Mutex::new(Vec::new()),
        sites: vec![build_site()],
    };
    let profile_store = FakeProfileStore {
        target: SshProfileConnectionTarget {
            profile: build_connection_profile(),
            password: None,
            key_passphrase: Some("passphrase".to_string()),
        },
    };
    let connector = FakeConnector {
        connection: Arc::new(FakeConnection::default()),
    };
    let sessions = RwLock::new(HashMap::new());
    let service = SshSessionService::new(
        &gate,
        &site_store,
        &profile_store,
        &connector,
        None,
        SshSessionRuntime::new(&sessions),
    );

    service
        .connect(
            "req-connect",
            SshConnectInput {
                site_id: "site-alpha".to_string(),
                ssh_profile_id: "ssh-profile-1".to_string(),
            },
        )
        .await
        .expect("first ssh connect should succeed");

    let error = service
        .connect(
            "req-connect-2",
            SshConnectInput {
                site_id: "site-alpha".to_string(),
                ssh_profile_id: "ssh-profile-2".to_string(),
            },
        )
        .await
        .expect_err("second ssh connect should fail");

    match error {
        AppError::Config { message } => {
            assert!(message.contains("이미 활성 SSH 연결"));
        }
        other => panic!("unexpected error: {other:?}"),
    }
}

#[tokio::test]
async fn shell_open_write_read_and_close_follow_session_runtime() {
    let gate = AllowAllGate;
    let site_store = FakeSiteStore {
        activities: Mutex::new(Vec::new()),
        sites: vec![build_site()],
    };
    let profile_store = FakeProfileStore {
        target: SshProfileConnectionTarget {
            profile: build_connection_profile(),
            password: None,
            key_passphrase: Some("passphrase".to_string()),
        },
    };
    let fake_connection = Arc::new(FakeConnection::default());
    let connector = FakeConnector {
        connection: fake_connection.clone(),
    };
    let sessions = RwLock::new(HashMap::new());
    let service = SshSessionService::new(
        &gate,
        &site_store,
        &profile_store,
        &connector,
        None,
        SshSessionRuntime::new(&sessions),
    );

    service
        .connect(
            "req-connect",
            SshConnectInput {
                site_id: "site-alpha".to_string(),
                ssh_profile_id: "ssh-profile-1".to_string(),
            },
        )
        .await
        .expect("ssh should connect");

    let opened = service
        .open_shell(
            "req-open",
            SshShellOpenInput {
                site_id: "site-alpha".to_string(),
            },
        )
        .await
        .expect("shell should open");
    assert!(opened.shell_open);

    service
        .write_shell(SshShellWriteInput {
            site_id: "site-alpha".to_string(),
            data: "pwd".to_string(),
        })
        .await
        .expect("shell write should succeed");
    assert_eq!(
        fake_connection
            .shell_writes
            .lock()
            .expect("shell write lock")
            .as_slice(),
        ["pwd"]
    );

    service
        .resize_shell(g5_admin_models::models::ssh::SshShellResizeInput {
            site_id: "site-alpha".to_string(),
            cols: 140,
            rows: 48,
        })
        .await
        .expect("shell resize should succeed");
    assert_eq!(
        fake_connection
            .shell_resizes
            .lock()
            .expect("shell resize lock")
            .as_slice(),
        [(140, 48)]
    );

    let read = service
        .read_shell(
            "req-read",
            SshShellReadInput {
                site_id: "site-alpha".to_string(),
            },
        )
        .await
        .expect("shell read should succeed");
    assert_eq!(read.stdout, "prompt$ ");
    assert!(!read.closed);

    let closed = service
        .close_shell(
            "req-close",
            SshShellCloseInput {
                site_id: "site-alpha".to_string(),
            },
        )
        .await
        .expect("shell close should succeed");
    assert!(!closed.shell_open);
    assert_eq!(
        *fake_connection
            .open_shell_calls
            .lock()
            .expect("open shell call lock"),
        1
    );
    assert_eq!(
        site_store
            .activities
            .lock()
            .expect("activity lock")
            .as_slice(),
        [
            "site.ssh.connect",
            "site.ssh.shell.open",
            "site.ssh.shell.close",
        ]
    );
}
