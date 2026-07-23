use super::support::{
    cleanup_file, clear_keyring_secret, env_test_guard, load_keyring_secret,
    load_or_create_keychain_master_key, load_or_create_master_key, open_connection,
    save_keyring_secret, table_exists, unique_temp_file, DatabaseConfig, EnvGuard,
    DB_KEYRING_ACCOUNT, DB_MASTER_KEY_ENV_KEY, DB_MASTER_PATH_ENV_KEY,
};
use crate::runtime_config::DatabaseMasterStorageMode;
use std::sync::{Arc, Mutex};

#[test]
fn open_connection_creates_fresh_database_before_key_exists_in_secure_storage() {
    let _guard = env_test_guard();
    let master_key_path = unique_temp_file("fresh-db-master-key");
    let master_key_path_str = master_key_path.display().to_string();
    let _path_guard = EnvGuard::set(DB_MASTER_PATH_ENV_KEY, Some(&master_key_path_str));
    let _key_guard = EnvGuard::set(DB_MASTER_KEY_ENV_KEY, None);
    clear_keyring_secret(DB_KEYRING_ACCOUNT).expect("test keyring should clear");
    let db_path = unique_temp_file("fresh-db-open");
    let config = DatabaseConfig {
        path: db_path.clone(),
        allow_duplicate_sites: false,
        master_key_storage: DatabaseMasterStorageMode::Keychain,
        master_key_cache: Arc::new(Mutex::new(None)),
    };

    let connection = open_connection(&config).expect("fresh database should open");
    let has_sites_table = table_exists(&connection, "sites").expect("sites table should resolve");
    let stored_key =
        load_keyring_secret(DB_KEYRING_ACCOUNT).expect("generated key should be readable");

    assert!(has_sites_table);
    assert!(stored_key.is_some());

    cleanup_file(&db_path);
    cleanup_file(&master_key_path);
}

#[test]
fn legacy_master_key_file_migrates_to_keyring_and_is_removed() {
    let _guard = env_test_guard();
    let temp_path = unique_temp_file("db-master-key");
    let temp_path_str = temp_path.display().to_string();
    let _key_guard = EnvGuard::set(DB_MASTER_KEY_ENV_KEY, None);
    let _path_guard = EnvGuard::set(DB_MASTER_PATH_ENV_KEY, Some(&temp_path_str));
    clear_keyring_secret(DB_KEYRING_ACCOUNT).expect("test keyring should clear");
    std::fs::write(&temp_path, "legacy-master-key").expect("legacy master key file should exist");

    let first = load_or_create_keychain_master_key(true).expect("legacy master key should migrate");
    let second =
        load_or_create_keychain_master_key(true).expect("keyring master key should be reused");

    assert_eq!(first, "legacy-master-key");
    assert_eq!(first, second);
    assert!(!temp_path.exists());
    assert_eq!(
        load_keyring_secret(DB_KEYRING_ACCOUNT).expect("test keyring should load"),
        Some("legacy-master-key".to_string())
    );

    cleanup_file(&temp_path);
}

#[test]
fn env_master_key_overrides_storage_backend() {
    let _guard = env_test_guard();
    let temp_path = unique_temp_file("db-master-key-env");
    let temp_path_str = temp_path.display().to_string();
    let _key_guard = EnvGuard::set(DB_MASTER_KEY_ENV_KEY, Some("explicit-master-key"));
    let _path_guard = EnvGuard::set(DB_MASTER_PATH_ENV_KEY, Some(&temp_path_str));
    clear_keyring_secret(DB_KEYRING_ACCOUNT).expect("test keyring should clear");

    let value = load_or_create_master_key().expect("env master key should win");

    assert_eq!(value, "explicit-master-key");
    assert!(!temp_path.exists());
}

#[test]
fn file_master_key_storage_creates_local_key_file_without_keychain() {
    let _guard = env_test_guard();
    let db_path = unique_temp_file("file-db-open");
    let master_key_path = unique_temp_file("file-db-master-key");
    let master_key_path_str = master_key_path.display().to_string();
    let _path_guard = EnvGuard::set(DB_MASTER_PATH_ENV_KEY, Some(&master_key_path_str));
    let _key_guard = EnvGuard::set(DB_MASTER_KEY_ENV_KEY, None);
    clear_keyring_secret(DB_KEYRING_ACCOUNT).expect("test keyring should clear");
    let config = DatabaseConfig {
        path: db_path.clone(),
        allow_duplicate_sites: false,
        master_key_storage: DatabaseMasterStorageMode::File,
        master_key_cache: Arc::new(Mutex::new(None)),
    };

    let connection = open_connection(&config).expect("fresh database should open");
    let has_sites_table = table_exists(&connection, "sites").expect("sites table should resolve");

    assert!(has_sites_table);
    assert!(master_key_path.exists());
    assert_eq!(
        load_keyring_secret(DB_KEYRING_ACCOUNT).expect("test keyring should load"),
        None
    );

    cleanup_file(&db_path);
    cleanup_file(&master_key_path);
}

