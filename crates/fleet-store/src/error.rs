use std::{io, path::PathBuf};

#[derive(Debug, thiserror::Error)]
pub enum StoreError {
    #[error("Fleet data directory is unsafe: {0}")]
    UnsafeDataDirectory(PathBuf),
    #[error("Fleet installation is already initialized: {0}")]
    AlreadyInitialized(PathBuf),
    #[error("Fleet installation identity is missing: {0}")]
    MissingIdentity(PathBuf),
    #[error("Fleet database is missing; refusing to create an empty replacement: {0}")]
    MissingDatabase(PathBuf),
    #[error("Fleet database or identity path is a symlink: {0}")]
    SymlinkForbidden(PathBuf),
    #[error("another G5 Fleet process owns the data directory lock")]
    InstallationLocked,
    #[error("invalid Fleet installation identity: {0}")]
    InvalidIdentity(String),
    #[error("SQLite durability setting mismatch: {0}")]
    SettingMismatch(String),
    #[error("SQLite integrity check failed: {0}")]
    Integrity(String),
    #[error("SQLite schema mismatch: expected={expected} actual={actual}")]
    SchemaMismatch { expected: i64, actual: i64 },
    #[error("backup target is unsafe or already exists: {0}")]
    UnsafeBackupTarget(PathBuf),
    #[error("backup must be written outside the live data directory: {0}")]
    BackupInsideDataDirectory(PathBuf),
    #[error("backup manifest mismatch: {0}")]
    BackupManifest(String),
    #[error("I/O failed while {context}: {source}")]
    Io {
        context: &'static str,
        #[source]
        source: io::Error,
    },
    #[error(transparent)]
    Json(#[from] serde_json::Error),
    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),
    #[error(transparent)]
    Migration(#[from] sqlx::migrate::MigrateError),
}

pub type StoreResult<T> = Result<T, StoreError>;

pub(crate) fn io_error(context: &'static str, source: io::Error) -> StoreError {
    StoreError::Io { context, source }
}
