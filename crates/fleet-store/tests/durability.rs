use std::{
    fs::{self, OpenOptions},
    io::{Read, Seek, SeekFrom, Write},
    path::{Path, PathBuf},
    process::{Command, Stdio},
    time::Duration,
};

use g5_fleet_store::{
    DATABASE_FILENAME, EXPECTED_SCHEMA_VERSION, FleetStore, InstallationIdentity, StoreError,
    decrypt_portable_backup, encrypt_portable_backup,
};
use sqlx::{
    Connection, Executor, SqliteConnection, migrate::Migrator, sqlite::SqliteConnectOptions,
};
use tempfile::TempDir;

const INSTALLATION_ID: &str = "durability-test-installation";

#[tokio::test]
async fn initialization_is_explicit_locked_and_missing_database_fails_closed() {
    let data = TempDir::new().expect("data tempdir");
    let missing = FleetStore::open_existing(data.path()).await.unwrap_err();
    assert!(matches!(missing, StoreError::MissingIdentity(_)));

    let store = FleetStore::initialize(data.path(), INSTALLATION_ID)
        .await
        .expect("initialize");
    assert_eq!(store.identity().schema_version, EXPECTED_SCHEMA_VERSION);
    assert!(data.path().join("installation.json").is_file());
    assert!(data.path().join(DATABASE_FILENAME).is_file());

    let locked = FleetStore::open_existing(data.path()).await.unwrap_err();
    assert!(matches!(locked, StoreError::InstallationLocked));
    store.close().await;

    let second_initialize = FleetStore::initialize(data.path(), INSTALLATION_ID)
        .await
        .unwrap_err();
    assert!(matches!(
        second_initialize,
        StoreError::AlreadyInitialized(_)
    ));

    let database = data.path().join(DATABASE_FILENAME);
    let held = data.path().join("held.sqlite3");
    fs::rename(&database, &held).expect("temporarily move database");
    let missing = FleetStore::open_existing(data.path()).await.unwrap_err();
    assert!(matches!(missing, StoreError::MissingDatabase(_)));
    assert!(!database.exists(), "missing DB must not be recreated");
    fs::rename(held, database).expect("restore test database");

    let reopened = FleetStore::open_existing(data.path())
        .await
        .expect("reopen");
    reopened.full_integrity_check().await.expect("integrity");
}

#[tokio::test]
async fn existing_schema_migration_is_explicit_preserves_rows_and_repairs_stale_identity() {
    let data = TempDir::new().expect("data tempdir");
    let migration_dir = TempDir::new().expect("migration tempdir");
    fs::write(
        migration_dir.path().join("0001_control_plane.sql"),
        include_str!("../migrations/0001_control_plane.sql"),
    )
    .expect("v1 migration");
    fs::write(
        migration_dir.path().join("0002_security_boundary.sql"),
        include_str!("../migrations/0002_security_boundary.sql"),
    )
    .expect("v2 migration");
    fs::write(
        migration_dir.path().join("0003_install_auth_audit.sql"),
        include_str!("../migrations/0003_install_auth_audit.sql"),
    )
    .expect("v3 migration");
    let migrator = Migrator::new(migration_dir.path())
        .await
        .expect("load v3 migrations");
    let database = data.path().join(DATABASE_FILENAME);
    let mut connection = SqliteConnection::connect_with(
        &SqliteConnectOptions::new()
            .filename(&database)
            .create_if_missing(true)
            .foreign_keys(true),
    )
    .await
    .expect("create v3 database");
    migrator.run(&mut connection).await.expect("migrate to v3");
    sqlx::query(
        "INSERT INTO installation_metadata \
         (singleton, installation_id, schema_version) VALUES (1, ?, 3)",
    )
    .bind(INSTALLATION_ID)
    .execute(&mut connection)
    .await
    .expect("v3 installation metadata");
    sqlx::query(
        "INSERT INTO fleet_users (user_id, login_name, password_hash) \
         VALUES ('legacy-user', 'legacy-admin', ?)",
    )
    .bind(vec![7_u8; 32])
    .execute(&mut connection)
    .await
    .expect("legacy user");
    connection.close().await.expect("close v2 database");
    let mut identity = InstallationIdentity {
        schema: "g5-fleet.installation/v1".to_owned(),
        installation_id: INSTALLATION_ID.to_owned(),
        database_filename: DATABASE_FILENAME.to_owned(),
        schema_version: 3,
        created_at_unix: 1,
    };
    fs::write(
        data.path().join("installation.json"),
        serde_json::to_vec(&identity).expect("serialize v2 identity"),
    )
    .expect("write v2 identity");

    let normal_open = FleetStore::open_existing(data.path()).await.unwrap_err();
    assert!(
        matches!(normal_open, StoreError::InvalidIdentity(_)),
        "normal startup must not migrate implicitly"
    );

    let migrated = FleetStore::migrate_existing(data.path())
        .await
        .expect("explicit migration");
    migrated.full_integrity_check().await.expect("integrity");
    assert_eq!(migrated.identity().schema_version, EXPECTED_SCHEMA_VERSION);
    assert_eq!(migrated.readback().await.expect("readback").users, 1);
    migrated.close().await;

    identity.schema_version = 3;
    fs::write(
        data.path().join("installation.json"),
        serde_json::to_vec(&identity).expect("serialize stale identity"),
    )
    .expect("simulate interrupted identity update");
    let recovered = FleetStore::migrate_existing(data.path())
        .await
        .expect("repair stale identity after committed migration");
    assert_eq!(recovered.identity().schema_version, EXPECTED_SCHEMA_VERSION);
    assert_eq!(
        recovered.readback().await.expect("recovery readback").users,
        1
    );
    recovered.close().await;

    FleetStore::open_existing(data.path())
        .await
        .expect("open migrated store")
        .close()
        .await;
}

