use super::support::{
    build_state, build_state_with_api_client, cleanup_temp_dir, file_runtime_config,
    file_runtime_config_with_dev_bootstrap, file_runtime_config_with_dev_bootstrap_and_site_auth,
    prepare_temp_dir, test_database_config,
};
use crate::api_client::ApiClient;
use crate::db::SiteRepository;
use crate::site_manager::SiteManager;
use g5_admin_models::models::site::SiteSessionStatus;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

async fn spawn_dev_bootstrap_auth_server() -> String {
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("listener should bind");
    let address = listener.local_addr().expect("address should resolve");

    tokio::spawn(async move {
        for _ in 0..2 {
            let (mut socket, _) = listener.accept().await.expect("connection should arrive");
            let mut buffer = vec![0_u8; 8192];
            let read = socket.read(&mut buffer).await.expect("request should read");
            let request = String::from_utf8_lossy(&buffer[..read]);
            let first_line = request.lines().next().unwrap_or_default();
            let response_body = if first_line.starts_with("POST /api/v1/auth/login ") {
                r#"{"data":{"access_token":"access-dev-token","refresh_token":"refresh-dev-token","expires_in":3600},"meta":{"request_id":"api-auth-login","correlation_id":"api-auth-login","server_request_id":"srv-auth-login"}}"#
            } else if first_line.starts_with("GET /api/v1/members/me ") {
                r#"{"data":{"mb_id":"dev_admin","mb_name":"개발 관리자","mb_nick":"개발관리자","mb_email":"dev@example.com","mb_level":10,"mb_point":0},"meta":{"request_id":"api-members-me","correlation_id":"api-members-me","server_request_id":"srv-members-me"}}"#
            } else {
                r#"{"error":"unexpected request"}"#
            };
            let status_line = if first_line.starts_with("POST /api/v1/auth/login ")
                || first_line.starts_with("GET /api/v1/members/me ")
            {
                "HTTP/1.1 200 OK"
            } else {
                "HTTP/1.1 404 Not Found"
            };
            let response = format!(
                "{status_line}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                response_body.len(),
                response_body
            );
            socket
                .write_all(response.as_bytes())
                .await
                .expect("response should write");
        }
    });

    format!("http://{address}/api/v1")
}

#[tokio::test]
async fn dev_bootstrap_creates_master_lock_site_and_ssh_profile() {
    let (temp_dir, _session_guard) = prepare_temp_dir("dev-bootstrap-apply");
    let site_repository = SiteRepository::new(test_database_config(temp_dir.join("g5-admin.db")));
    let site_manager = SiteManager::new(vec![], None).expect("site manager");
    let state = build_state(
        file_runtime_config_with_dev_bootstrap(),
        site_repository,
        site_manager,
        false,
    );

    let status = state
        .dev_bootstrap_service()
        .status("req-bootstrap-status")
        .await
        .expect("status should load");
    assert!(status.available);
    assert!(status.has_master_password);
    assert_eq!(status.site_name.as_deref(), Some("개발 사이트"));
    assert!(!status.has_site_auth);
    assert_eq!(status.ssh_profile_count, 1);

    let result = state
        .dev_bootstrap_service()
        .apply("req-bootstrap-apply")
        .await
        .expect("bootstrap should apply");
    assert!(result.master_lock_configured);
    assert!(result.master_lock_unlocked);
    assert_eq!(result.site_name.as_deref(), Some("개발 사이트"));
    assert_eq!(result.created_ssh_profile_count, 1);
    assert_eq!(result.updated_ssh_profile_count, 0);

    let master_status = state
        .master_lock_status("req-master")
        .await
        .expect("master status should load");
    assert!(master_status.is_configured);
    assert!(master_status.is_unlocked);

    let catalog = state
        .site_catalog("req-sites")
        .await
        .expect("site catalog should load");
    assert!(!catalog.needs_onboarding);
    assert_eq!(catalog.sites.len(), 1);
    let site_id = catalog
        .active_site_id
        .as_deref()
        .expect("active site should be selected");
    let ssh_profiles = state
        .ssh_profile_list("req-ssh-profiles", site_id)
        .await
        .expect("ssh profile list should load");
    assert_eq!(ssh_profiles.profiles.len(), 1);
    assert_eq!(ssh_profiles.profiles[0].host, "ssh.dev.example.com");
    assert_eq!(ssh_profiles.profiles[0].username, "deploy");

    cleanup_temp_dir(&temp_dir);
}

