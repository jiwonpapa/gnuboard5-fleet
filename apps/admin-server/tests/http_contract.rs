use std::{
    fs,
    sync::{Arc, Mutex},
};

use async_trait::async_trait;
use axum::{
    body::Body,
    http::{Method, Request, StatusCode},
};
use g5_fleet_admin_server::{AppConfig, ErrorEnvelope, HealthResponse, MetaResponse, build_router};
use g5_fleet_connector::{
    BasicConfig, ConnectorCredentials, ConnectorGateway, ConnectorHealth, ConnectorLogin,
    ConnectorResult, CoreExecuteRequest, CoreExecuteResponse,
};
use g5_fleet_remote::{SshProfileSummary, TerminalTicket};
use http_body_util::BodyExt;
use serde_json::Value;
use tempfile::TempDir;
use tower::ServiceExt;

async fn fixture() -> (TempDir, TempDir, axum::Router) {
    let web = TempDir::new().expect("web tempdir");
    let data = TempDir::new().expect("data tempdir");
    fs::write(
        web.path().join("index.html"),
        "<!doctype html><title>G5 Fleet</title><div id=\"root\"></div>",
    )
    .expect("fixture index");
    let app = build_router(AppConfig {
        web_root: web.path().to_path_buf(),
        auth: g5_fleet_security::AuthService::new(
            g5_fleet_store::FleetStore::initialize(data.path(), "test-installation")
                .await
                .expect("test store"),
            &[3_u8; 32],
        )
        .expect("test auth"),
        connector: Arc::new(g5_fleet_connector::ProductionConnectorGateway),
        notification_worker: None,
    });
    (web, data, app)
}

async fn json<T: serde::de::DeserializeOwned>(response: axum::response::Response) -> T {
    let bytes = response
        .into_body()
        .collect()
        .await
        .expect("response body")
        .to_bytes();
    serde_json::from_slice(&bytes).expect("valid JSON")
}

async fn complete_install(
    app: &axum::Router,
    login_name: &str,
    password: &str,
) -> (String, Vec<String>) {
    let challenge = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/install/challenge",
            None,
            None,
            Some(serde_json::json!({"login_name": login_name})),
        ))
        .await
        .expect("install challenge");
    assert_eq!(challenge.status(), StatusCode::CREATED);
    let challenge: g5_fleet_admin_server::InstallChallengeResponse = json(challenge).await;
    let code = g5_fleet_security::generate_current_totp_code(
        &challenge.manual_entry_key,
        "G5 Fleet",
        login_name,
    )
    .expect("current TOTP");
    let complete = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/install/complete",
            None,
            None,
            Some(serde_json::json!({
                "setup_token": challenge.setup_token,
                "login_name": login_name,
                "password": password,
                "totp_code": code
            })),
        ))
        .await
        .expect("install complete");
    assert_eq!(complete.status(), StatusCode::CREATED);
    let complete: g5_fleet_admin_server::InstallCompleteResponse = json(complete).await;
    (challenge.manual_entry_key, complete.recovery_codes)
}