#[tokio::test]
async fn verified_backup_restores_critical_rows_to_separate_directory() {
    let data = TempDir::new().expect("data tempdir");
    let backup = TempDir::new().expect("backup tempdir");
    let restored = TempDir::new().expect("restore tempdir");
    let store = FleetStore::initialize(data.path(), INSTALLATION_ID)
        .await
        .expect("initialize");
    store
        .create_user("user-a", "admin", &[7_u8; 32])
        .await
        .expect("user");
    store
        .create_site("site-a", "user-a", "Example", "https://example.invalid")
        .await
        .expect("site");
    store
        .enqueue_notification(
            "outbox-a",
            "event-a",
            "user-a",
            Some("site-a"),
            "web_push",
            &serde_json::json!({"kind": "test"}),
        )
        .await
        .expect("outbox");

    let snapshot = backup.path().join("fleet-backup.sqlite3");
    let artifact = store
        .create_verified_backup(&snapshot, "0.1.0", "test-git-sha")
        .await
        .expect("verified backup");
    assert_eq!(artifact.manifest.snapshot_sha256.len(), 64);
    assert_eq!(artifact.manifest.readback.users, 1);
    assert_eq!(artifact.manifest.readback.sites, 1);
    assert_eq!(artifact.manifest.readback.outbox, 1);
    store.close().await;

    let restored_readback = FleetStore::restore_verified_backup(
        &artifact.snapshot_path,
        &artifact.manifest_path,
        restored.path(),
    )
    .await
    .expect("verified restore");
    assert_eq!(restored_readback, artifact.manifest.readback);
    let restored_store = FleetStore::open_existing(restored.path())
        .await
        .expect("open restored");
    restored_store
        .full_integrity_check()
        .await
        .expect("restored integrity");
    assert_eq!(
        restored_store.readback().await.expect("restored readback"),
        artifact.manifest.readback
    );

    let tampered = backup.path().join("tampered.sqlite3");
    fs::copy(&artifact.snapshot_path, &tampered).expect("tampered copy");
    let mut file = OpenOptions::new()
        .append(true)
        .open(&tampered)
        .expect("open tampered");
    file.write_all(b"tamper").expect("tamper snapshot");
    let rejected = FleetStore::restore_verified_backup(
        &tampered,
        &artifact.manifest_path,
        backup.path().join("rejected-restore"),
    )
    .await
    .unwrap_err();
    assert!(matches!(rejected, StoreError::BackupManifest(_)));
}

