use super::super::sftp_service::SftpService;
use super::super::sftp_support::SftpAccessGate;
use super::super::sftp_transfer_queue::SftpTransferQueueHost;
use super::super::sftp_transfer_service::SftpTransferService;
use super::super::ssh_runtime::{ActiveSshSession, SshSessionRuntime};
use crate::core::ports::{
    SftpChmodResult, SftpCopyResult, SftpDeleteResult, SftpDirectoryEntryResult,
    SftpDirectoryListResult, SftpDownloadResult, SftpEntryKindResult, SftpMkdirResult,
    SftpMoveResult, SftpPathMetadataResult, SftpReadFileResult, SftpSessionPort, SftpStatResult,
    SftpUploadResult, SftpWriteFileResult, SiteActivityLogRecord, SiteCatalogInsertInput,
    SiteCatalogStorePort, SiteCatalogUpdateInput, SiteRecord, SshConnectionPort, SshShellPort,
    SshShellReadResult,
};
use crate::core::store_records::site_record_from_model;
use crate::error::AppError;
use g5_admin_models::models::sftp_transfer::{
    SftpTransferDirection, SftpTransferEnqueueInput, SftpTransferEnqueueItemInput,
    SftpTransferItemStatus, SftpTransferSnapshotInput,
};
use g5_admin_models::models::site::Site;
use g5_admin_models::models::ssh::{
    SftpDeleteInput, SftpDownloadInput, SftpEntryKind, SftpListDirInput, SftpMkdirInput,
    SftpReadFileInput, SftpStatInput, SftpUploadInput, SftpWriteFileInput, SshAuthType,
    SshSessionProfileSummary,
};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tokio::sync::RwLock;
use tokio::time::{sleep, Duration};

struct AllowAllGate;

fn create_temp_upload_source(file_name: &str) -> PathBuf {
    let path = std::env::temp_dir().join(format!("g5-admin-sftp-{file_name}"));
    fs::write(&path, b"<?php echo 'hello'; ?>").expect("temp upload source should be created");
    path
}

#[async_trait::async_trait]
impl SftpAccessGate for AllowAllGate {
    async fn require_unlocked(&self) -> Result<(), AppError> {
        Ok(())
    }
}

#[derive(Default)]
struct FakeShell;

#[async_trait::async_trait]
impl SshShellPort for FakeShell {
    async fn write(&self, _data: &str) -> Result<(), AppError> {
        Ok(())
    }

    async fn read(&self) -> Result<SshShellReadResult, AppError> {
        Ok(SshShellReadResult::default())
    }

    async fn read_blocking(&self) -> Result<SshShellReadResult, AppError> {
        Ok(SshShellReadResult::default())
    }

    async fn snapshot(&self) -> Result<String, AppError> {
        Ok(String::new())
    }

    async fn resize(&self, _cols: u32, _rows: u32) -> Result<(), AppError> {
        Ok(())
    }

    async fn close(&self) -> Result<(), AppError> {
        Ok(())
    }
}

#[derive(Default)]
struct FakeSftpSession {
    list_dir_calls: Mutex<Vec<String>>,
    stat_calls: Mutex<Vec<String>>,
    read_file_calls: Mutex<Vec<(String, usize)>>,
    download_calls: Mutex<Vec<(String, PathBuf)>>,
    upload_calls: Mutex<Vec<(PathBuf, String)>>,
    delete_calls: Mutex<Vec<String>>,
    mkdir_calls: Mutex<Vec<String>>,
    write_calls: Mutex<Vec<(String, Vec<u8>)>>,
}

