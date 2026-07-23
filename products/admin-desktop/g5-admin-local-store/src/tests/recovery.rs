use super::support::{cleanup_file, env_test_guard, open_connection, table_exists, DatabaseConfig};
use crate::runtime_config::DatabaseMasterStorageMode;
use std::sync::{Arc, Mutex};

#[test]
fn file_storage_recovers_latest_matching_orphaned_database() {
    let _guard = env_test_guard();
    let db_path = super::support::unique_temp_file("file-db-recovery");
    let orphaned_path = db_path.with_file_name(format!(
        "{}.orphaned-999",
        db_path
            .file_name()
            .and_then(|value| value.to_str())
            .expect("db file name should be valid unicode")
    ));

    let wrong_config = DatabaseConfig {
        path: db_path.clone(),
        allow_duplicate_sites: false,
        master_key_storage: DatabaseMasterStorageMode::File,
        master_key_cache: Arc::new(Mutex::new(Some("wrong-master-key".to_string()))),
    };
    let valid_orphan_config = DatabaseConfig {
        path: orphaned_path.clone(),
        allow_duplicate_sites: false,
        master_key_storage: DatabaseMasterStorageMode::File,
        master_key_cache: Arc::new(Mutex::new(Some("correct-master-key".to_string()))),
    };

    let wrong_connection =
        open_connection(&wrong_config).expect("wrong-key active database should create");
    drop(wrong_connection);

    let orphan_connection =
        open_connection(&valid_orphan_config).expect("valid orphaned database should create");
    orphan_connection
        .execute(
            "INSERT INTO app_settings (key, value) VALUES (?1, ?2)",
            ["site.recovery", "alive"],
        )
        .expect("orphaned database should accept seed row");
    drop(orphan_connection);

    let recovery_config = DatabaseConfig {
        path: db_path.clone(),
        allow_duplicate_sites: false,
        master_key_storage: DatabaseMasterStorageMode::File,
        master_key_cache: Arc::new(Mutex::new(Some("correct-master-key".to_string()))),
    };

    let recovered =
        open_connection(&recovery_config).expect("matching orphaned database should recover");
    let has_sites_table = table_exists(&recovered, "sites").expect("sites table should resolve");
    let recovered_value: String = recovered
        .query_row(
            "SELECT value FROM app_settings WHERE key = ?1",
            ["site.recovery"],
            |row| row.get(0),
        )
        .expect("seed row should survive recovery");

    assert!(has_sites_table);
    assert_eq!(recovered_value, "alive");
    assert!(db_path.exists());
    assert!(!orphaned_path.exists());

    cleanup_file(&db_path);
}