#[tokio::test]
async fn health_readiness_and_meta_contract_are_live() {
    let (_web, _data, app) = fixture().await;

    let health = app
        .clone()
        .oneshot(Request::get("/healthz").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(health.status(), StatusCode::OK);
    let health: HealthResponse = json(health).await;
    assert_eq!(health.status, "ok");
    assert_eq!(health.service, "g5-fleet-admin-server");

    let ready = app
        .clone()
        .oneshot(Request::get("/readyz").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(ready.status(), StatusCode::OK);

    let meta = app
        .oneshot(Request::get("/api/v1/meta").body(Body::empty()).unwrap())
        .await
        .unwrap();
    let meta: MetaResponse = json(meta).await;
    assert_eq!(meta.api_version, "v1");
    assert_eq!(meta.product_name, "G5 Fleet");
    assert_eq!(meta.database_schema_version, 3);
    assert!(!meta.build_revision.is_empty());
    assert!(!meta.image_version.is_empty());
}

#[tokio::test]
async fn spa_fallback_and_api_error_envelope_do_not_overlap() {
    let (_web, _data, app) = fixture().await;
    let spa = app
        .clone()
        .oneshot(Request::get("/sites/example").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(spa.status(), StatusCode::OK);
    let spa_body = spa.into_body().collect().await.unwrap().to_bytes();
    assert!(String::from_utf8_lossy(&spa_body).contains("G5 Fleet"));

    let missing = app
        .oneshot(Request::get("/api/v1/missing").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(missing.status(), StatusCode::NOT_FOUND);
    let error: ErrorEnvelope = json(missing).await;
    assert_eq!(error.error.code, "route_not_found");
}

#[tokio::test]
async fn readiness_fails_closed_without_web_build() {
    let web = TempDir::new().expect("web tempdir");
    let data = TempDir::new().expect("data tempdir");
    let app = build_router(AppConfig {
        web_root: web.path().to_path_buf(),
        auth: g5_fleet_security::AuthService::new(
            g5_fleet_store::FleetStore::initialize(data.path(), "test-installation")
                .await
                .expect("test store"),
            &[3_u8; 32],
        )
        .expect("test auth"),
        connector: Arc::new(g5_fleet_connector::ProductionConnectorGateway),
        notification_worker: None,
    });
    let response = app
        .oneshot(Request::get("/readyz").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    let error: ErrorEnvelope = json(response).await;
    assert_eq!(error.error.code, "web_assets_missing");
}

#[test]
fn tracked_route_registry_matches_the_scaffold_contract() {
    let payload: Value =
        serde_json::from_str(include_str!("../contracts/routes.json")).expect("route registry");
    let routes = payload["routes"].as_array().expect("routes array");
    let actual = routes
        .iter()
        .map(|route| {
            (
                route["method"].as_str().unwrap(),
                route["path"].as_str().unwrap(),
            )
        })
        .collect::<Vec<_>>();
    assert_eq!(
        actual,
        vec![
            ("GET", "/healthz"),
            ("GET", "/readyz"),
            ("GET", "/api/v1/meta"),
            ("GET", "/api/v1/install/status"),
            ("POST", "/api/v1/install/challenge"),
            ("POST", "/api/v1/install/complete"),
            ("POST", "/api/v1/auth/login"),
            ("POST", "/api/v1/auth/logout"),
            ("POST", "/api/v1/auth/step-up"),
            ("GET", "/api/v1/session"),
            ("GET", "/api/v1/security/settings"),
            ("PUT", "/api/v1/security/password"),
            ("PUT", "/api/v1/security/idle-timeout"),
            ("POST", "/api/v1/security/totp/challenge"),
            ("POST", "/api/v1/security/totp/enable"),
            ("POST", "/api/v1/security/totp/disable"),
            ("POST", "/api/v1/security/recovery-codes"),
            ("GET", "/api/v1/audit"),
            ("GET", "/api/v1/activity"),
            ("GET", "/api/v1/dashboard"),
            ("GET", "/api/v1/diagnostics/runtime"),
            ("POST", "/api/v1/backup/export"),
            ("POST", "/api/v1/backup/import"),
            ("POST", "/api/v1/users"),
            ("GET", "/api/v1/plugins"),
            ("GET", "/api/v1/core/registry"),
            ("GET", "/api/v1/sites"),
            ("POST", "/api/v1/sites"),
            ("GET", "/api/v1/sites/{site_id}"),
            ("PUT", "/api/v1/sites/{site_id}"),
            ("DELETE", "/api/v1/sites/{site_id}"),
            ("PUT", "/api/v1/sites/{site_id}/secrets"),
            ("GET", "/api/v1/sites/{site_id}/connector/health"),
            ("POST", "/api/v1/sites/{site_id}/connector/login"),
            ("POST", "/api/v1/sites/{site_id}/connector/refresh"),
            ("POST", "/api/v1/sites/{site_id}/connector/logout"),
            ("GET", "/api/v1/sites/{site_id}/overview"),
            ("GET", "/api/v1/sites/{site_id}/admin/dashboard"),
            ("GET", "/api/v1/sites/{site_id}/admin/config"),
            ("PUT", "/api/v1/sites/{site_id}/admin/config"),
            ("GET", "/api/v1/sites/{site_id}/admin/schema"),
            ("GET", "/api/v1/sites/{site_id}/admin/schema/{domain}"),
            ("GET", "/api/v1/sites/{site_id}/member/me"),
            ("GET", "/api/v1/sites/{site_id}/admin/auth"),
            ("PUT", "/api/v1/sites/{site_id}/admin/auth/{mb_id}"),
            ("DELETE", "/api/v1/sites/{site_id}/admin/auth/{mb_id}"),
            ("GET", "/api/v1/sites/{site_id}/admin/permissions"),
            ("POST", "/api/v1/sites/{site_id}/admin/permissions"),
            (
                "DELETE",
                "/api/v1/sites/{site_id}/admin/permissions/{mb_id}/{au_menu}",
            ),
            ("GET", "/api/v1/sites/{site_id}/admin/members"),
            ("GET", "/api/v1/sites/{site_id}/admin/members/export"),
            ("GET", "/api/v1/sites/{site_id}/admin/members/{mb_id}"),
            ("PATCH", "/api/v1/sites/{site_id}/admin/members/{mb_id}"),
            ("DELETE", "/api/v1/sites/{site_id}/admin/members/{mb_id}"),
            (
                "PATCH",
                "/api/v1/sites/{site_id}/admin/members/{mb_id}/level"
            ),
            ("POST", "/api/v1/sites/{site_id}/admin/members/{mb_id}/icon"),
            (
                "DELETE",
                "/api/v1/sites/{site_id}/admin/members/{mb_id}/icon"
            ),
            (
                "POST",
                "/api/v1/sites/{site_id}/admin/members/{mb_id}/image"
            ),
            (
                "DELETE",
                "/api/v1/sites/{site_id}/admin/members/{mb_id}/image"
            ),
            ("GET", "/api/v1/sites/{site_id}/config/basic"),
            ("PUT", "/api/v1/sites/{site_id}/config/basic"),
            ("POST", "/api/v1/sites/{site_id}/core/{operation_id}",),
            ("GET", "/api/v1/sites/{site_id}/ssh/profile"),
            ("PUT", "/api/v1/sites/{site_id}/ssh/profile"),
            ("DELETE", "/api/v1/sites/{site_id}/ssh/profile"),
            ("POST", "/api/v1/sites/{site_id}/ssh/host-key"),
            ("POST", "/api/v1/sites/{site_id}/terminal/ticket"),
            ("GET", "/api/v1/sites/{site_id}/terminal"),
            ("POST", "/api/v1/sites/{site_id}/sftp"),
            ("POST", "/api/v1/sites/{site_id}/transfers/upload"),
            ("POST", "/api/v1/sites/{site_id}/transfers/download"),
            ("GET", "/api/v1/sites/{site_id}/transfers"),
            ("PUT", "/api/v1/sites/{site_id}/transfers/config"),
            ("GET", "/api/v1/sites/{site_id}/transfers/{job_id}"),
            ("POST", "/api/v1/sites/{site_id}/transfers/{job_id}/cancel",),
            ("POST", "/api/v1/sites/{site_id}/transfers/{job_id}/retry",),
            ("POST", "/api/v1/sites/{site_id}/transfers/{job_id}/pause",),
            ("POST", "/api/v1/sites/{site_id}/notifications"),
            ("GET", "/api/v1/sites/{site_id}/notifications/{outbox_id}",),
        ]
    );
}

#[tokio::test]
async fn login_cookie_csrf_and_logout_contract_fail_closed() {
    let (_web, _data, app) = fixture().await;
    let password = "correct horse battery staple";
    let (totp_secret, recovery_codes) = complete_install(&app, "admin", password).await;
    assert_eq!(recovery_codes.len(), 10);
    let totp_code =
        g5_fleet_security::generate_current_totp_code(&totp_secret, "G5 Fleet", "admin")
            .expect("login TOTP");

    let login = app
        .clone()
        .oneshot(
            Request::post("/api/v1/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "login_name":"admin",
                        "password":password,
                        "totp_code":totp_code
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(login.status(), StatusCode::OK);
    let set_cookie = login
        .headers()
        .get("set-cookie")
        .unwrap()
        .to_str()
        .unwrap()
        .to_owned();
    assert!(set_cookie.contains("HttpOnly"));
    assert!(set_cookie.contains("Secure"));
    assert!(set_cookie.contains("SameSite=Strict"));
    let cookie = set_cookie.split(';').next().unwrap().to_owned();
    let login: g5_fleet_admin_server::LoginResponse = json(login).await;
    assert!(!login.csrf_token.is_empty());

    let no_csrf = app
        .clone()
        .oneshot(
            Request::post("/api/v1/auth/logout")
                .header("cookie", &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(no_csrf.status(), StatusCode::FORBIDDEN);
    let error: ErrorEnvelope = json(no_csrf).await;
    assert_eq!(error.error.code, "csrf_failed");

    let session = app
        .clone()
        .oneshot(
            Request::get("/api/v1/session")
                .header("cookie", &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(session.status(), StatusCode::OK);
    let session: g5_fleet_admin_server::SessionResponse = json(session).await;

    let logout = app
        .clone()
        .oneshot(
            Request::post("/api/v1/auth/logout")
                .header("cookie", &cookie)
                .header("x-csrf-token", session.csrf_token)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(logout.status(), StatusCode::NO_CONTENT);

    let revoked = app
        .oneshot(
            Request::get("/api/v1/session")
                .header("cookie", cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(revoked.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn first_run_totp_recovery_lockout_and_audit_contract_are_enforced() {
    let (_web, _data, app) = fixture().await;
    let status = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/install/status",
            None,
            None,
            None,
        ))
        .await
        .unwrap();
    let status: g5_fleet_admin_server::InstallStatusResponse = json(status).await;
    assert_eq!(status.state, "setup_required");

    let password = "correct horse battery staple";
    let (totp_secret, recovery_codes) = complete_install(&app, "admin", password).await;
    assert_eq!(recovery_codes.len(), 10);

    let missing_totp = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/auth/login",
            None,
            None,
            Some(serde_json::json!({
                "login_name": "admin",
                "password": password
            })),
        ))
        .await
        .unwrap();
    assert_eq!(missing_totp.status(), StatusCode::UNAUTHORIZED);
    let missing_totp: ErrorEnvelope = json(missing_totp).await;
    assert_eq!(missing_totp.error.code, "second_factor_required");

    for attempt in 1..=5 {
        let response = app
            .clone()
            .oneshot(json_request(
                Method::POST,
                "/api/v1/auth/login",
                None,
                None,
                Some(serde_json::json!({
                    "login_name": "unknown-user",
                    "password": "definitely the wrong password"
                })),
            ))
            .await
            .unwrap();
        if attempt < 5 {
            assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
        } else {
            assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
        }
    }

    let totp_code =
        g5_fleet_security::generate_current_totp_code(&totp_secret, "G5 Fleet", "admin")
            .expect("login TOTP");
    let login = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/auth/login",
            None,
            None,
            Some(serde_json::json!({
                "login_name": "admin",
                "password": password,
                "totp_code": totp_code
            })),
        ))
        .await
        .unwrap();
    assert_eq!(login.status(), StatusCode::OK);
    let cookie = login
        .headers()
        .get("set-cookie")
        .unwrap()
        .to_str()
        .unwrap()
        .split(';')
        .next()
        .unwrap()
        .to_owned();
    let login: g5_fleet_admin_server::LoginResponse = json(login).await;

    let settings = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/security/settings",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    let settings: g5_fleet_admin_server::SecuritySettingsResponse = json(settings).await;
    assert!(settings.totp_enabled);
    assert_eq!(settings.session_idle_timeout_minutes, 30);

    let disable_totp = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/security/totp/disable",
            Some(&cookie),
            Some(&login.csrf_token),
            Some(serde_json::json!({
                "current_password": password,
                "totp_code": g5_fleet_security::generate_current_totp_code(
                    &totp_secret,
                    "G5 Fleet",
                    "admin"
                ).unwrap()
            })),
        ))
        .await
        .unwrap();
    assert_eq!(disable_totp.status(), StatusCode::FORBIDDEN);
    let disable_totp: ErrorEnvelope = json(disable_totp).await;
    assert_eq!(disable_totp.error.code, "totp_required_policy");

    let audit = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/audit?limit=100",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(audit.status(), StatusCode::OK);
    let audit: Vec<g5_fleet_store::AuditEntry> = json(audit).await;
    assert!(audit.iter().any(|entry| entry.action == "install.complete"));
    assert!(audit.iter().any(|entry| entry.action == "auth.login"));

    let logout = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/auth/logout",
            Some(&cookie),
            Some(&login.csrf_token),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(logout.status(), StatusCode::NO_CONTENT);

    let recovery_login = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/auth/login",
            None,
            None,
            Some(serde_json::json!({
                "login_name": "admin",
                "password": password,
                "recovery_code": recovery_codes[0]
            })),
        ))
        .await
        .unwrap();
    assert_eq!(recovery_login.status(), StatusCode::OK);

    let reused_recovery = app
        .oneshot(json_request(
            Method::POST,
            "/api/v1/auth/login",
            None,
            None,
            Some(serde_json::json!({
                "login_name": "admin",
                "password": password,
                "recovery_code": recovery_codes[0]
            })),
        ))
        .await
        .unwrap();
    assert_eq!(reused_recovery.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn authenticated_site_connector_config_roundtrip_and_rollback() {
    let web = TempDir::new().expect("web tempdir");
    let data = TempDir::new().expect("data tempdir");
    fs::write(
        web.path().join("index.html"),
        "<!doctype html><title>G5 Fleet</title><div id=\"root\"></div>",
    )
    .unwrap();
    let mock = MockConnector {
        cf_10: Arc::new(Mutex::new("baseline".to_owned())),
        permissions: Arc::new(Mutex::new(vec![serde_json::json!({
            "mb_id": "g5admin",
            "au_menu": "config_100",
            "au_auth": "r",
            "mb_name": "관리자",
            "mb_nick": "관리자"
        })])),
        auth_members: Arc::new(Mutex::new(vec![serde_json::json!({
            "mb_id": "g5admin",
            "mb_name": "관리자",
            "mb_nick": "관리자",
            "auths": [{"au_menu": "100100", "au_auth": "r"}]
        })])),
        members: Arc::new(Mutex::new(vec![serde_json::json!({
            "mb_id": "member01",
            "mb_name": "회원 이름",
            "mb_nick": "회원 닉네임",
            "mb_email": "member@example.test",
            "mb_level": 2,
            "mb_point": 1200,
            "mb_datetime": "2026-08-01 10:00:00",
            "mb_today_login": "2026-08-12 09:00:00"
        })])),
    };
    let app = build_router(AppConfig {
        web_root: web.path().to_path_buf(),
        auth: g5_fleet_security::AuthService::new(
            g5_fleet_store::FleetStore::initialize(data.path(), "vertical-test-installation")
                .await
                .unwrap(),
            &[5_u8; 32],
        )
        .unwrap(),
        connector: Arc::new(mock.clone()),
        notification_worker: None,
    });
    let fleet_password = "correct horse battery staple";
    let (totp_secret, _) = complete_install(&app, "admin", fleet_password).await;
    let totp_code =
        g5_fleet_security::generate_current_totp_code(&totp_secret, "G5 Fleet", "admin")
            .expect("login TOTP");

    let login = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/auth/login",
            None,
            None,
            Some(serde_json::json!({
                "login_name": "admin",
                "password": fleet_password,
                "totp_code": totp_code
            })),
        ))
        .await
        .unwrap();
    assert_eq!(login.status(), StatusCode::OK);
    let cookie = login
        .headers()
        .get("set-cookie")
        .unwrap()
        .to_str()
        .unwrap()
        .split(';')
        .next()
        .unwrap()
        .to_owned();
    let login: g5_fleet_admin_server::LoginResponse = json(login).await;
    let csrf = login.csrf_token;

    let step_up = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/auth/step-up",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "password": fleet_password,
                "totp_code": g5_fleet_security::generate_current_totp_code(
                    &totp_secret,
                    "G5 Fleet",
                    "admin"
                ).unwrap()
            })),
        ))
        .await
        .unwrap();
    assert_eq!(step_up.status(), StatusCode::NO_CONTENT);

    let create_peer = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/users",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "login_name": "peer",
                "password": "another durable peer password"
            })),
        ))
        .await
        .unwrap();
    assert_eq!(create_peer.status(), StatusCode::CONFLICT);
    let create_peer: ErrorEnvelope = json(create_peer).await;
    assert_eq!(
        create_peer.error.code, "user_totp_enrollment_required",
        "password-only Fleet administrators must not be created"
    );

    let site = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "site_id": "site-a",
                "display_name": "Site A",
                "base_url": "https://93.184.216.34"
            })),
        ))
        .await
        .unwrap();
    assert_eq!(site.status(), StatusCode::CREATED);

    let plugins = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/plugins",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(plugins.status(), StatusCode::OK);
    let plugins: Value = json(plugins).await;
    assert_eq!(plugins[0]["plugin_id"], "commerce");
    assert_eq!(plugins[0]["installed"], false);
    assert_eq!(plugins[0]["required"], false);

    let notification_payload = serde_json::json!({
        "event_id": "event-fixture-a",
        "channel": "telegram",
        "payload": {
            "title": "회원 알림",
            "body": "person@example.invalid 010-1234-5678 가입",
            "action_path": "/sites/site-a/members"
        }
    });
    let notification = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/notifications",
            Some(&cookie),
            Some(&csrf),
            Some(notification_payload.clone()),
        ))
        .await
        .unwrap();
    assert_eq!(notification.status(), StatusCode::CREATED);
    let notification: Value = json(notification).await;
    assert_eq!(notification["inserted"], true);
    assert_eq!(notification["notification"]["state"], "pending");
    assert_eq!(
        notification["notification"]["payload"]["body"],
        "[redacted] [redacted] 가입"
    );
    let first_outbox_id = notification["notification"]["outbox_id"]
        .as_str()
        .unwrap()
        .to_owned();
    let duplicate = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/notifications",
            Some(&cookie),
            Some(&csrf),
            Some(notification_payload),
        ))
        .await
        .unwrap();
    assert_eq!(duplicate.status(), StatusCode::OK);
    let duplicate: Value = json(duplicate).await;
    assert_eq!(duplicate["inserted"], false);
    assert_eq!(duplicate["notification"]["outbox_id"], first_outbox_id);

    let private_key = [
        "-----BEGIN OPENSSH ",
        "PRIVATE KEY-----\nfixture\n-----END OPENSSH ",
        "PRIVATE KEY-----",
    ]
    .concat();
    let ssh_profile = app
        .clone()
        .oneshot(json_request(
            Method::PUT,
            "/api/v1/sites/site-a/ssh/profile",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "username": "deploy",
                "host": "93.184.216.34",
                "port": 22,
                "private_key": private_key,
                "known_hosts": "93.184.216.34 ssh-ed25519 AAAAC3NzaFixture"
            })),
        ))
        .await
        .unwrap();
    assert_eq!(ssh_profile.status(), StatusCode::OK);
    let ssh_profile_body = ssh_profile.into_body().collect().await.unwrap().to_bytes();
    let ssh_profile_text = String::from_utf8_lossy(&ssh_profile_body);
    assert!(!ssh_profile_text.contains("PRIVATE KEY"));
    assert!(!ssh_profile_text.contains("AAAAC3NzaFixture"));
    let summary: SshProfileSummary = serde_json::from_slice(&ssh_profile_body).unwrap();
    assert_eq!(summary.host_key_verification, "strict_known_hosts");

    let ticket = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/terminal/ticket",
            Some(&cookie),
            Some(&csrf),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(ticket.status(), StatusCode::OK);
    let ticket: TerminalTicket = json(ticket).await;
    assert!(ticket.ticket.len() >= 40);

    let transfer_snapshot = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/transfers",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(transfer_snapshot.status(), StatusCode::OK);
    let transfer_snapshot: Value = json(transfer_snapshot).await;
    assert_eq!(transfer_snapshot["site_id"], "site-a");
    assert_eq!(transfer_snapshot["concurrency_limit"], 2);

    let profile_delete = app
        .clone()
        .oneshot(json_request(
            Method::DELETE,
            "/api/v1/sites/site-a/ssh/profile",
            Some(&cookie),
            Some(&csrf),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(profile_delete.status(), StatusCode::NO_CONTENT);
    let profile_readback = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/ssh/profile",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(profile_readback.status(), StatusCode::NOT_FOUND);

    let health = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/connector/health",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(health.status(), StatusCode::OK);

    let connector_password = "connector-password";
    let connector_login = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/connector/login",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "mb_id": "g5admin",
                "mb_password": connector_password
            })),
        ))
        .await
        .unwrap();
    assert_eq!(connector_login.status(), StatusCode::OK);
    let login_body = connector_login
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    let login_text = String::from_utf8_lossy(&login_body);
    assert!(!login_text.contains(connector_password));
    assert!(!login_text.contains("g5-access-token"));
    assert!(!login_text.contains("g5-refresh-token"));

    let baseline = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/config/basic",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    let baseline: BasicConfig = json(baseline).await;
    assert_eq!(baseline.cf_10.as_deref(), Some("baseline"));

    let update = app
        .clone()
        .oneshot(json_request(
            Method::PUT,
            "/api/v1/sites/site-a/config/basic",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"cf_10": "sentinel"})),
        ))
        .await
        .unwrap();
    assert_eq!(update.status(), StatusCode::OK);
    let readback = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/config/basic",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(
        json::<BasicConfig>(readback).await.cf_10.as_deref(),
        Some("sentinel")
    );

    let rollback = app
        .clone()
        .oneshot(json_request(
            Method::PUT,
            "/api/v1/sites/site-a/config/basic",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"cf_10": "baseline"})),
        ))
        .await
        .unwrap();
    assert_eq!(rollback.status(), StatusCode::OK);
    let rollback_readback = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/config/basic",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(
        json::<BasicConfig>(rollback_readback)
            .await
            .cf_10
            .as_deref(),
        Some("baseline")
    );

    let admin_dashboard = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/dashboard?limit=5",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(admin_dashboard.status(), StatusCode::OK);
    let admin_dashboard: Value = json(admin_dashboard).await;
    assert_eq!(admin_dashboard["limit"], 5);
    assert_eq!(admin_dashboard["summary"]["members"]["total_members"], 12);

    let schema_catalog = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/schema",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(schema_catalog.status(), StatusCode::OK);
    let schema_catalog: Value = json(schema_catalog).await;
    assert_eq!(schema_catalog["total"], 1);
    assert_eq!(schema_catalog["items"][0]["domain"], "config");

    let config_schema = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/schema/config",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(config_schema.status(), StatusCode::OK);
    let config_schema: Value = json(config_schema).await;
    assert_eq!(config_schema["field_count"], 2);
    assert_eq!(
        config_schema["fields_by_name"]["cf_title"]["input_type"],
        "text"
    );

    let admin_config_baseline = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/config",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(admin_config_baseline.status(), StatusCode::OK);
    let admin_config_baseline: Value = json(admin_config_baseline).await;
    assert_eq!(admin_config_baseline["cf_10"], "baseline");

    let admin_config_update = app
        .clone()
        .oneshot(json_request(
            Method::PUT,
            "/api/v1/sites/site-a/admin/config",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"cf_10": "typed-sentinel"})),
        ))
        .await
        .unwrap();
    assert_eq!(admin_config_update.status(), StatusCode::OK);
    let admin_config_readback = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/config",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(
        json::<Value>(admin_config_readback).await["cf_10"],
        "typed-sentinel"
    );

    let admin_config_rollback = app
        .clone()
        .oneshot(json_request(
            Method::PUT,
            "/api/v1/sites/site-a/admin/config",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"cf_10": "baseline"})),
        ))
        .await
        .unwrap();
    assert_eq!(admin_config_rollback.status(), StatusCode::OK);
    assert_eq!(*mock.cf_10.lock().unwrap(), "baseline");

    let member_me = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/member/me",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(member_me.status(), StatusCode::OK);
    assert_eq!(json::<Value>(member_me).await["mb_id"], "g5admin");

    let auth_list = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/auth?page=1&per_page=100",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(auth_list.status(), StatusCode::OK);
    assert_eq!(
        json::<Value>(auth_list).await["items"][0]["mb_id"],
        "g5admin"
    );

    let auth_upsert = app
        .clone()
        .oneshot(json_request(
            Method::PUT,
            "/api/v1/sites/site-a/admin/auth/auditor",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "auths": [{"au_menu": "100100", "au_auth": "W,R"}]
            })),
        ))
        .await
        .unwrap();
    assert_eq!(auth_upsert.status(), StatusCode::OK);
    assert_eq!(
        json::<Value>(auth_upsert).await["auths"][0]["au_auth"],
        "r,w"
    );
    let auth_readback = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/auth?page=1&per_page=100",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert!(
        json::<Value>(auth_readback).await["items"]
            .as_array()
            .unwrap()
            .iter()
            .any(|item| item["mb_id"] == "auditor")
    );
    let auth_delete = app
        .clone()
        .oneshot(json_request(
            Method::DELETE,
            "/api/v1/sites/site-a/admin/auth/auditor",
            Some(&cookie),
            Some(&csrf),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(auth_delete.status(), StatusCode::NO_CONTENT);

    let permission_list = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/permissions?page=1&per_page=100",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(permission_list.status(), StatusCode::OK);
    assert_eq!(
        json::<Value>(permission_list).await["items"][0]["au_menu"],
        "config_100"
    );
    let permission_save = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/admin/permissions",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "mb_id": "auditor",
                "au_menu": "board_200",
                "au_auth": "D,R,R"
            })),
        ))
        .await
        .unwrap();
    assert_eq!(permission_save.status(), StatusCode::OK);
    assert_eq!(json::<Value>(permission_save).await["au_auth"], "rd");
    let permission_readback = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/permissions?page=1&per_page=100",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert!(
        json::<Value>(permission_readback).await["items"]
            .as_array()
            .unwrap()
            .iter()
            .any(|item| item["mb_id"] == "auditor" && item["au_menu"] == "board_200")
    );
    let permission_delete = app
        .clone()
        .oneshot(json_request(
            Method::DELETE,
            "/api/v1/sites/site-a/admin/permissions/auditor/board_200",
            Some(&cookie),
            Some(&csrf),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(permission_delete.status(), StatusCode::NO_CONTENT);

    let member_list = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/members?page=1&per_page=20&search_field=all&sort_by=mb_id&sort_direction=ASC",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(member_list.status(), StatusCode::OK);
    assert_eq!(
        json::<Value>(member_list).await["items"][0]["mb_id"],
        "member01"
    );

    let member_export = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/members/export?search_field=all",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(member_export.status(), StatusCode::OK);

    let member_get = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/members/member01",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(member_get.status(), StatusCode::OK);

    let member_update = app
        .clone()
        .oneshot(json_request(
            Method::PATCH,
            "/api/v1/sites/site-a/admin/members/member01",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"mb_nick": "변경 닉네임"})),
        ))
        .await
        .unwrap();
    assert_eq!(member_update.status(), StatusCode::OK);
    assert_eq!(json::<Value>(member_update).await["mb_nick"], "변경 닉네임");

    let member_update_readback = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/members/member01",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(
        json::<Value>(member_update_readback).await["mb_nick"],
        "변경 닉네임"
    );

    let member_level = app
        .clone()
        .oneshot(json_request(
            Method::PATCH,
            "/api/v1/sites/site-a/admin/members/member01/level",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"mb_level": 3})),
        ))
        .await
        .unwrap();
    assert_eq!(json::<Value>(member_level).await["mb_level"], 3);

    for kind in ["icon", "image"] {
        let upload = app
            .clone()
            .oneshot(json_request(
                Method::POST,
                &format!("/api/v1/sites/site-a/admin/members/member01/{kind}"),
                Some(&cookie),
                Some(&csrf),
                Some(serde_json::json!({
                    "file_name": "member.gif",
                    "mime_type": "image/gif",
                    "bytes_base64": "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
                })),
            ))
            .await
            .unwrap();
        assert_eq!(upload.status(), StatusCode::OK);
        assert_eq!(json::<Value>(upload).await["mb_id"], "member01");

        let delete = app
            .clone()
            .oneshot(json_request(
                Method::DELETE,
                &format!("/api/v1/sites/site-a/admin/members/member01/{kind}"),
                Some(&cookie),
                Some(&csrf),
                None,
            ))
            .await
            .unwrap();
        assert_eq!(delete.status(), StatusCode::OK);
        assert_eq!(json::<Value>(delete).await["deleted"], true);
    }

    let member_rollback = app
        .clone()
        .oneshot(json_request(
            Method::PATCH,
            "/api/v1/sites/site-a/admin/members/member01",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"mb_nick": "회원 닉네임", "mb_level": 2})),
        ))
        .await
        .unwrap();
    assert_eq!(member_rollback.status(), StatusCode::OK);
    assert_eq!(
        json::<Value>(member_rollback).await["mb_nick"],
        "회원 닉네임"
    );

    let member_delete = app
        .clone()
        .oneshot(json_request(
            Method::DELETE,
            "/api/v1/sites/site-a/admin/members/member01",
            Some(&cookie),
            Some(&csrf),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(member_delete.status(), StatusCode::NO_CONTENT);

    let registry = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/core/registry",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    let registry: Value = json(registry).await;
    assert_eq!(registry.as_array().map(Vec::len), Some(189));
    assert!(
        registry
            .as_array()
            .unwrap()
            .iter()
            .all(|row| !row["path"].as_str().unwrap().starts_with("/admin/shop/"))
    );

    let core_read = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/core/adminListBoardGroups",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "path": {},
                "query": {"page": "1"},
                "body": null,
                "confirm_destructive": false
            })),
        ))
        .await
        .unwrap();
    assert_eq!(core_read.status(), StatusCode::OK);
    let core_read: CoreExecuteResponse = json(core_read).await;
    assert_eq!(core_read.operation_id, "adminListBoardGroups");
    assert_eq!(core_read.data.unwrap()["query"]["page"], "1");

    let external_effect = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/core/adminSendPush",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "path": {},
                "query": {},
                "body": {},
                "confirm_destructive": false
            })),
        ))
        .await
        .unwrap();
    assert_eq!(external_effect.status(), StatusCode::CONFLICT);
    let external_effect: ErrorEnvelope = json(external_effect).await;
    assert_eq!(external_effect.error.code, "external_effect_blocked");

    let overview = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/overview",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(overview.status(), StatusCode::OK);

    let refresh = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/connector/refresh",
            Some(&cookie),
            Some(&csrf),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(refresh.status(), StatusCode::OK);
    let refresh_body = refresh.into_body().collect().await.unwrap().to_bytes();
    let refresh_text = String::from_utf8_lossy(&refresh_body);
    assert!(!refresh_text.contains("g5-access-token-refreshed"));
    assert!(!refresh_text.contains("g5-refresh-token-refreshed"));

    let connector_logout = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/connector/logout",
            Some(&cookie),
            Some(&csrf),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(connector_logout.status(), StatusCode::NO_CONTENT);
    let after_logout = app
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/config/basic",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(after_logout.status(), StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(mock.cf_10.lock().unwrap().as_str(), "baseline");
}

