mod backup;
mod error;
mod portable_backup;
mod records;
mod security;

use std::{
    fs::{self, File, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    sync::Arc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

pub use backup::{BackupArtifact, BackupManifest, BackupReadback};
use error::io_error;
pub use error::{StoreError, StoreResult};
pub use portable_backup::{
    PortableBackupEnvelope, PortableBackupImport, decrypt_portable_backup, encrypt_portable_backup,
};
pub use records::{
    EncryptedSecretRecord, JobRecord, NotificationOutboxRecord, SessionRecord, SiteImportRecord,
    SiteImportSummary, SiteRecord, UserCredential,
};
pub use security::{
    AuditEntry, EncryptedTotpSecret, InstallationSecurityState, PendingInstallChallenge,
    UserSecuritySettings,
};
use serde::{Deserialize, Serialize};
use sqlx::{
    SqlitePool,
    migrate::Migrator,
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous},
};
use tokio::sync::Mutex;

pub const EXPECTED_SCHEMA_VERSION: i64 = 3;
pub const APPLICATION_ID: i64 = 1_194_673_740;
pub const DATABASE_FILENAME: &str = "fleet.sqlite3";
pub const IDENTITY_FILENAME: &str = "installation.json";
const LOCK_FILENAME: &str = "fleet.lock";
const BUSY_TIMEOUT_MILLIS: i64 = 5_000;
static MIGRATOR: Migrator = sqlx::migrate!("./migrations");

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct InstallationIdentity {
    pub schema: String,
    pub installation_id: String,
    pub database_filename: String,
    pub schema_version: i64,
    pub created_at_unix: u64,
}

#[derive(Clone)]
pub struct FleetStore {
    pub(crate) inner: Arc<StoreInner>,
}

pub(crate) struct StoreInner {
    pub(crate) pool: SqlitePool,
    pub(crate) writer: Mutex<()>,
    pub(crate) data_dir: PathBuf,
    pub(crate) database_path: PathBuf,
    pub(crate) identity: InstallationIdentity,
    _lock_file: File,
}

impl std::fmt::Debug for FleetStore {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("FleetStore")
            .field("data_dir", &self.inner.data_dir)
            .field("database_path", &self.inner.database_path)
            .field("schema_version", &self.inner.identity.schema_version)
            .finish_non_exhaustive()
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
pub struct StoreReadback {
    pub users: i64,
    pub sites: i64,
    pub outbox: i64,
    pub jobs: i64,
    pub audit_entries: i64,
}

impl FleetStore {
    pub async fn initialize(
        data_dir: impl AsRef<Path>,
        installation_id: &str,
    ) -> StoreResult<Self> {
        validate_installation_id(installation_id)?;
        let data_dir = prepare_new_data_directory(data_dir.as_ref())?;
        let database_path = data_dir.join(DATABASE_FILENAME);
        let identity_path = data_dir.join(IDENTITY_FILENAME);
        if database_path.exists() || identity_path.exists() {
            return Err(StoreError::AlreadyInitialized(data_dir));
        }
        let lock_file = acquire_installation_lock(&data_dir)?;
        let pool = connect_database(&database_path, true).await?;

        if let Err(error) = MIGRATOR.run(&pool).await {
            pool.close().await;
            return Err(error.into());
        }
        verify_database(&pool, true).await?;

        let identity = InstallationIdentity {
            schema: "g5-fleet.installation/v1".to_owned(),
            installation_id: installation_id.to_owned(),
            database_filename: DATABASE_FILENAME.to_owned(),
            schema_version: EXPECTED_SCHEMA_VERSION,
            created_at_unix: unix_timestamp()?,
        };
        {
            let mut transaction = pool.begin().await?;
            sqlx::query(
                "INSERT INTO installation_metadata \
                 (singleton, installation_id, schema_version) VALUES (1, ?, ?)",
            )
            .bind(&identity.installation_id)
            .bind(identity.schema_version)
            .execute(&mut *transaction)
            .await?;
            transaction.commit().await?;
        }
        verify_installation_metadata(&pool, &identity).await?;
        set_private_permissions(&database_path)?;
        write_json_atomic(&identity_path, &identity)?;
        sync_directory(&data_dir)?;

        Ok(Self {
            inner: Arc::new(StoreInner {
                pool,
                writer: Mutex::new(()),
                data_dir,
                database_path,
                identity,
                _lock_file: lock_file,
            }),
        })
    }

    pub async fn open_existing(data_dir: impl AsRef<Path>) -> StoreResult<Self> {
        let data_dir = require_existing_data_directory(data_dir.as_ref())?;
        let identity_path = data_dir.join(IDENTITY_FILENAME);
        let database_path = data_dir.join(DATABASE_FILENAME);
        require_regular_file(&identity_path, StoreError::MissingIdentity)?;
        require_regular_file(&database_path, StoreError::MissingDatabase)?;

        let identity: InstallationIdentity = serde_json::from_slice(
            &fs::read(&identity_path)
                .map_err(|error| io_error("reading installation identity", error))?,
        )?;
        validate_identity(&identity)?;
        let lock_file = acquire_installation_lock(&data_dir)?;
        let pool = connect_database(&database_path, false).await?;
        if let Err(error) = verify_database(&pool, true).await {
            pool.close().await;
            return Err(error);
        }
        if let Err(error) = verify_installation_metadata(&pool, &identity).await {
            pool.close().await;
            return Err(error);
        }

        Ok(Self {
            inner: Arc::new(StoreInner {
                pool,
                writer: Mutex::new(()),
                data_dir,
                database_path,
                identity,
                _lock_file: lock_file,
            }),
        })
    }

    pub fn data_dir(&self) -> &Path {
        &self.inner.data_dir
    }

    pub fn database_path(&self) -> &Path {
        &self.inner.database_path
    }

    pub fn identity(&self) -> &InstallationIdentity {
        &self.inner.identity
    }

    pub async fn close(self) {
        self.inner.pool.close().await;
    }

    pub async fn quick_check(&self) -> StoreResult<()> {
        run_check(&self.inner.pool, "PRAGMA quick_check").await
    }

    pub async fn full_integrity_check(&self) -> StoreResult<()> {
        run_check(&self.inner.pool, "PRAGMA integrity_check").await?;
        let violations = sqlx::query("PRAGMA foreign_key_check")
            .fetch_all(&self.inner.pool)
            .await?;
        if !violations.is_empty() {
            return Err(StoreError::Integrity(format!(
                "foreign_key_check returned {} row(s)",
                violations.len()
            )));
        }
        Ok(())
    }

    pub async fn readback(&self) -> StoreResult<StoreReadback> {
        readback_pool(&self.inner.pool).await
    }

    pub async fn create_user(
        &self,
        user_id: &str,
        login_name: &str,
        password_hash: &[u8],
    ) -> StoreResult<()> {
        let _writer = self.inner.writer.lock().await;
        let mut transaction = self.inner.pool.begin().await?;
        sqlx::query(
            "INSERT INTO fleet_users (user_id, login_name, password_hash) VALUES (?, ?, ?)",
        )
        .bind(user_id)
        .bind(login_name)
        .bind(password_hash)
        .execute(&mut *transaction)
        .await?;
        sqlx::query("INSERT INTO user_security_settings (user_id) VALUES (?)")
            .bind(user_id)
            .execute(&mut *transaction)
            .await?;
        transaction.commit().await?;
        Ok(())
    }

    pub async fn create_site(
        &self,
        site_id: &str,
        owner_user_id: &str,
        display_name: &str,
        base_url: &str,
    ) -> StoreResult<()> {
        let _writer = self.inner.writer.lock().await;
        let mut transaction = self.inner.pool.begin().await?;
        sqlx::query(
            "INSERT INTO sites \
             (site_id, owner_user_id, display_name, base_url) VALUES (?, ?, ?, ?)",
        )
        .bind(site_id)
        .bind(owner_user_id)
        .bind(display_name)
        .bind(base_url)
        .execute(&mut *transaction)
        .await?;
        transaction.commit().await?;
        Ok(())
    }

    pub async fn enqueue_notification(
        &self,
        outbox_id: &str,
        event_id: &str,
        owner_user_id: &str,
        site_id: Option<&str>,
        channel: &str,
        payload: &serde_json::Value,
    ) -> StoreResult<()> {
        let _writer = self.inner.writer.lock().await;
        let mut transaction = self.inner.pool.begin().await?;
        sqlx::query(
            "INSERT INTO notification_outbox \
             (outbox_id, event_id, owner_user_id, site_id, channel, payload_json) \
             VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(outbox_id)
        .bind(event_id)
        .bind(owner_user_id)
        .bind(site_id)
        .bind(channel)
        .bind(serde_json::to_string(payload)?)
        .execute(&mut *transaction)
        .await?;
        transaction.commit().await?;
        Ok(())
    }

    pub async fn append_audit(
        &self,
        request_id: Option<&str>,
        principal_id: Option<&str>,
        site_id: Option<&str>,
        action: &str,
        outcome: &str,
        details: &serde_json::Value,
    ) -> StoreResult<()> {
        let _writer = self.inner.writer.lock().await;
        let mut transaction = self.inner.pool.begin().await?;
        sqlx::query(
            "INSERT INTO audit_log \
             (request_id, principal_id, site_id, action, outcome, details_json) \
             VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(request_id)
        .bind(principal_id)
        .bind(site_id)
        .bind(action)
        .bind(outcome)
        .bind(serde_json::to_string(details)?)
        .execute(&mut *transaction)
        .await?;
        transaction.commit().await?;
        Ok(())
    }
}

async fn connect_database(path: &Path, create: bool) -> StoreResult<SqlitePool> {
    let options = SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(create)
        .journal_mode(SqliteJournalMode::Wal)
        .synchronous(SqliteSynchronous::Full)
        .foreign_keys(true)
        .busy_timeout(Duration::from_millis(BUSY_TIMEOUT_MILLIS as u64));
    Ok(SqlitePoolOptions::new()
        .min_connections(1)
        .max_connections(4)
        .connect_with(options)
        .await?)
}

async fn verify_database(pool: &SqlitePool, require_schema: bool) -> StoreResult<()> {
    let journal_mode: String = sqlx::query_scalar("PRAGMA journal_mode")
        .fetch_one(pool)
        .await?;
    let synchronous: i64 = sqlx::query_scalar("PRAGMA synchronous")
        .fetch_one(pool)
        .await?;
    let foreign_keys: i64 = sqlx::query_scalar("PRAGMA foreign_keys")
        .fetch_one(pool)
        .await?;
    let busy_timeout: i64 = sqlx::query_scalar("PRAGMA busy_timeout")
        .fetch_one(pool)
        .await?;
    if !journal_mode.eq_ignore_ascii_case("wal") {
        return Err(StoreError::SettingMismatch(format!(
            "journal_mode={journal_mode}"
        )));
    }
    if synchronous != 2 {
        return Err(StoreError::SettingMismatch(format!(
            "synchronous={synchronous}"
        )));
    }
    if foreign_keys != 1 {
        return Err(StoreError::SettingMismatch(format!(
            "foreign_keys={foreign_keys}"
        )));
    }
    if busy_timeout != BUSY_TIMEOUT_MILLIS {
        return Err(StoreError::SettingMismatch(format!(
            "busy_timeout={busy_timeout}"
        )));
    }
    run_check(pool, "PRAGMA quick_check").await?;
    if require_schema {
        verify_schema(pool).await?;
    }
    Ok(())
}

async fn verify_schema(pool: &SqlitePool) -> StoreResult<()> {
    let application_id: i64 = sqlx::query_scalar("PRAGMA application_id")
        .fetch_one(pool)
        .await?;
    if application_id != APPLICATION_ID {
        return Err(StoreError::SettingMismatch(format!(
            "application_id={application_id}"
        )));
    }
    let user_version: i64 = sqlx::query_scalar("PRAGMA user_version")
        .fetch_one(pool)
        .await?;
    if user_version != EXPECTED_SCHEMA_VERSION {
        return Err(StoreError::SchemaMismatch {
            expected: EXPECTED_SCHEMA_VERSION,
            actual: user_version,
        });
    }
    let migration_version: Option<i64> =
        sqlx::query_scalar("SELECT MAX(version) FROM _sqlx_migrations WHERE success = 1")
            .fetch_one(pool)
            .await?;
    let migration_version = migration_version.unwrap_or_default();
    if migration_version != EXPECTED_SCHEMA_VERSION {
        return Err(StoreError::SchemaMismatch {
            expected: EXPECTED_SCHEMA_VERSION,
            actual: migration_version,
        });
    }
    Ok(())
}

async fn verify_installation_metadata(
    pool: &SqlitePool,
    identity: &InstallationIdentity,
) -> StoreResult<()> {
    let row: Option<(String, i64)> = sqlx::query_as(
        "SELECT installation_id, schema_version \
         FROM installation_metadata WHERE singleton = 1",
    )
    .fetch_optional(pool)
    .await?;
    match row {
        Some((installation_id, schema_version))
            if installation_id == identity.installation_id
                && schema_version == identity.schema_version =>
        {
            Ok(())
        }
        Some((installation_id, schema_version)) => Err(StoreError::InvalidIdentity(format!(
            "database identity/version mismatch: id={installation_id} schema={schema_version}"
        ))),
        None => Err(StoreError::InvalidIdentity(
            "database installation metadata is missing".to_owned(),
        )),
    }
}

async fn run_check(pool: &SqlitePool, pragma: &str) -> StoreResult<()> {
    let results: Vec<String> = sqlx::query_scalar(pragma).fetch_all(pool).await?;
    if results.len() != 1 || !results[0].eq_ignore_ascii_case("ok") {
        return Err(StoreError::Integrity(results.join("; ")));
    }
    Ok(())
}

pub(crate) async fn readback_pool(pool: &SqlitePool) -> StoreResult<StoreReadback> {
    Ok(StoreReadback {
        users: table_count(pool, "fleet_users").await?,
        sites: table_count(pool, "sites").await?,
        outbox: table_count(pool, "notification_outbox").await?,
        jobs: table_count(pool, "jobs").await?,
        audit_entries: table_count(pool, "audit_log").await?,
    })
}

async fn table_count(pool: &SqlitePool, table: &str) -> StoreResult<i64> {
    let query = format!("SELECT COUNT(*) FROM {table}");
    Ok(sqlx::query_scalar(&query).fetch_one(pool).await?)
}

fn validate_installation_id(value: &str) -> StoreResult<()> {
    if !(8..=128).contains(&value.len())
        || !value
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || "-_".contains(character))
    {
        return Err(StoreError::InvalidIdentity(
            "installation_id must be 8-128 ASCII letters, digits, '-' or '_'".to_owned(),
        ));
    }
    Ok(())
}

fn validate_identity(identity: &InstallationIdentity) -> StoreResult<()> {
    validate_installation_id(&identity.installation_id)?;
    if identity.schema != "g5-fleet.installation/v1"
        || identity.database_filename != DATABASE_FILENAME
        || identity.schema_version != EXPECTED_SCHEMA_VERSION
    {
        return Err(StoreError::InvalidIdentity(format!(
            "schema={} database={} version={}",
            identity.schema, identity.database_filename, identity.schema_version
        )));
    }
    Ok(())
}

pub(crate) fn prepare_new_data_directory(path: &Path) -> StoreResult<PathBuf> {
    if path.exists() {
        if path.is_symlink() || !path.is_dir() {
            return Err(StoreError::UnsafeDataDirectory(path.to_path_buf()));
        }
    } else {
        fs::create_dir_all(path)
            .map_err(|error| io_error("creating Fleet data directory", error))?;
    }
    set_private_permissions(path)?;
    fs::canonicalize(path).map_err(|error| io_error("resolving Fleet data directory", error))
}

fn require_existing_data_directory(path: &Path) -> StoreResult<PathBuf> {
    if !path.is_dir() || path.is_symlink() {
        return Err(StoreError::UnsafeDataDirectory(path.to_path_buf()));
    }
    fs::canonicalize(path).map_err(|error| io_error("resolving Fleet data directory", error))
}

fn require_regular_file(path: &Path, missing: fn(PathBuf) -> StoreError) -> StoreResult<()> {
    if path.is_symlink() {
        return Err(StoreError::SymlinkForbidden(path.to_path_buf()));
    }
    if !path.is_file() {
        return Err(missing(path.to_path_buf()));
    }
    Ok(())
}

pub(crate) fn acquire_installation_lock(data_dir: &Path) -> StoreResult<File> {
    let path = data_dir.join(LOCK_FILENAME);
    if path.is_symlink() {
        return Err(StoreError::SymlinkForbidden(path));
    }
    let file = OpenOptions::new()
        .create(true)
        .truncate(false)
        .read(true)
        .write(true)
        .open(&path)
        .map_err(|error| io_error("opening Fleet installation lock", error))?;
    set_private_permissions(&path)?;
    fs2::FileExt::try_lock_exclusive(&file).map_err(|_| StoreError::InstallationLocked)?;
    Ok(file)
}

pub(crate) fn write_json_atomic<T: Serialize>(path: &Path, value: &T) -> StoreResult<()> {
    if path.exists() || path.is_symlink() {
        return Err(StoreError::UnsafeBackupTarget(path.to_path_buf()));
    }
    let parent = path
        .parent()
        .ok_or_else(|| StoreError::UnsafeBackupTarget(path.to_path_buf()))?;
    let temporary = parent.join(format!(
        ".{}.{}.tmp",
        path.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("fleet"),
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| StoreError::InvalidIdentity("system clock is before UNIX epoch".into()))?
            .as_nanos()
    ));
    let result = (|| -> StoreResult<()> {
        let mut file = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&temporary)
            .map_err(|error| io_error("creating atomic JSON temporary file", error))?;
        set_private_permissions(&temporary)?;
        file.write_all(&serde_json::to_vec_pretty(value)?)
            .map_err(|error| io_error("writing atomic JSON temporary file", error))?;
        file.write_all(b"\n")
            .map_err(|error| io_error("writing atomic JSON newline", error))?;
        file.sync_all()
            .map_err(|error| io_error("syncing atomic JSON temporary file", error))?;
        fs::rename(&temporary, path)
            .map_err(|error| io_error("publishing atomic JSON file", error))?;
        sync_directory(parent)?;
        Ok(())
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    result
}

pub(crate) fn set_private_permissions(path: &Path) -> StoreResult<()> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let permissions = fs::Permissions::from_mode(if path.is_dir() { 0o700 } else { 0o600 });
        fs::set_permissions(path, permissions)
            .map_err(|error| io_error("setting private Fleet permissions", error))?;
    }
    Ok(())
}

pub(crate) fn sync_directory(path: &Path) -> StoreResult<()> {
    File::open(path)
        .and_then(|directory| directory.sync_all())
        .map_err(|error| io_error("syncing directory metadata", error))
}

fn unix_timestamp() -> StoreResult<u64> {
    Ok(SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| StoreError::InvalidIdentity("system clock is before UNIX epoch".into()))?
        .as_secs())
}
