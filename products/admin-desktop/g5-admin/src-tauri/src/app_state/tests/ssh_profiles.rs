use super::support::{
    build_state, cleanup_temp_dir, file_runtime_config, prepare_temp_dir, test_database_config,
};
use crate::core::store_records::model_site_from_record;
use crate::db::{SiteInsert, SiteRepository};
use crate::site_manager::site_manager_from_model_sites;
use g5_admin_models::models::ssh::{
    SshAuthType, SshProfileAddInput, SshProfileDeleteInput, SshProfileUpdateInput,
};

#[tokio::test]
async fn ssh_profile_crud_records_activity_and_keeps_site_scope() {
    let (temp_dir, _session_guard) = prepare_temp_dir("ssh-profile-crud");
    let site_repository = SiteRepository::new(test_database_config(temp_dir.join("g5-admin.db")));
    let site = site_repository
        .insert_site(SiteInsert {
            name: "운영 사이트".to_string(),
            api_base_url: "https://example.test/api/v1".to_string(),
            is_default: true,
        })
        .expect("site should insert");
    site_repository
        .create_app_lock("local-secret")
        .expect("app lock should be created");
    let site_manager = site_manager_from_model_sites(
        vec![model_site_from_record(site.clone())],
        Some(site.id.clone()),
    )
    .expect("site manager");
    let state = build_state(
        file_runtime_config(None),
        site_repository,
        site_manager,
        true,
    );

    state
        .add_ssh_profile(SshProfileAddInput {
            site_id: site.id.clone(),
            name: "운영 SSH".to_string(),
            host: "ssh.example.test".to_string(),
            port: 22,
            username: "deploy".to_string(),
            auth_type: SshAuthType::Key,
            key_path: Some("~/.ssh/id_ed25519".to_string()),
            password: None,
            key_passphrase: Some("passphrase".to_string()),
        })
        .await
        .expect("SSH profile should insert");

    let list = state
        .ssh_profile_list("test-request", &site.id)
        .await
        .expect("SSH profile list should load");
    assert_eq!(list.profiles.len(), 1);
    assert_eq!(list.profiles[0].name, "운영 SSH");
    assert!(list.profiles[0].has_key_passphrase);
    assert!(!list.profiles[0].has_password);

    state
        .update_ssh_profile(SshProfileUpdateInput {
            site_id: site.id.clone(),
            ssh_profile_id: list.profiles[0].id.clone(),
            name: "운영 SSH 변경".to_string(),
            host: "ssh2.example.test".to_string(),
            port: 2222,
            username: "root".to_string(),
            auth_type: SshAuthType::Password,
            key_path: None,
            password: Some("new-password".to_string()),
            key_passphrase: None,
            clear_password: false,
            clear_key_passphrase: true,
        })
        .await
        .expect("SSH profile should update");

    let updated = state
        .ssh_profile_list("test-request", &site.id)
        .await
        .expect("updated SSH profile list should load");
    assert_eq!(updated.profiles[0].host, "ssh2.example.test");
    assert_eq!(updated.profiles[0].port, 2222);
    assert_eq!(updated.profiles[0].username, "root");
    assert!(updated.profiles[0].has_password);
    assert!(!updated.profiles[0].has_key_passphrase);

    state
        .delete_ssh_profile(SshProfileDeleteInput {
            site_id: site.id.clone(),
            ssh_profile_id: updated.profiles[0].id.clone(),
        })
        .await
        .expect("SSH profile should delete");

    let deleted = state
        .ssh_profile_list("test-request", &site.id)
        .await
        .expect("deleted SSH profile list should load");
    assert!(deleted.profiles.is_empty());

    let activities = state
        .activity_list("test-request", Some(site.id.clone()), 20)
        .await
        .expect("activity list should load");
    assert!(activities
        .activities
        .iter()
        .any(|item| item.action == "site.ssh_profile.add"));
    assert!(activities
        .activities
        .iter()
        .any(|item| item.action == "site.ssh_profile.update"));
    assert!(activities
        .activities
        .iter()
        .any(|item| item.action == "site.ssh_profile.delete"));

    cleanup_temp_dir(&temp_dir);
}