#[async_trait::async_trait]
impl SftpSessionPort for FakeSftpSession {
    async fn list_dir(&self, path: &str) -> Result<SftpDirectoryListResult, AppError> {
        self.list_dir_calls
            .lock()
            .expect("list dir calls lock")
            .push(path.to_string());
        Ok(SftpDirectoryListResult {
            requested_path: path.to_string(),
            resolved_path: "/var/www/html".to_string(),
            parent_path: Some("/var/www".to_string()),
            entries: vec![
                SftpDirectoryEntryResult {
                    name: "logs".to_string(),
                    path: "/var/www/html/logs".to_string(),
                    metadata: SftpPathMetadataResult {
                        kind: SftpEntryKindResult::Directory,
                        size_bytes: None,
                        permissions_octal: Some("755".to_string()),
                        modified_at_epoch: Some(1_742_600_000),
                    },
                },
                SftpDirectoryEntryResult {
                    name: "index.php".to_string(),
                    path: "/var/www/html/index.php".to_string(),
                    metadata: SftpPathMetadataResult {
                        kind: SftpEntryKindResult::File,
                        size_bytes: Some(4096),
                        permissions_octal: Some("644".to_string()),
                        modified_at_epoch: Some(1_742_600_120),
                    },
                },
            ],
        })
    }

    async fn stat(&self, path: &str) -> Result<SftpStatResult, AppError> {
        self.stat_calls
            .lock()
            .expect("stat calls lock")
            .push(path.to_string());
        Ok(SftpStatResult {
            requested_path: path.to_string(),
            resolved_path: "/var/www/html/index.php".to_string(),
            metadata: SftpPathMetadataResult {
                kind: SftpEntryKindResult::File,
                size_bytes: Some(4096),
                permissions_octal: Some("644".to_string()),
                modified_at_epoch: Some(1_742_600_120),
            },
        })
    }

    async fn read_file(
        &self,
        path: &str,
        max_bytes: usize,
    ) -> Result<SftpReadFileResult, AppError> {
        self.read_file_calls
            .lock()
            .expect("read file calls lock")
            .push((path.to_string(), max_bytes));
        Ok(SftpReadFileResult {
            requested_path: path.to_string(),
            resolved_path: "/var/www/html/index.php".to_string(),
            content: b"<?php echo 'hello'; ?>".to_vec(),
            truncated: false,
        })
    }

    async fn download_file(
        &self,
        path: &str,
        destination_path: &Path,
    ) -> Result<SftpDownloadResult, AppError> {
        self.download_calls
            .lock()
            .expect("download calls lock")
            .push((path.to_string(), destination_path.to_path_buf()));
        Ok(SftpDownloadResult {
            requested_path: path.to_string(),
            resolved_path: "/var/www/html/index.php".to_string(),
            copied_bytes: 22,
        })
    }

    async fn upload_file(
        &self,
        source_path: &Path,
        destination_path: &str,
    ) -> Result<SftpUploadResult, AppError> {
        self.upload_calls
            .lock()
            .expect("upload calls lock")
            .push((source_path.to_path_buf(), destination_path.to_string()));
        Ok(SftpUploadResult {
            source_path: source_path.display().to_string(),
            destination_path: destination_path.to_string(),
            resolved_path: "/var/www/html/index.php".to_string(),
            copied_bytes: 22,
        })
    }

    async fn delete(&self, path: &str, recursive: bool) -> Result<SftpDeleteResult, AppError> {
        self.delete_calls
            .lock()
            .expect("delete calls lock")
            .push(format!("{path}|recursive={recursive}"));
        Ok(SftpDeleteResult {
            requested_path: path.to_string(),
            resolved_path: path.to_string(),
            kind: if path.ends_with(".php") {
                SftpEntryKindResult::File
            } else {
                SftpEntryKindResult::Directory
            },
            deleted_count: if recursive { 3 } else { 1 },
        })
    }

    async fn mkdir(&self, path: &str) -> Result<SftpMkdirResult, AppError> {
        self.mkdir_calls
            .lock()
            .expect("mkdir calls lock")
            .push(path.to_string());
        Ok(SftpMkdirResult {
            requested_path: path.to_string(),
            resolved_path: "/var/www/html/releases".to_string(),
        })
    }

    async fn copy_path(
        &self,
        source_path: &str,
        destination_path: &str,
    ) -> Result<SftpCopyResult, AppError> {
        Ok(SftpCopyResult {
            requested_source_path: source_path.to_string(),
            source_resolved_path: source_path.to_string(),
            requested_destination_path: destination_path.to_string(),
            resolved_destination_path: destination_path.to_string(),
            kind: SftpEntryKindResult::File,
            copied_bytes: 22,
        })
    }