#[tokio::test]
async fn site_lifecycle_dashboard_diagnostics_and_portable_backup_are_live() {
    let (_web, _data, app) = fixture().await;
    let password = "correct horse battery staple";
    let (totp_secret, _) = complete_install(&app, "admin", password).await;
    let totp_code =
        g5_fleet_security::generate_current_totp_code(&totp_secret, "G5 Fleet", "admin")
            .expect("login TOTP");
    let login = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/auth/login",
            None,
            None,
            Some(serde_json::json!({
                "login_name": "admin",
                "password": password,
                "totp_code": totp_code
            })),
        ))
        .await
        .expect("login");
    let cookie = login
        .headers()
        .get("set-cookie")
        .expect("cookie")
        .to_str()
        .unwrap()
        .split(';')
        .next()
        .unwrap()
        .to_owned();
    let login: g5_fleet_admin_server::LoginResponse = json(login).await;
    let csrf = login.csrf_token;
    let step_up = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/auth/step-up",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "password": password,
                "totp_code": g5_fleet_security::generate_current_totp_code(
                    &totp_secret,
                    "G5 Fleet",
                    "admin"
                ).unwrap()
            })),
        ))
        .await
        .unwrap();
    assert_eq!(step_up.status(), StatusCode::NO_CONTENT);

    let create = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "site_id": "site-a",
                "display_name": "Site A",
                "base_url": "https://93.184.216.34"
            })),
        ))
        .await
        .unwrap();
    assert_eq!(create.status(), StatusCode::CREATED);

    let update = app
        .clone()
        .oneshot(json_request(
            Method::PUT,
            "/api/v1/sites/site-a",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "display_name": "Site A Updated",
                "base_url": "https://93.184.216.35"
            })),
        ))
        .await
        .unwrap();
    assert_eq!(update.status(), StatusCode::NO_CONTENT);

    let dashboard = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/dashboard",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(dashboard.status(), StatusCode::OK);
    let dashboard: Value = json(dashboard).await;
    assert_eq!(dashboard["site_count"], 1);
    assert_eq!(dashboard["attention_count"], 1);
    assert!(dashboard["recent_activity"].as_array().unwrap().len() >= 2);

    let diagnostics = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/diagnostics/runtime",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(diagnostics.status(), StatusCode::OK);
    let diagnostics: Value = json(diagnostics).await;
    assert_eq!(diagnostics["database_engine"], "sqlite");
    assert_eq!(diagnostics["database_status"], "ok");
    assert_eq!(diagnostics["dev_bootstrap_available"], false);

    let export = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/backup/export",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"password":"portable password"})),
        ))
        .await
        .unwrap();
    assert_eq!(export.status(), StatusCode::OK);
    let envelope: Value = json(export).await;
    assert_eq!(envelope["format"], "g5-fleet-portable-backup-v1");
    assert_eq!(envelope["site_count"], 1);

    let wrong_password = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/backup/import",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "password":"different password",
                "envelope":envelope.clone()
            })),
        ))
        .await
        .unwrap();
    assert_eq!(wrong_password.status(), StatusCode::BAD_REQUEST);

    let delete = app
        .clone()
        .oneshot(json_request(
            Method::DELETE,
            "/api/v1/sites/site-a",
            Some(&cookie),
            Some(&csrf),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(delete.status(), StatusCode::NO_CONTENT);

    let import = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/backup/import",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "password":"portable password",
                "envelope":envelope
            })),
        ))
        .await
        .unwrap();
    assert_eq!(import.status(), StatusCode::OK);
    let import: Value = json(import).await;
    assert_eq!(import["imported_site_count"], 1);
    assert_eq!(import["reused_site_count"], 0);

    let sites = app
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    let sites: Value = json(sites).await;
    assert_eq!(sites.as_array().unwrap().len(), 1);
    assert_eq!(sites[0]["display_name"], "Site A Updated");
}

