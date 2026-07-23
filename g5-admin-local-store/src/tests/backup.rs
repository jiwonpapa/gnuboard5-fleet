use super::support::{
    cleanup_file, create_repository, open_connection, unique_temp_file, SiteInsert,
};
use crate::error::AppError;
use crate::{SshAuthType, SshProfileInsert};
use rusqlite::params;

#[test]
fn backup_export_writes_portable_encrypted_backup() {
    let (repository, db_path) = create_repository("backup-export");
    repository
        .insert_site(SiteInsert {
            name: "운영".to_string(),
            api_base_url: "https://alpha.example.com/api/v1".to_string(),
            is_default: true,
        })
        .expect("site should insert");
    let backup_path = unique_temp_file("backup-export-copy");

    let (copied_bytes, site_count) = repository
        .export_backup(&backup_path, "portable-secret")
        .expect("backup export should succeed");
    let backup_body = std::fs::read_to_string(&backup_path).expect("portable backup should load");

    assert_eq!(site_count, 1);
    assert!(copied_bytes > 0);
    assert!(backup_path.exists());
    assert!(backup_body.contains("\"format\": \"g5-admin-portable-backup-v1\""));
    assert!(!backup_body.contains("https://alpha.example.com/api/v1"));

    cleanup_file(&db_path);
    cleanup_file(&backup_path);
}

#[test]
fn backup_export_requires_backup_password() {
    let (repository, db_path) = create_repository("backup-export-password");
    repository
        .insert_site(SiteInsert {
            name: "운영".to_string(),
            api_base_url: "https://alpha.example.com/api/v1".to_string(),
            is_default: true,
        })
        .expect("site should insert");
    let backup_path = unique_temp_file("backup-export-password-file");

    let error = repository
        .export_backup(&backup_path, "")
        .expect_err("backup export should require a dedicated backup password");
    assert!(matches!(error, AppError::Config { .. }));

    cleanup_file(&db_path);
    cleanup_file(&backup_path);
}

#[test]
fn backup_import_merges_sites_and_site_settings_from_portable_backup() {
    let (source_repository, source_db_path) = create_repository("backup-import-source");
    let source_alpha = source_repository
        .insert_site(SiteInsert {
            name: "Alpha".to_string(),
            api_base_url: "https://alpha.example.com/api/v1".to_string(),
            is_default: true,
        })
        .expect("alpha site should insert");
    let source_beta = source_repository
        .insert_site(SiteInsert {
            name: "Beta".to_string(),
            api_base_url: "https://beta.example.com/api/v1".to_string(),
            is_default: false,
        })
        .expect("beta site should insert");
    let source_connection =
        open_connection(source_repository.config()).expect("source connection should open");
    source_connection
        .execute(
            "INSERT INTO site_settings (site_id, key, value) VALUES (?1, ?2, ?3)",
            params![source_alpha.id, "theme", "light"],
        )
        .expect("alpha setting should insert");
    source_connection
        .execute(
            "INSERT INTO site_settings (site_id, key, value) VALUES (?1, ?2, ?3)",
            params![source_beta.id, "theme", "dark"],
        )
        .expect("beta setting should insert");
    let backup_path = unique_temp_file("backup-import-file");
    source_repository
        .export_backup(&backup_path, "portable-secret")
        .expect("backup export should succeed");
    source_repository
        .insert_ssh_profile(SshProfileInsert {
            site_id: source_beta.id.clone(),
            name: "Beta SSH".to_string(),
            host: "ssh.beta.example.com".to_string(),
            port: 22,
            username: "deploy".to_string(),
            auth_type: SshAuthType::Key,
            key_path: Some("~/.ssh/id_ed25519".to_string()),
            password: None,
            key_passphrase: Some("passphrase".to_string()),
        })
        .expect("SSH profile should insert");
    source_repository
        .export_backup(&backup_path, "portable-secret")
        .expect("backup export should succeed");

    let (target_repository, target_db_path) = create_repository("backup-import-target");
    let target_alpha = target_repository
        .insert_site(SiteInsert {
            name: "Alpha Existing".to_string(),
            api_base_url: "https://alpha.example.com/api/v1".to_string(),
            is_default: true,
        })
        .expect("existing alpha site should insert");

    let summary = target_repository
        .import_backup(&backup_path, "portable-secret")
        .expect("backup import should succeed");

    assert_eq!(summary.imported_site_count, 1);
    assert_eq!(summary.reused_site_count, 1);
    assert_eq!(summary.copied_setting_count, 2);

    let sites = target_repository.load_sites().expect("sites should load");
    assert_eq!(sites.len(), 2);
    assert!(sites
        .iter()
        .any(|site| site.api_base_url == "https://alpha.example.com/api/v1"));
    assert!(sites
        .iter()
        .any(|site| site.api_base_url == "https://beta.example.com/api/v1"));

    let target_connection =
        open_connection(target_repository.config()).expect("target connection should open");
    let alpha_theme: String = target_connection
        .query_row(
            "SELECT value FROM site_settings WHERE site_id = ?1 AND key = ?2",
            params![target_alpha.id, "theme"],
            |row| row.get(0),
        )
        .expect("existing alpha setting should be reused");
    assert_eq!(alpha_theme, "light");

    let beta_count: i64 = target_connection
        .query_row(
            "SELECT COUNT(*) FROM site_settings WHERE key = ?1 AND value = ?2",
            params!["theme", "dark"],
            |row| row.get(0),
        )
        .expect("beta setting count should load");
    assert_eq!(beta_count, 1);
    let imported_ssh_profile_count: i64 = target_connection
        .query_row("SELECT COUNT(*) FROM ssh_profiles", [], |row| row.get(0))
        .expect("SSH profile count should load");
    assert_eq!(imported_ssh_profile_count, 1);

    cleanup_file(&source_db_path);
    cleanup_file(&target_db_path);
    cleanup_file(&backup_path);
}