#[tokio::test]
async fn portable_backup_rejects_wrong_password_and_merges_owned_sites() {
    let source_data = TempDir::new().expect("source data");
    let target_data = TempDir::new().expect("target data");
    let source = FleetStore::initialize(source_data.path(), "portable-source")
        .await
        .expect("source store");
    source
        .create_user("user-a", "admin-a", &[7_u8; 32])
        .await
        .expect("source user");
    source
        .create_site("site-a", "user-a", "Source A", "https://a.example.invalid")
        .await
        .expect("source site");
    source
        .create_site("site-b", "user-a", "Source B", "https://b.example.invalid")
        .await
        .expect("source site");
    let source_sites = source
        .list_owned_sites("user-a")
        .await
        .expect("source sites");
    assert!(matches!(
        encrypt_portable_backup(&source_sites, "too short"),
        Err(StoreError::PortableBackup(_))
    ));
    let envelope = encrypt_portable_backup(&source_sites, "portable password")
        .expect("encrypted portable backup");
    assert_eq!(envelope.site_count, 2);
    assert!(matches!(
        decrypt_portable_backup(&envelope, "wrong password"),
        Err(StoreError::PortableBackup(_))
    ));

    let target = FleetStore::initialize(target_data.path(), "portable-target")
        .await
        .expect("target store");
    target
        .create_user("user-b", "admin-b", &[8_u8; 32])
        .await
        .expect("target user");
    target
        .create_site("site-a", "user-b", "Old A", "https://old.example.invalid")
        .await
        .expect("existing site");
    let payload =
        decrypt_portable_backup(&envelope, "portable password").expect("decrypted portable backup");
    let summary = target
        .import_owned_sites("user-b", &payload.sites)
        .await
        .expect("merge sites");
    assert_eq!(summary.imported_site_count, 1);
    assert_eq!(summary.reused_site_count, 1);
    let sites = target
        .list_owned_sites("user-b")
        .await
        .expect("target sites");
    assert_eq!(sites.len(), 2);
    assert_eq!(
        sites
            .iter()
            .find(|site| site.site_id == "site-a")
            .expect("site-a")
            .display_name,
        "Source A"
    );
}

#[tokio::test]
async fn failed_migration_rolls_back_without_advancing_schema() {
    let data = TempDir::new().expect("data tempdir");
    FleetStore::initialize(data.path(), INSTALLATION_ID)
        .await
        .expect("initialize")
        .close()
        .await;

    let migration_dir = TempDir::new().expect("migration tempdir");
    fs::write(
        migration_dir.path().join("0003_broken.sql"),
        "CREATE TABLE migration_probe (id INTEGER PRIMARY KEY) STRICT;\n\
         INSERT INTO table_that_does_not_exist (id) VALUES (1);\n",
    )
    .expect("broken migration");
    let mut migrator = Migrator::new(migration_dir.path())
        .await
        .expect("load migration");
    migrator.set_ignore_missing(true);
    let mut connection = connect(data.path()).await;
    assert!(migrator.run(&mut connection).await.is_err());
    let table: Option<String> = sqlx::query_scalar(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='migration_probe'",
    )
    .fetch_optional(&mut connection)
    .await
    .expect("probe table lookup");
    assert!(table.is_none(), "failed migration must roll back its DDL");
    connection
        .close()
        .await
        .expect("close migration connection");

    let store = FleetStore::open_existing(data.path())
        .await
        .expect("schema remains openable");
    assert_eq!(store.identity().schema_version, EXPECTED_SCHEMA_VERSION);
}

#[tokio::test]
async fn disk_full_write_rolls_back_and_database_reopens() {
    let data = TempDir::new().expect("data tempdir");
    FleetStore::initialize(data.path(), INSTALLATION_ID)
        .await
        .expect("initialize")
        .close()
        .await;
    let mut connection = connect(data.path()).await;
    connection
        .execute("PRAGMA wal_checkpoint(TRUNCATE)")
        .await
        .unwrap();
    let page_count: i64 = sqlx::query_scalar("PRAGMA page_count")
        .fetch_one(&mut connection)
        .await
        .unwrap();
    connection
        .execute(format!("PRAGMA max_page_count = {page_count}").as_str())
        .await
        .unwrap();
    let mut transaction = connection.begin().await.unwrap();
    let huge_json = format!("{{\"payload\":\"{}\"}}", "x".repeat(8 * 1024 * 1024));
    let error = sqlx::query(
        "INSERT INTO audit_log (action, outcome, details_json) VALUES ('disk_full', 'failed', ?)",
    )
    .bind(huge_json)
    .execute(&mut *transaction)
    .await
    .expect_err("max_page_count must simulate SQLITE_FULL");
    assert!(
        error.to_string().to_ascii_lowercase().contains("full")
            || error
                .as_database_error()
                .and_then(|value| value.code())
                .as_deref()
                == Some("13")
    );
    // SQLITE_FULL can abort the transaction itself. Either state is acceptable
    // as long as no partial row survives and the database reopens.
    let _ = transaction.rollback().await;
    connection.close().await.expect("close full connection");

    let store = FleetStore::open_existing(data.path())
        .await
        .expect("reopen after full");
    store.full_integrity_check().await.expect("integrity");
    assert_eq!(store.readback().await.unwrap().audit_entries, 0);
}

