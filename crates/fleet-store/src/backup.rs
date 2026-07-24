use std::{
    fs::{self, File, OpenOptions},
    io::{Read, Write},
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::{
    SqlitePool,
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
};

use crate::{
    DATABASE_FILENAME, EXPECTED_SCHEMA_VERSION, FleetStore, InstallationIdentity, StoreError,
    StoreReadback, StoreResult, acquire_installation_lock, error::io_error,
    prepare_new_data_directory, readback_pool, run_check, set_private_permissions, sync_directory,
    verify_installation_metadata, verify_schema, write_json_atomic,
};

pub type BackupReadback = StoreReadback;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct BackupManifest {
    pub schema: String,
    pub method: String,
    pub snapshot_sha256: String,
    pub created_at_unix: u64,
    pub server_version: String,
    pub git_sha: String,
    pub sqlite_version: String,
    pub database_filename: String,
    pub schema_version: i64,
    pub installation: InstallationIdentity,
    pub readback: BackupReadback,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BackupArtifact {
    pub snapshot_path: PathBuf,
    pub manifest_path: PathBuf,
    pub manifest: BackupManifest,
}

impl FleetStore {
    pub async fn create_verified_backup(
        &self,
        snapshot_path: impl AsRef<Path>,
        server_version: &str,
        git_sha: &str,
    ) -> StoreResult<BackupArtifact> {
        let snapshot_path = snapshot_path.as_ref();
        validate_backup_target(snapshot_path, self.data_dir())?;
        let manifest_path = manifest_path(snapshot_path)?;
        if manifest_path.exists() || manifest_path.is_symlink() {
            return Err(StoreError::UnsafeBackupTarget(manifest_path));
        }

        let _writer = self.inner.writer.lock().await;
        let result = async {
            let snapshot_text = snapshot_path
                .to_str()
                .ok_or_else(|| StoreError::UnsafeBackupTarget(snapshot_path.to_path_buf()))?;
            sqlx::query("VACUUM INTO ?")
                .bind(snapshot_text)
                .execute(&self.inner.pool)
                .await?;
            set_private_permissions(snapshot_path)?;
            File::open(snapshot_path)
                .and_then(|file| file.sync_all())
                .map_err(|error| io_error("syncing SQLite backup snapshot", error))?;
            sync_directory(
                snapshot_path
                    .parent()
                    .ok_or_else(|| StoreError::UnsafeBackupTarget(snapshot_path.to_path_buf()))?,
            )?;

            let (readback, sqlite_version) =
                verify_snapshot(snapshot_path, self.identity()).await?;
            let manifest = BackupManifest {
                schema: "g5-fleet.backup/v1".to_owned(),
                method: "sqlite-vacuum-into".to_owned(),
                snapshot_sha256: sha256_file(snapshot_path)?,
                created_at_unix: unix_timestamp()?,
                server_version: server_version.to_owned(),
                git_sha: git_sha.to_owned(),
                sqlite_version,
                database_filename: DATABASE_FILENAME.to_owned(),
                schema_version: EXPECTED_SCHEMA_VERSION,
                installation: self.identity().clone(),
                readback,
            };
            write_json_atomic(&manifest_path, &manifest)?;
            Ok(BackupArtifact {
                snapshot_path: snapshot_path.to_path_buf(),
                manifest_path,
                manifest,
            })
        }
        .await;

        if result.is_err() {
            let _ = fs::remove_file(snapshot_path);
        }
        result
    }

    pub async fn restore_verified_backup(
        snapshot_path: impl AsRef<Path>,
        manifest_path: impl AsRef<Path>,
        restore_dir: impl AsRef<Path>,
    ) -> StoreResult<BackupReadback> {
        let snapshot_path = snapshot_path.as_ref();
        let manifest_path = manifest_path.as_ref();
        require_regular_snapshot(snapshot_path)?;
        require_regular_snapshot(manifest_path)?;
        let manifest: BackupManifest = serde_json::from_slice(
            &fs::read(manifest_path)
                .map_err(|error| io_error("reading SQLite backup manifest", error))?,
        )?;
        validate_manifest(&manifest, snapshot_path)?;
        let (source_readback, _) = verify_snapshot(snapshot_path, &manifest.installation).await?;
        if source_readback != manifest.readback {
            return Err(StoreError::BackupManifest(
                "snapshot critical-row readback differs from manifest".to_owned(),
            ));
        }

        let restore_dir = prepare_new_data_directory(restore_dir.as_ref())?;
        let database_path = restore_dir.join(DATABASE_FILENAME);
        let identity_path = restore_dir.join(crate::IDENTITY_FILENAME);
        if database_path.exists() || identity_path.exists() {
            return Err(StoreError::AlreadyInitialized(restore_dir));
        }
        let _lock = acquire_installation_lock(&restore_dir)?;
        let temporary = restore_dir.join(format!(".{DATABASE_FILENAME}.restore.tmp"));
        if temporary.exists() || temporary.is_symlink() {
            return Err(StoreError::UnsafeBackupTarget(temporary));
        }

        let result = async {
            copy_and_sync(snapshot_path, &temporary)?;
            let (restored_readback, _) =
                verify_snapshot(&temporary, &manifest.installation).await?;
            if restored_readback != manifest.readback {
                return Err(StoreError::BackupManifest(
                    "restored critical-row readback differs from manifest".to_owned(),
                ));
            }
            fs::rename(&temporary, &database_path)
                .map_err(|error| io_error("publishing restored SQLite database", error))?;
            sync_directory(&restore_dir)?;
            write_json_atomic(&identity_path, &manifest.installation)?;
            sync_directory(&restore_dir)?;
            Ok(restored_readback)
        }
        .await;

        if result.is_err() {
            let _ = fs::remove_file(&temporary);
        }
        result
    }
}

fn validate_backup_target(path: &Path, live_data_dir: &Path) -> StoreResult<()> {
    if path.exists() || path.is_symlink() {
        return Err(StoreError::UnsafeBackupTarget(path.to_path_buf()));
    }
    let parent = path
        .parent()
        .ok_or_else(|| StoreError::UnsafeBackupTarget(path.to_path_buf()))?;
    if !parent.is_dir() || parent.is_symlink() {
        return Err(StoreError::UnsafeBackupTarget(path.to_path_buf()));
    }
    let canonical_parent =
        fs::canonicalize(parent).map_err(|error| io_error("resolving backup directory", error))?;
    if canonical_parent == live_data_dir || canonical_parent.starts_with(live_data_dir) {
        return Err(StoreError::BackupInsideDataDirectory(path.to_path_buf()));
    }
    Ok(())
}

fn manifest_path(snapshot_path: &Path) -> StoreResult<PathBuf> {
    let filename = snapshot_path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| StoreError::UnsafeBackupTarget(snapshot_path.to_path_buf()))?;
    Ok(snapshot_path.with_file_name(format!("{filename}.manifest.json")))
}

fn require_regular_snapshot(path: &Path) -> StoreResult<()> {
    if path.is_symlink() || !path.is_file() {
        return Err(StoreError::UnsafeBackupTarget(path.to_path_buf()));
    }
    Ok(())
}

fn validate_manifest(manifest: &BackupManifest, snapshot_path: &Path) -> StoreResult<()> {
    if manifest.schema != "g5-fleet.backup/v1"
        || manifest.method != "sqlite-vacuum-into"
        || manifest.database_filename != DATABASE_FILENAME
        || manifest.schema_version != EXPECTED_SCHEMA_VERSION
        || manifest.installation.schema_version != EXPECTED_SCHEMA_VERSION
    {
        return Err(StoreError::BackupManifest(
            "unsupported backup schema, method, database, or version".to_owned(),
        ));
    }
    let actual_hash = sha256_file(snapshot_path)?;
    if actual_hash != manifest.snapshot_sha256 {
        return Err(StoreError::BackupManifest(format!(
            "SHA-256 mismatch: expected={} actual={actual_hash}",
            manifest.snapshot_sha256
        )));
    }
    Ok(())
}

async fn verify_snapshot(
    path: &Path,
    identity: &InstallationIdentity,
) -> StoreResult<(BackupReadback, String)> {
    let pool = connect_snapshot(path).await?;
    let result = async {
        run_check(&pool, "PRAGMA integrity_check").await?;
        let violations = sqlx::query("PRAGMA foreign_key_check")
            .fetch_all(&pool)
            .await?;
        if !violations.is_empty() {
            return Err(StoreError::Integrity(format!(
                "backup foreign_key_check returned {} row(s)",
                violations.len()
            )));
        }
        verify_schema(&pool).await?;
        verify_installation_metadata(&pool, identity).await?;
        let readback = readback_pool(&pool).await?;
        let sqlite_version: String = sqlx::query_scalar("SELECT sqlite_version()")
            .fetch_one(&pool)
            .await?;
        Ok((readback, sqlite_version))
    }
    .await;
    pool.close().await;
    result
}

async fn connect_snapshot(path: &Path) -> StoreResult<SqlitePool> {
    let options = SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(false)
        .read_only(true)
        .foreign_keys(true);
    Ok(SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await?)
}

fn copy_and_sync(source: &Path, target: &Path) -> StoreResult<()> {
    let mut input =
        File::open(source).map_err(|error| io_error("opening SQLite backup snapshot", error))?;
    let mut output = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(target)
        .map_err(|error| io_error("creating restored SQLite temporary file", error))?;
    set_private_permissions(target)?;
    let mut buffer = [0_u8; 128 * 1024];
    loop {
        let read = input
            .read(&mut buffer)
            .map_err(|error| io_error("reading SQLite backup snapshot", error))?;
        if read == 0 {
            break;
        }
        output
            .write_all(&buffer[..read])
            .map_err(|error| io_error("writing restored SQLite temporary file", error))?;
    }
    output
        .sync_all()
        .map_err(|error| io_error("syncing restored SQLite temporary file", error))
}

fn sha256_file(path: &Path) -> StoreResult<String> {
    let mut file =
        File::open(path).map_err(|error| io_error("opening backup for SHA-256", error))?;
    let mut digest = Sha256::new();
    let mut buffer = [0_u8; 128 * 1024];
    loop {
        let read = file
            .read(&mut buffer)
            .map_err(|error| io_error("reading backup for SHA-256", error))?;
        if read == 0 {
            break;
        }
        digest.update(&buffer[..read]);
    }
    Ok(hex::encode(digest.finalize()))
}

fn unix_timestamp() -> StoreResult<u64> {
    Ok(SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| StoreError::BackupManifest("system clock is before UNIX epoch".to_owned()))?
        .as_secs())
}