#[tokio::test]
async fn dev_bootstrap_reuses_existing_site_and_profile_without_duplicates() {
    let (temp_dir, _session_guard) = prepare_temp_dir("dev-bootstrap-idempotent");
    let site_repository = SiteRepository::new(test_database_config(temp_dir.join("g5-admin.db")));
    let site_manager = SiteManager::new(vec![], None).expect("site manager");
    let state = build_state(
        file_runtime_config_with_dev_bootstrap(),
        site_repository,
        site_manager,
        false,
    );

    state
        .dev_bootstrap_service()
        .apply("req-bootstrap-first")
        .await
        .expect("first bootstrap should apply");
    state
        .lock_master("req-lock")
        .await
        .expect("master lock should relock");

    let second = state
        .dev_bootstrap_service()
        .apply("req-bootstrap-second")
        .await
        .expect("second bootstrap should apply");
    assert!(second.master_lock_unlocked);
    assert_eq!(second.created_ssh_profile_count, 0);
    assert_eq!(second.updated_ssh_profile_count, 1);

    let catalog = state
        .site_catalog("req-sites")
        .await
        .expect("site catalog should load");
    assert_eq!(catalog.sites.len(), 1);
    let site_id = catalog
        .active_site_id
        .as_deref()
        .expect("active site should be selected");
    let ssh_profiles = state
        .ssh_profile_list("req-ssh-profiles", site_id)
        .await
        .expect("ssh profile list should load");
    assert_eq!(ssh_profiles.profiles.len(), 1);

    cleanup_temp_dir(&temp_dir);
}

#[tokio::test]
async fn dev_bootstrap_status_is_unavailable_without_config() {
    let (temp_dir, _session_guard) = prepare_temp_dir("dev-bootstrap-unavailable");
    let site_repository = SiteRepository::new(test_database_config(temp_dir.join("g5-admin.db")));
    let site_manager = SiteManager::new(vec![], None).expect("site manager");
    let state = build_state(
        file_runtime_config(None),
        site_repository,
        site_manager,
        false,
    );

    let status = state
        .dev_bootstrap_service()
        .status("req-bootstrap-status")
        .await
        .expect("status should load");
    assert!(!status.available);
    assert!(!status.has_master_password);
    assert!(!status.has_site);
    assert!(!status.has_site_auth);
    assert_eq!(status.ssh_profile_count, 0);

    cleanup_temp_dir(&temp_dir);
}

#[tokio::test]
async fn dev_bootstrap_logs_into_site_when_site_auth_is_configured() {
    let (temp_dir, _session_guard) = prepare_temp_dir("dev-bootstrap-site-auth");
    let api_base_url = spawn_dev_bootstrap_auth_server().await;
    let site_repository = SiteRepository::new(test_database_config(temp_dir.join("g5-admin.db")));
    let site_manager = SiteManager::new(vec![], None).expect("site manager");
    let state = build_state_with_api_client(
        file_runtime_config_with_dev_bootstrap_and_site_auth(&api_base_url),
        site_repository,
        site_manager,
        false,
        ApiClient::new(None::<String>).expect("api client"),
    );

    let result = state
        .dev_bootstrap_service()
        .apply("req-bootstrap-apply-site-auth")
        .await
        .expect("bootstrap should apply");
    assert!(result.site_login_authenticated);
    assert_eq!(result.site_login_mb_id.as_deref(), Some("dev_admin"));

    let stored_session = state
        .token_store
        .load_session()
        .await
        .expect("session should load")
        .expect("session should exist");
    assert_eq!(stored_session.mb_id, "dev_admin");
    assert_eq!(stored_session.access_token, "access-dev-token");

    let catalog = state
        .site_catalog("req-sites")
        .await
        .expect("site catalog should load");
    assert_eq!(catalog.sites.len(), 1);
    assert!(matches!(
        catalog.sites[0].status,
        SiteSessionStatus::Authenticated
    ));

    cleanup_temp_dir(&temp_dir);
}