    async fn move_path(
        &self,
        source_path: &str,
        destination_path: &str,
    ) -> Result<SftpMoveResult, AppError> {
        Ok(SftpMoveResult {
            requested_source_path: source_path.to_string(),
            source_resolved_path: source_path.to_string(),
            requested_destination_path: destination_path.to_string(),
            resolved_destination_path: destination_path.to_string(),
            kind: SftpEntryKindResult::File,
        })
    }

    async fn chmod(
        &self,
        path: &str,
        permissions_octal: &str,
    ) -> Result<SftpChmodResult, AppError> {
        Ok(SftpChmodResult {
            requested_path: path.to_string(),
            resolved_path: path.to_string(),
            kind: if path.ends_with(".php") {
                SftpEntryKindResult::File
            } else {
                SftpEntryKindResult::Directory
            },
            permissions_octal: permissions_octal.to_string(),
        })
    }

    async fn write_file(
        &self,
        path: &str,
        content: &[u8],
    ) -> Result<SftpWriteFileResult, AppError> {
        self.write_calls
            .lock()
            .expect("write calls lock")
            .push((path.to_string(), content.to_vec()));
        Ok(SftpWriteFileResult {
            requested_path: path.to_string(),
            resolved_path: "/var/www/html/index.php".to_string(),
            written_bytes: content.len() as u64,
        })
    }

    async fn close(&self) -> Result<(), AppError> {
        Ok(())
    }
}

struct FakeConnection {
    open_sftp_calls: Mutex<usize>,
    sftp_session: Arc<FakeSftpSession>,
}

#[async_trait::async_trait]
impl SshConnectionPort for FakeConnection {
    async fn open_shell(&self) -> Result<Arc<dyn SshShellPort + Send + Sync>, AppError> {
        Ok(Arc::new(FakeShell))
    }

    async fn open_sftp(&self) -> Result<Arc<dyn SftpSessionPort + Send + Sync>, AppError> {
        let mut calls = self.open_sftp_calls.lock().expect("open sftp call lock");
        *calls += 1;
        Ok(self.sftp_session.clone())
    }

    async fn disconnect(&self) -> Result<(), AppError> {
        Ok(())
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
        unreachable!("unused in sftp service test")
    }

    fn update_site(&self, _input: SiteCatalogUpdateInput) -> Result<SiteRecord, AppError> {
        unreachable!("unused in sftp service test")
    }

    fn delete_site(&self, _site_id: &str) -> Result<(), AppError> {
        unreachable!("unused in sftp service test")
    }

    fn site_has_session_hint(&self, _site_id: &str) -> Result<bool, AppError> {
        unreachable!("unused in sftp service test")
    }