#[test]
fn file_master_key_storage_ignores_existing_keychain_secret() {
    let _guard = env_test_guard();
    let db_path = unique_temp_file("file-db-migrate");
    let master_key_path = unique_temp_file("file-db-master-key-migrate");
    let master_key_path_str = master_key_path.display().to_string();
    let _path_guard = EnvGuard::set(DB_MASTER_PATH_ENV_KEY, Some(&master_key_path_str));
    let _key_guard = EnvGuard::set(DB_MASTER_KEY_ENV_KEY, None);
    clear_keyring_secret(DB_KEYRING_ACCOUNT).expect("test keyring should clear");
    save_keyring_secret(DB_KEYRING_ACCOUNT, "migrated-file-master-key")
        .expect("test keyring should store seed key");
    let config = DatabaseConfig {
        path: db_path.clone(),
        allow_duplicate_sites: false,
        master_key_storage: DatabaseMasterStorageMode::File,
        master_key_cache: Arc::new(Mutex::new(None)),
    };

    let connection = open_connection(&config).expect("database should open with local file key");
    let has_sites_table = table_exists(&connection, "sites").expect("sites table should resolve");
    let stored_file_key =
        std::fs::read_to_string(&master_key_path).expect("file-backed master key should exist");

    assert!(has_sites_table);
    assert_ne!(stored_file_key.trim(), "migrated-file-master-key");
    assert_eq!(
        load_keyring_secret(DB_KEYRING_ACCOUNT).expect("test keyring should load"),
        Some("migrated-file-master-key".to_string())
    );
    cleanup_file(&db_path);
    cleanup_file(&master_key_path);
}

#[test]
fn keychain_storage_preserves_existing_database_when_master_key_is_missing() {
    let _guard = env_test_guard();
    let db_path = unique_temp_file("keychain-db-orphan");
    let master_key_path = unique_temp_file("keychain-db-master-key-orphan");
    let master_key_path_str = master_key_path.display().to_string();
    let _path_guard = EnvGuard::set(DB_MASTER_PATH_ENV_KEY, Some(&master_key_path_str));
    let _key_guard = EnvGuard::set(DB_MASTER_KEY_ENV_KEY, None);
    clear_keyring_secret(DB_KEYRING_ACCOUNT).expect("test keyring should clear");
    std::fs::write(&db_path, "stale-db").expect("stale database should exist");
    let config = DatabaseConfig {
        path: db_path.clone(),
        allow_duplicate_sites: false,
        master_key_storage: DatabaseMasterStorageMode::Keychain,
        master_key_cache: Arc::new(Mutex::new(None)),
    };

    let error = open_connection(&config)
        .expect_err("missing keychain key must fail closed without replacing the database");
    let stored_key = load_keyring_secret(DB_KEYRING_ACCOUNT).expect("test keyring should load");

    assert!(error
        .to_string()
        .contains("database preserved for recovery"));
    assert_eq!(std::fs::read_to_string(&db_path).unwrap(), "stale-db");
    assert!(db_path.exists());
    assert!(stored_key.is_none());
    assert_no_orphaned_database(&db_path);

    cleanup_file(&db_path);
    cleanup_file(&master_key_path);
}

#[test]
fn file_storage_preserves_existing_database_when_master_key_is_missing() {
    let _guard = env_test_guard();
    let db_path = unique_temp_file("file-db-orphan");
    let master_key_path = unique_temp_file("file-db-master-key-orphan");
    let master_key_path_str = master_key_path.display().to_string();
    let _path_guard = EnvGuard::set(DB_MASTER_PATH_ENV_KEY, Some(&master_key_path_str));
    let _key_guard = EnvGuard::set(DB_MASTER_KEY_ENV_KEY, None);
    clear_keyring_secret(DB_KEYRING_ACCOUNT).expect("test keyring should clear");
    std::fs::write(&db_path, "stale-db").expect("stale database should exist");
    let config = DatabaseConfig {
        path: db_path.clone(),
        allow_duplicate_sites: false,
        master_key_storage: DatabaseMasterStorageMode::File,
        master_key_cache: Arc::new(Mutex::new(None)),
    };

    let error = open_connection(&config)
        .expect_err("missing file key must fail closed without replacing the database");

    assert!(error
        .to_string()
        .contains("database preserved for recovery"));
    assert_eq!(std::fs::read_to_string(&db_path).unwrap(), "stale-db");
    assert!(db_path.exists());
    assert!(!master_key_path.exists());
    assert_no_orphaned_database(&db_path);

    cleanup_file(&db_path);
    cleanup_file(&master_key_path);
}

fn assert_no_orphaned_database(db_path: &std::path::Path) {
    let prefix = format!("{}{}", db_path.display(), ".orphaned-");
    let parent = db_path
        .parent()
        .expect("database path should have a parent");
    let found = std::fs::read_dir(parent)
        .expect("database directory should be readable")
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .any(|path| path.to_string_lossy().starts_with(&prefix));

    assert!(
        !found,
        "missing master key must not orphan the existing database"
    );
}
