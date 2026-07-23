use super::support::{cleanup_file, create_repository, open_connection, SiteInsert};
use crate::{SshAuthType, SshProfileInsert, SshProfileUpdateRecord};

#[test]
fn ssh_profile_insert_update_delete_and_site_delete_keep_secrets_inside_database() {
    let (repository, db_path) = create_repository("ssh-profiles");
    let site = repository
        .insert_site(SiteInsert {
            name: "운영".to_string(),
            api_base_url: "https://alpha.example.com/api/v1".to_string(),
            is_default: true,
        })
        .expect("site should insert");

    let created = repository
        .insert_ssh_profile(SshProfileInsert {
            site_id: site.id.clone(),
            name: "운영 SSH".to_string(),
            host: "ssh.alpha.example.com".to_string(),
            port: 22,
            username: "deploy".to_string(),
            auth_type: SshAuthType::Key,
            key_path: Some("~/.ssh/id_ed25519".to_string()),
            password: None,
            key_passphrase: Some("passphrase".to_string()),
        })
        .expect("SSH profile should insert");

    assert!(created.has_key_passphrase);
    assert!(!created.has_password);

    let updated = repository
        .update_ssh_profile(SshProfileUpdateRecord {
            site_id: site.id.clone(),
            ssh_profile_id: created.id.clone(),
            name: "운영 SSH 변경".to_string(),
            host: "ssh2.alpha.example.com".to_string(),
            port: 2222,
            username: "root".to_string(),
            auth_type: SshAuthType::Password,
            key_path: None,
            password: Some("new-password".to_string()),
            key_passphrase: None,
            clear_password: false,
            clear_key_passphrase: true,
        })
        .expect("SSH profile should update");

    assert!(updated.has_password);
    assert!(!updated.has_key_passphrase);

    let connection = open_connection(repository.config()).expect("connection should open");
    let stored_password: Option<String> = connection
        .query_row(
            "SELECT value FROM app_settings WHERE key = ?1",
            [format!("ssh.secret.password.{}", created.id)],
            |row| row.get(0),
        )
        .ok();
    let stored_key_passphrase: Option<String> = connection
        .query_row(
            "SELECT value FROM app_settings WHERE key = ?1",
            [format!("ssh.secret.key_passphrase.{}", created.id)],
            |row| row.get(0),
        )
        .ok();
    assert_eq!(stored_password.as_deref(), Some("new-password"));
    assert!(stored_key_passphrase.is_none());

    repository
        .delete_site(&site.id)
        .expect("site delete should clear SSH profiles");

    let count: i64 = connection
        .query_row("SELECT COUNT(*) FROM ssh_profiles", [], |row| row.get(0))
        .expect("SSH profile count should load");
    assert_eq!(count, 0);
    let remaining_secret_count: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM app_settings WHERE key LIKE 'ssh.secret.%'",
            [],
            |row| row.get(0),
        )
        .expect("SSH secret count should load");
    assert_eq!(remaining_secret_count, 0);

    cleanup_file(&db_path);
}