#[test]
fn backup_import_keeps_legacy_sqlcipher_snapshot_compatibility() {
    let (source_repository, source_db_path) = create_repository("backup-import-legacy-source");
    let source_site = source_repository
        .insert_site(SiteInsert {
            name: "Legacy".to_string(),
            api_base_url: "https://legacy.example.com/api/v1".to_string(),
            is_default: true,
        })
        .expect("legacy site should insert");
    let source_connection =
        open_connection(source_repository.config()).expect("source connection should open");
    source_connection
        .execute(
            "INSERT INTO site_settings (site_id, key, value) VALUES (?1, ?2, ?3)",
            params![source_site.id, "theme", "dark"],
        )
        .expect("legacy setting should insert");
    let backup_path = unique_temp_file("backup-import-legacy-file");
    std::fs::copy(&source_db_path, &backup_path).expect("legacy db snapshot should copy");

    let (target_repository, target_db_path) = create_repository("backup-import-legacy-target");
    let summary = target_repository
        .import_backup(&backup_path, "")
        .expect("legacy backup import should succeed");

    assert_eq!(summary.imported_site_count, 1);
    assert_eq!(summary.reused_site_count, 0);

    let sites = target_repository.load_sites().expect("sites should load");
    assert_eq!(sites.len(), 1);
    assert_eq!(sites[0].api_base_url, "https://legacy.example.com/api/v1");

    cleanup_file(&source_db_path);
    cleanup_file(&target_db_path);
    cleanup_file(&backup_path);
}

#[test]
fn backup_import_rejects_wrong_portable_backup_password() {
    let (source_repository, source_db_path) = create_repository("backup-import-wrong-password");
    source_repository
        .insert_site(SiteInsert {
            name: "WrongPassword".to_string(),
            api_base_url: "https://wrong-password.example.com/api/v1".to_string(),
            is_default: true,
        })
        .expect("site should insert");
    let backup_path = unique_temp_file("backup-import-wrong-password-file");
    source_repository
        .export_backup(&backup_path, "correct-password")
        .expect("backup export should succeed");

    let (target_repository, target_db_path) = create_repository("backup-import-wrong-target");
    let error = target_repository
        .import_backup(&backup_path, "wrong-password")
        .expect_err("portable backup import should reject the wrong backup password");
    assert!(matches!(error, AppError::Auth { .. }));

    cleanup_file(&source_db_path);
    cleanup_file(&target_db_path);
    cleanup_file(&backup_path);
}