#[tokio::test]
async fn corrupted_page_fails_closed_without_replacing_database() {
    let data = TempDir::new().expect("data tempdir");
    let store = FleetStore::initialize(data.path(), INSTALLATION_ID)
        .await
        .expect("initialize");
    for index in 0..500 {
        store
            .append_audit(
                Some(&format!("request-{index}")),
                None,
                None,
                "corruption_probe",
                "success",
                &serde_json::json!({"payload": "x".repeat(256)}),
            )
            .await
            .expect("audit row");
    }
    store.close().await;

    let database = data.path().join(DATABASE_FILENAME);
    let mut checkpoint = connect(data.path()).await;
    checkpoint
        .execute("PRAGMA wal_checkpoint(TRUNCATE)")
        .await
        .expect("checkpoint before corruption");
    checkpoint
        .close()
        .await
        .expect("close checkpoint connection");
    #[cfg(unix)]
    let inode_before = {
        use std::os::unix::fs::MetadataExt;
        fs::metadata(&database).unwrap().ino()
    };
    let mut file = OpenOptions::new()
        .read(true)
        .write(true)
        .open(&database)
        .expect("open database for corruption test");
    file.seek(SeekFrom::Start(4096)).expect("seek page two");
    let mut bytes = [0_u8; 64];
    file.read_exact(&mut bytes).expect("read page bytes");
    for byte in &mut bytes {
        *byte ^= 0xff;
    }
    file.seek(SeekFrom::Start(4096)).expect("seek page two");
    file.write_all(&bytes).expect("corrupt page");
    file.sync_all().expect("sync corruption");

    let error = FleetStore::open_existing(data.path()).await.unwrap_err();
    assert!(matches!(
        error,
        StoreError::Integrity(_) | StoreError::Sqlx(_)
    ));
    assert!(database.is_file(), "corrupt database must not be replaced");
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt;
        assert_eq!(fs::metadata(database).unwrap().ino(), inode_before);
    }
}

#[tokio::test]
async fn uncommitted_transaction_is_rolled_back_after_process_kill() {
    let data = TempDir::new().expect("data tempdir");
    FleetStore::initialize(data.path(), INSTALLATION_ID)
        .await
        .expect("initialize")
        .close()
        .await;
    let marker = data.path().join("worker-ready");
    let mut child = Command::new(std::env::current_exe().expect("test executable"))
        .arg("--exact")
        .arg("crash_worker")
        .arg("--nocapture")
        .env("G5_FLEET_CRASH_DB", data.path())
        .env("G5_FLEET_CRASH_MARKER", &marker)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .expect("spawn crash worker");
    for _ in 0..200 {
        if marker.is_file() {
            break;
        }
        tokio::time::sleep(Duration::from_millis(10)).await;
    }
    assert!(marker.is_file(), "crash worker did not enter transaction");
    child.kill().expect("kill crash worker");
    child.wait().expect("reap crash worker");

    let store = FleetStore::open_existing(data.path())
        .await
        .expect("reopen after kill");
    store.full_integrity_check().await.expect("integrity");
    assert_eq!(store.readback().await.unwrap().audit_entries, 0);
}

#[tokio::test]
async fn crash_worker() {
    let Some(data) = std::env::var_os("G5_FLEET_CRASH_DB").map(PathBuf::from) else {
        return;
    };
    let marker = PathBuf::from(std::env::var_os("G5_FLEET_CRASH_MARKER").unwrap());
    let mut connection = connect(&data).await;
    let mut transaction = connection.begin().await.expect("worker transaction");
    sqlx::query(
        "INSERT INTO audit_log (action, outcome, details_json) \
         VALUES ('crash_probe', 'success', '{}')",
    )
    .execute(&mut *transaction)
    .await
    .expect("worker insert");
    fs::write(marker, b"ready").expect("worker marker");
    tokio::time::sleep(Duration::from_secs(60)).await;
    transaction.commit().await.expect("worker commit");
}

async fn connect(data_dir: &Path) -> SqliteConnection {
    SqliteConnection::connect_with(
        &SqliteConnectOptions::new()
            .filename(data_dir.join(DATABASE_FILENAME))
            .create_if_missing(false)
            .foreign_keys(true),
    )
    .await
    .expect("SQLite connection")
}