fn json_request(
    method: Method,
    path: &str,
    cookie: Option<&str>,
    csrf: Option<&str>,
    body: Option<Value>,
) -> Request<Body> {
    let mut request = Request::builder().method(method).uri(path);
    if let Some(cookie) = cookie {
        request = request.header("cookie", cookie);
    }
    if let Some(csrf) = csrf {
        request = request.header("x-csrf-token", csrf);
    }
    let body = if let Some(body) = body {
        request = request.header("content-type", "application/json");
        Body::from(body.to_string())
    } else {
        Body::empty()
    };
    request.body(body).unwrap()
}

#[derive(Clone, Default)]
struct MockConnector {
    cf_10: Arc<Mutex<String>>,
    permissions: Arc<Mutex<Vec<Value>>>,
    auth_members: Arc<Mutex<Vec<Value>>>,
    members: Arc<Mutex<Vec<Value>>>,
}

#[async_trait]
impl ConnectorGateway for MockConnector {
    async fn health(&self, _base_url: &str, _request_id: &str) -> ConnectorResult<ConnectorHealth> {
        Ok(ConnectorHealth {
            status: "ok".to_owned(),
            version: "5.6.32-test".to_owned(),
            timestamp: 1,
        })
    }

    async fn login(
        &self,
        _base_url: &str,
        _request_id: &str,
        input: &ConnectorLogin,
    ) -> ConnectorResult<ConnectorCredentials> {
        assert_eq!(input.mb_id, "g5admin");
        assert_eq!(input.mb_password, "connector-password");
        Ok(ConnectorCredentials {
            access_token: "g5-access-token".to_owned(),
            refresh_token: "g5-refresh-token".to_owned(),
            expires_in: 3600,
        })
    }