    fn set_site_session_hint(&self, _site_id: &str, _has_session: bool) -> Result<(), AppError> {
        unreachable!("unused in sftp service test")
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
        unreachable!("unused in sftp service test")
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

fn build_active_session(connection: Arc<FakeConnection>) -> ActiveSshSession {
    ActiveSshSession {
        active_profile: SshSessionProfileSummary {
            ssh_profile_id: "ssh-profile-1".to_string(),
            name: "운영 SSH".to_string(),
            host: "ssh.alpha.example.com".to_string(),
            port: 22,
            username: "deploy".to_string(),
            auth_type: SshAuthType::Key,
        },
        connected_at: "1742600000".to_string(),
        connection,
        shell: Arc::new(RwLock::new(None)),
        shell_subscribers: Arc::new(RwLock::new(Vec::new())),
        shell_stream_task: Arc::new(RwLock::new(None)),
        sftp: Arc::new(RwLock::new(None)),
        server_key_algorithm: "Ed25519".to_string(),
        server_key_fingerprint: "SHA256:test".to_string(),
    }
}

#[tokio::test]
async fn list_dir_and_stat_reuse_the_same_cached_sftp_session() {
    let gate = AllowAllGate;
    let site_store = FakeSiteStore {
        activities: Mutex::new(Vec::new()),
        sites: vec![build_site()],
    };
    let fake_sftp = Arc::new(FakeSftpSession::default());
    let fake_connection = Arc::new(FakeConnection {
        open_sftp_calls: Mutex::new(0),
        sftp_session: fake_sftp.clone(),
    });
    let sessions = RwLock::new(HashMap::from([(
        "site-alpha".to_string(),
        build_active_session(fake_connection.clone()),
    )]));
    let service = SftpService::new(&gate, &site_store, SshSessionRuntime::new(&sessions));

    let listing = service
        .list_dir(
            "req-dir",
            SftpListDirInput {
                site_id: "site-alpha".to_string(),
                path: ".".to_string(),
            },
        )
        .await
        .expect("sftp list dir should succeed");
    assert_eq!(listing.resolved_path, "/var/www/html");
    assert_eq!(listing.parent_path.as_deref(), Some("/var/www"));
    assert_eq!(listing.entries.len(), 2);
    assert_eq!(
        listing.entries[0].metadata.kind,
        g5_admin_models::models::ssh::SftpEntryKind::Directory
    );

    let stat = service
        .stat(
            "req-stat",
            SftpStatInput {
                site_id: "site-alpha".to_string(),
                path: "/var/www/html/index.php".to_string(),
            },
        )
        .await
        .expect("sftp stat should succeed");
    assert_eq!(stat.resolved_path, "/var/www/html/index.php");
    assert_eq!(
        stat.metadata.kind,
        g5_admin_models::models::ssh::SftpEntryKind::File
    );
    assert_eq!(stat.metadata.permissions_octal.as_deref(), Some("644"));

    assert_eq!(
        *fake_connection
            .open_sftp_calls
            .lock()
            .expect("open sftp call lock"),
        1
    );
    assert_eq!(
        fake_sftp
            .list_dir_calls
            .lock()
            .expect("list dir calls lock")
            .as_slice(),
        ["."]
    );
    assert_eq!(
        fake_sftp
            .stat_calls
            .lock()
            .expect("stat calls lock")
            .as_slice(),
        ["/var/www/html/index.php"]
    );
    assert_eq!(
        site_store
            .activities
            .lock()
            .expect("activity lock")
            .as_slice(),
        ["site.sftp.open"]
    );
}

#[tokio::test]
async fn list_dir_requires_active_ssh_connection() {
    let gate = AllowAllGate;
    let site_store = FakeSiteStore {
        activities: Mutex::new(Vec::new()),
        sites: vec![build_site()],
    };
    let sessions = RwLock::new(HashMap::new());
    let service = SftpService::new(&gate, &site_store, SshSessionRuntime::new(&sessions));

    let error = service
        .list_dir(
            "req-dir",
            SftpListDirInput {
                site_id: "site-alpha".to_string(),
                path: ".".to_string(),
            },
        )
        .await
        .expect_err("sftp list dir should require active ssh connection");

    match error {
        AppError::Config { message } => {
            assert!(message.contains("활성 SSH 연결"));
        }
        other => panic!("unexpected error: {other:?}"),
    }
}

#[tokio::test]
async fn read_file_reuses_cached_sftp_session() {
    let gate = AllowAllGate;
    let site_store = FakeSiteStore {
        activities: Mutex::new(Vec::new()),
        sites: vec![build_site()],
    };
    let fake_sftp = Arc::new(FakeSftpSession::default());
    let fake_connection = Arc::new(FakeConnection {
        open_sftp_calls: Mutex::new(0),
        sftp_session: fake_sftp.clone(),
    });
    let sessions = RwLock::new(HashMap::from([(
        "site-alpha".to_string(),
        build_active_session(fake_connection.clone()),
    )]));
    let service = SftpService::new(&gate, &site_store, SshSessionRuntime::new(&sessions));

    let response = service
        .read_file(
            "req-read",
            SftpReadFileInput {
                site_id: "site-alpha".to_string(),
                path: "/var/www/html/index.php".to_string(),
            },
        )
        .await
        .expect("sftp read file should succeed");

    assert_eq!(response.resolved_path, "/var/www/html/index.php");
    assert_eq!(response.content, "<?php echo 'hello'; ?>");
    assert_eq!(response.byte_length, 22);
    assert!(!response.truncated);
    assert!(!response.utf8_lossy);
    assert_eq!(
        *fake_connection
            .open_sftp_calls
            .lock()
            .expect("open sftp call lock"),
        1
    );
    assert_eq!(
        fake_sftp
            .read_file_calls
            .lock()
            .expect("read file calls lock")
            .as_slice(),
        &[("/var/www/html/index.php".to_string(), 131_072)]
    );
}

#[tokio::test]
async fn download_file_reuses_cached_sftp_session() {
    let gate = AllowAllGate;
    let site_store = FakeSiteStore {
        activities: Mutex::new(Vec::new()),
        sites: vec![build_site()],
    };
    let fake_sftp = Arc::new(FakeSftpSession::default());
    let fake_connection = Arc::new(FakeConnection {
        open_sftp_calls: Mutex::new(0),
        sftp_session: fake_sftp.clone(),
    });
    let sessions = RwLock::new(HashMap::from([(
        "site-alpha".to_string(),
        build_active_session(fake_connection.clone()),
    )]));
    let service = super::super::sftp_download_service::SftpDownloadService::new(
        &gate,
        &site_store,
        SshSessionRuntime::new(&sessions),
    );

    let response = service
        .download_file(
            "req-download",
            SftpDownloadInput {
                site_id: "site-alpha".to_string(),
                path: "/var/www/html/index.php".to_string(),
                destination_path: "/tmp/index.php".to_string(),
            },
        )
        .await
        .expect("sftp download should succeed");

    assert_eq!(response.site_id, "site-alpha");
    assert_eq!(response.resolved_path, "/var/www/html/index.php");
    assert_eq!(response.destination_path, "/tmp/index.php");
    assert_eq!(response.copied_bytes, 22);
    assert_eq!(
        *fake_connection
            .open_sftp_calls
            .lock()
            .expect("open sftp call lock"),
        1
    );
    assert_eq!(
        fake_sftp
            .download_calls
            .lock()
            .expect("download calls lock")
            .as_slice(),
        &[(
            "/var/www/html/index.php".to_string(),
            PathBuf::from("/tmp/index.php"),
        )]
    );
    assert_eq!(
        site_store
            .activities
            .lock()
            .expect("activity lock")
            .as_slice(),
        ["site.sftp.open", "site.sftp.download"]
    );
}

#[tokio::test]
async fn upload_file_reuses_cached_sftp_session() {
    let gate = AllowAllGate;
    let site_store = FakeSiteStore {
        activities: Mutex::new(Vec::new()),
        sites: vec![build_site()],
    };
    let fake_sftp = Arc::new(FakeSftpSession::default());
    let fake_connection = Arc::new(FakeConnection {
        open_sftp_calls: Mutex::new(0),
        sftp_session: fake_sftp.clone(),
    });
    let sessions = RwLock::new(HashMap::from([(
        "site-alpha".to_string(),
        build_active_session(fake_connection.clone()),
    )]));
    let service = super::super::sftp_upload_service::SftpUploadService::new(
        &gate,
        &site_store,
        SshSessionRuntime::new(&sessions),
    );
    let source_path = create_temp_upload_source("index.php");

    let response = service
        .upload_file(
            "req-upload",
            SftpUploadInput {
                site_id: "site-alpha".to_string(),
                source_path: source_path.display().to_string(),
                destination_path: "/var/www/html/index.php".to_string(),
            },
        )
        .await
        .expect("sftp upload should succeed");

    assert_eq!(response.site_id, "site-alpha");
    assert_eq!(response.source_path, source_path.display().to_string());
    assert_eq!(response.destination_path, "/var/www/html/index.php");
    assert_eq!(response.resolved_path, "/var/www/html/index.php");
    assert_eq!(response.copied_bytes, 22);
    assert_eq!(
        *fake_connection
            .open_sftp_calls
            .lock()
            .expect("open sftp call lock"),
        1
    );
    assert_eq!(
        fake_sftp
            .upload_calls
            .lock()
            .expect("upload calls lock")
            .as_slice(),
        &[(source_path, "/var/www/html/index.php".to_string(),)]
    );
    assert_eq!(
        site_store
            .activities
            .lock()
            .expect("activity lock")
            .as_slice(),
        ["site.sftp.open", "site.sftp.upload"]
    );
}

#[tokio::test]
async fn mkdir_reuses_cached_sftp_session() {
    let gate = AllowAllGate;
    let site_store = FakeSiteStore {
        activities: Mutex::new(Vec::new()),
        sites: vec![build_site()],
    };
    let fake_sftp = Arc::new(FakeSftpSession::default());
    let fake_connection = Arc::new(FakeConnection {
        open_sftp_calls: Mutex::new(0),
        sftp_session: fake_sftp.clone(),
    });
    let sessions = RwLock::new(HashMap::from([(
        "site-alpha".to_string(),
        build_active_session(fake_connection.clone()),
    )]));
    let service = super::super::sftp_mkdir_service::SftpMkdirService::new(
        &gate,
        &site_store,
        SshSessionRuntime::new(&sessions),
    );

    let response = service
        .mkdir(
            "req-mkdir",
            SftpMkdirInput {
                site_id: "site-alpha".to_string(),
                path: "/var/www/html/releases".to_string(),
            },
        )
        .await
        .expect("sftp mkdir should succeed");

    assert_eq!(response.site_id, "site-alpha");
    assert_eq!(response.requested_path, "/var/www/html/releases");
    assert_eq!(response.resolved_path, "/var/www/html/releases");
    assert_eq!(
        *fake_connection
            .open_sftp_calls
            .lock()
            .expect("open sftp call lock"),
        1
    );
    assert_eq!(
        fake_sftp
            .mkdir_calls
            .lock()
            .expect("mkdir calls lock")
            .as_slice(),
        ["/var/www/html/releases"]
    );
    assert_eq!(
        site_store
            .activities
            .lock()
            .expect("activity lock")
            .as_slice(),
        ["site.sftp.open", "site.sftp.mkdir"]
    );
}

#[tokio::test]
async fn delete_reuses_cached_sftp_session() {
    let gate = AllowAllGate;
    let site_store = FakeSiteStore {
        activities: Mutex::new(Vec::new()),
        sites: vec![build_site()],
    };
    let fake_sftp = Arc::new(FakeSftpSession::default());
    let fake_connection = Arc::new(FakeConnection {
        open_sftp_calls: Mutex::new(0),
        sftp_session: fake_sftp.clone(),
    });
    let sessions = RwLock::new(HashMap::from([(
        "site-alpha".to_string(),
        build_active_session(fake_connection.clone()),
    )]));
    let service = super::super::sftp_delete_service::SftpDeleteService::new(
        &gate,
        &site_store,
        SshSessionRuntime::new(&sessions),
    );

    let response = service
        .delete(
            "req-delete",
            SftpDeleteInput {
                site_id: "site-alpha".to_string(),
                path: "/var/www/html/index.php".to_string(),
                recursive: false,
            },
        )
        .await
        .expect("sftp delete should succeed");

    assert_eq!(response.site_id, "site-alpha");
    assert_eq!(response.requested_path, "/var/www/html/index.php");
    assert_eq!(response.resolved_path, "/var/www/html/index.php");
    assert_eq!(
        response.kind,
        g5_admin_models::models::ssh::SftpEntryKind::File
    );
    assert_eq!(response.deleted_count, 1);
    assert_eq!(
        *fake_connection
            .open_sftp_calls
            .lock()
            .expect("open sftp call lock"),
        1
    );
    assert_eq!(
        fake_sftp
            .delete_calls
            .lock()
            .expect("delete calls lock")
            .as_slice(),
        ["/var/www/html/index.php|recursive=false"]
    );
    assert_eq!(
        site_store
            .activities
            .lock()
            .expect("activity lock")
            .as_slice(),
        ["site.sftp.open", "site.sftp.delete"]
    );
}

#[tokio::test]
async fn write_file_reuses_cached_sftp_session() {
    let gate = AllowAllGate;
    let site_store = FakeSiteStore {
        activities: Mutex::new(Vec::new()),
        sites: vec![build_site()],
    };
    let fake_sftp = Arc::new(FakeSftpSession::default());
    let fake_connection = Arc::new(FakeConnection {
        open_sftp_calls: Mutex::new(0),
        sftp_session: fake_sftp.clone(),
    });
    let sessions = RwLock::new(HashMap::from([(
        "site-alpha".to_string(),
        build_active_session(fake_connection.clone()),
    )]));
    let service = super::super::sftp_write_service::SftpWriteService::new(
        &gate,
        &site_store,
        SshSessionRuntime::new(&sessions),
    );

    let response = service
        .write_file(
            "req-write",
            SftpWriteFileInput {
                site_id: "site-alpha".to_string(),
                path: "/var/www/html/index.php".to_string(),
                content: "<?php echo 'updated'; ?>".to_string(),
            },
        )
        .await
        .expect("sftp write should succeed");

    assert_eq!(response.site_id, "site-alpha");
    assert_eq!(response.requested_path, "/var/www/html/index.php");
    assert_eq!(response.resolved_path, "/var/www/html/index.php");
    assert_eq!(response.byte_length, 24);
    assert_eq!(
        *fake_connection
            .open_sftp_calls
            .lock()
            .expect("open sftp call lock"),
        1
    );
    assert_eq!(
        fake_sftp
            .write_calls
            .lock()
            .expect("write calls lock")
            .as_slice(),
        &[(
            "/var/www/html/index.php".to_string(),
            b"<?php echo 'updated'; ?>".to_vec(),
        )]
    );
    assert_eq!(
        site_store
            .activities
            .lock()
            .expect("activity lock")
            .as_slice(),
        ["site.sftp.open", "site.sftp.write"]
    );
}

#[tokio::test]
async fn transfer_queue_processes_upload_and_download_items() {
    let gate = Arc::new(AllowAllGate);
    let site_store = Arc::new(FakeSiteStore {
        activities: Mutex::new(Vec::new()),
        sites: vec![build_site()],
    });
    let fake_sftp = Arc::new(FakeSftpSession::default());
    let fake_connection = Arc::new(FakeConnection {
        open_sftp_calls: Mutex::new(0),
        sftp_session: fake_sftp.clone(),
    });
    let sessions = Arc::new(RwLock::new(HashMap::from([(
        "site-alpha".to_string(),
        build_active_session(fake_connection),
    )])));
    let host = Arc::new(SftpTransferQueueHost::new());
    let service = SftpTransferService::new(gate, site_store.clone(), sessions, host, None);
    let source_path = create_temp_upload_source("queue-logo.png");

    let initial_snapshot = service
        .enqueue(SftpTransferEnqueueInput {
            site_id: "site-alpha".to_string(),
            items: vec![
                SftpTransferEnqueueItemInput {
                    direction: SftpTransferDirection::Upload,
                    source_path: source_path.display().to_string(),
                    destination_path: "/var/www/html/logo.png".to_string(),
                    source_kind: None,
                    recursive: false,
                    label: None,
                },
                SftpTransferEnqueueItemInput {
                    direction: SftpTransferDirection::Download,
                    source_path: "/var/www/html/index.php".to_string(),
                    destination_path: "/Users/test/Downloads/index.php".to_string(),
                    source_kind: Some(SftpEntryKind::File),
                    recursive: false,
                    label: None,
                },
            ],
        })
        .await
        .expect("transfer enqueue should succeed");

    assert_eq!(initial_snapshot.site_id, "site-alpha");
    assert_eq!(initial_snapshot.items.len(), 2);

    let final_snapshot = loop {
        let snapshot = service
            .snapshot(SftpTransferSnapshotInput {
                site_id: "site-alpha".to_string(),
            })
            .await
            .expect("transfer snapshot should succeed");
        if snapshot.active_count == 0 && snapshot.queued_count == 0 {
            break snapshot;
        }
        sleep(Duration::from_millis(10)).await;
    };

    assert_eq!(final_snapshot.items.len(), 2);
    assert!(final_snapshot
        .items
        .iter()
        .all(|item| item.status == SftpTransferItemStatus::Succeeded));
    assert_eq!(
        fake_sftp
            .upload_calls
            .lock()
            .expect("upload calls lock")
            .len(),
        1
    );
    assert_eq!(
        fake_sftp
            .download_calls
            .lock()
            .expect("download calls lock")
            .len(),
        1
    );
    let activities = site_store.activities.lock().expect("activity lock").clone();
    assert_eq!(
        activities.first().map(String::as_str),
        Some("site.sftp.open")
    );
    assert!(activities.contains(&"site.sftp.upload".to_string()));
    assert!(activities.contains(&"site.sftp.download".to_string()));
}