    async fn refresh(
        &self,
        _base_url: &str,
        _request_id: &str,
        refresh_token: &str,
    ) -> ConnectorResult<ConnectorCredentials> {
        assert_eq!(refresh_token, "g5-refresh-token");
        Ok(ConnectorCredentials {
            access_token: "g5-access-token-refreshed".to_owned(),
            refresh_token: "g5-refresh-token-refreshed".to_owned(),
            expires_in: 3600,
        })
    }

    async fn logout(
        &self,
        _base_url: &str,
        _request_id: &str,
        access_token: &str,
        refresh_token: &str,
    ) -> ConnectorResult<()> {
        assert_eq!(access_token, "g5-access-token-refreshed");
        assert_eq!(refresh_token, "g5-refresh-token-refreshed");
        Ok(())
    }

    async fn basic_config(
        &self,
        _base_url: &str,
        _request_id: &str,
        access_token: &str,
    ) -> ConnectorResult<BasicConfig> {
        assert_eq!(access_token, "g5-access-token");
        Ok(BasicConfig {
            cf_title: Some("Test Site".to_owned()),
            cf_admin: Some("g5admin".to_owned()),
            cf_10: Some(self.cf_10.lock().unwrap().clone()),
        })
    }

    async fn update_basic_config(
        &self,
        _base_url: &str,
        _request_id: &str,
        access_token: &str,
        cf_10: &str,
    ) -> ConnectorResult<BasicConfig> {
        assert_eq!(access_token, "g5-access-token");
        *self.cf_10.lock().unwrap() = cf_10.to_owned();
        self.basic_config("", "", access_token).await
    }

    async fn core_execute(
        &self,
        _base_url: &str,
        _request_id: &str,
        access_token: &str,
        operation_id: &str,
        input: &CoreExecuteRequest,
    ) -> ConnectorResult<CoreExecuteResponse> {
        assert_eq!(access_token, "g5-access-token");
        let data = match operation_id {
            "adminGetDashboard" => serde_json::json!({
                "data": {
                    "limit": input.query.get("limit").cloned().unwrap_or(serde_json::json!(5)),
                    "summary": {
                        "members": {
                            "total_members": 12,
                            "blocked_members": 1,
                            "leave_members": 0
                        },
                        "posts": {"total_rows": 34},
                        "points": {"total_rows": 56},
                        "visits": {"total_visits": 78}
                    },
                    "recent_members": [],
                    "recent_posts": [],
                    "recent_points": []
                },
                "meta": {}
            }),
            "adminGetConfig" => serde_json::json!({
                "data": {
                    "cf_title": "Test Site",
                    "cf_admin": "g5admin",
                    "cf_10": self.cf_10.lock().unwrap().clone()
                },
                "meta": {}
            }),
            "adminUpdateConfig" => {
                if let Some(value) = input
                    .body
                    .as_ref()
                    .and_then(|body| body.get("cf_10"))
                    .and_then(Value::as_str)
                {
                    *self.cf_10.lock().unwrap() = value.to_owned();
                }
                serde_json::json!({
                    "data": {
                        "cf_title": "Test Site",
                        "cf_admin": "g5admin",
                        "cf_10": self.cf_10.lock().unwrap().clone()
                    },
                    "meta": {}
                })
            }
            "adminListFieldSchemas" => serde_json::json!({
                "data": {
                    "items": [{
                        "domain": "config",
                        "title": "기본환경설정",
                        "legacy_form": "config_form",
                        "field_count": 2,
                        "section_count": 1,
                        "generated_at": "2026-07-27T00:00:00Z"
                    }],
                    "total": 1
                },
                "meta": {}
            }),
            "adminGetFieldSchema" => {
                let title = serde_json::json!({
                    "name": "cf_title",
                    "label": "사이트 제목",
                    "input_type": "text",
                    "data_type": "string",
                    "required": true,
                    "create_only": false,
                    "readonly_on_update": false,
                    "description": "브라우저 제목과 관리자 표시에 사용합니다.",
                    "options": [],
                    "option_source": null,
                    "default_value": null
                });
                let sentinel = serde_json::json!({
                    "name": "cf_10",
                    "label": "여분 필드 10",
                    "input_type": "text",
                    "data_type": "string",
                    "required": false,
                    "create_only": false,
                    "readonly_on_update": false,
                    "description": null,
                    "options": [],
                    "option_source": null,
                    "default_value": null
                });
                serde_json::json!({
                    "data": {
                        "domain": "config",
                        "title": "기본환경설정",
                        "legacy_form": "config_form",
                        "generated_at": "2026-07-27T00:00:00Z",
                        "field_count": 2,
                        "section_count": 1,
                        "layout": {
                            "desktop": "tabs",
                            "mobile": "accordion",
                            "single_open": true
                        },
                        "sections": [{
                            "key": "basic",
                            "label": "기본",
                            "order": 1,
                            "description": "사이트 기본 정보",
                            "fields": [title.clone(), sentinel.clone()]
                        }],
                        "fields_by_name": {
                            "cf_title": title,
                            "cf_10": sentinel
                        }
                    },
                    "meta": {}
                })
            }
            "getMyProfile" => serde_json::json!({
                "data": {
                    "mb_id": "g5admin",
                    "mb_name": "관리자",
                    "mb_nick": "관리자",
                    "mb_email": "admin@example.test",
                    "mb_level": 10,
                    "mb_point": 100
                },
                "meta": {}
            }),
            "adminSystemListAuths" => serde_json::json!({
                "data": self.permissions.lock().unwrap().clone(),
                "pagination": {
                    "mode": "cursor",
                    "total": self.permissions.lock().unwrap().len(),
                    "page": 1,
                    "per_page": 100,
                    "last_page": 1,
                    "cursor": null,
                    "next_cursor": null,
                    "has_next": false,
                    "has_prev": false
                },
                "meta": {}
            }),
            "adminSystemSaveAuth" => {
                let mut saved = input.body.clone().unwrap();
                saved["mb_name"] = Value::Null;
                saved["mb_nick"] = Value::Null;
                let mb_id = saved["mb_id"].as_str().unwrap();
                let au_menu = saved["au_menu"].as_str().unwrap();
                let mut items = self.permissions.lock().unwrap();
                items.retain(|item| {
                    item["mb_id"].as_str() != Some(mb_id)
                        || item["au_menu"].as_str() != Some(au_menu)
                });
                items.push(saved.clone());
                serde_json::json!({"data": saved, "meta": {}})
            }
            "adminSystemDeleteAuth" => {
                let mb_id = input.path.get("mb_id").map(String::as_str);
                let au_menu = input.path.get("au_menu").map(String::as_str);
                self.permissions.lock().unwrap().retain(|item| {
                    item["mb_id"].as_str() != mb_id || item["au_menu"].as_str() != au_menu
                });
                Value::Null
            }
            "adminListAuth" => serde_json::json!({
                "data": self.auth_members.lock().unwrap().clone(),
                "pagination": {
                    "mode": "cursor",
                    "total": self.auth_members.lock().unwrap().len(),
                    "page": 1,
                    "per_page": 100,
                    "last_page": 1,
                    "cursor": null,
                    "next_cursor": null,
                    "has_next": false,
                    "has_prev": false
                },
                "meta": {}
            }),
            "adminUpsertAuth" => {
                let mb_id = input.path.get("mb_id").unwrap().clone();
                let saved = serde_json::json!({
                    "mb_id": mb_id,
                    "mb_name": "권한 사용자",
                    "mb_nick": "권한 사용자",
                    "auths": input.body.as_ref().unwrap()["auths"].clone()
                });
                let mut items = self.auth_members.lock().unwrap();
                items.retain(|item| item["mb_id"].as_str() != saved["mb_id"].as_str());
                items.push(saved.clone());
                serde_json::json!({"data": saved, "meta": {}})
            }
            "adminDeleteAuthByMember" => {
                let mb_id = input.path.get("mb_id").map(String::as_str);
                self.auth_members
                    .lock()
                    .unwrap()
                    .retain(|item| item["mb_id"].as_str() != mb_id);
                Value::Null
            }
            "adminListMembers" | "adminExportMembersExcel" => serde_json::json!({
                "data": self.members.lock().unwrap().clone(),
                "pagination": {
                    "mode": "page",
                    "total": self.members.lock().unwrap().len(),
                    "page": 1,
                    "per_page": 20,
                    "last_page": 1,
                    "cursor": null,
                    "next_cursor": null,
                    "has_next": false,
                    "has_prev": false
                },
                "meta": {}
            }),
            "adminGetMember" => {
                let mb_id = input.path.get("mb_id").map(String::as_str);
                let member = self
                    .members
                    .lock()
                    .unwrap()
                    .iter()
                    .find(|item| item["mb_id"].as_str() == mb_id)
                    .cloned()
                    .unwrap();
                serde_json::json!({"data": member, "meta": {}})
            }
            "adminUpdateMember" | "adminUpdateMemberLevel" => {
                let mb_id = input.path.get("mb_id").map(String::as_str);
                let mut members = self.members.lock().unwrap();
                let member = members
                    .iter_mut()
                    .find(|item| item["mb_id"].as_str() == mb_id)
                    .unwrap();
                for (name, value) in input.body.as_ref().unwrap().as_object().unwrap() {
                    member[name] = value.clone();
                }
                serde_json::json!({"data": member.clone(), "meta": {}})
            }
            "adminDeleteMember" => {
                let mb_id = input.path.get("mb_id").map(String::as_str);
                self.members
                    .lock()
                    .unwrap()
                    .retain(|item| item["mb_id"].as_str() != mb_id);
                Value::Null
            }
            "adminUploadMemberIcon" | "adminUploadMemberImage" => {
                let mb_id = input.path.get("mb_id").unwrap();
                let image = operation_id.ends_with("Image");
                serde_json::json!({
                    "data": {
                        "mb_id": mb_id,
                        "storage": if image { "member_image" } else { "member" },
                        "relative_path": if image { "member_image/member01.gif" } else { "member/member01.gif" },
                        "url": if image { "/data/member_image/member01.gif" } else { "/data/member/member01.gif" },
                        "size": 4,
                        "width": 20,
                        "height": 20,
                        "mime": "image/gif"
                    },
                    "meta": {}
                })
            }
            "adminDeleteMemberIcon" | "adminDeleteMemberImage" => {
                let mb_id = input.path.get("mb_id").unwrap();
                let image = operation_id.ends_with("Image");
                serde_json::json!({
                    "data": {
                        "mb_id": mb_id,
                        "storage": if image { "member_image" } else { "member" },
                        "relative_path": if image { "member_image/member01.gif" } else { "member/member01.gif" },
                        "url": "",
                        "deleted": true
                    },
                    "meta": {}
                })
            }
            _ => serde_json::json!({
                "path": input.path,
                "query": input.query,
                "body": input.body,
            }),
        };
        Ok(CoreExecuteResponse {
            operation_id: operation_id.to_owned(),
            upstream_status: 200,
            content_type: Some("application/json".to_owned()),
            data: Some(data),
            body_base64: None,
        })
    }
}
