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
    ConnectorResult, CoreExecuteRequest, CoreExecuteResponse, FaqImageContent,
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
            ("GET", "/api/v1/sites/{site_id}/admin/board-groups"),
            ("POST", "/api/v1/sites/{site_id}/admin/board-groups"),
            ("GET", "/api/v1/sites/{site_id}/admin/board-groups/{gr_id}"),
            ("PUT", "/api/v1/sites/{site_id}/admin/board-groups/{gr_id}"),
            (
                "PATCH",
                "/api/v1/sites/{site_id}/admin/board-groups/{gr_id}"
            ),
            (
                "DELETE",
                "/api/v1/sites/{site_id}/admin/board-groups/{gr_id}"
            ),
            (
                "GET",
                "/api/v1/sites/{site_id}/admin/board-groups/{gr_id}/members"
            ),
            (
                "POST",
                "/api/v1/sites/{site_id}/admin/board-groups/{gr_id}/members"
            ),
            (
                "DELETE",
                "/api/v1/sites/{site_id}/admin/board-groups/{gr_id}/members/{mb_id}"
            ),
            ("GET", "/api/v1/sites/{site_id}/admin/groups"),
            ("POST", "/api/v1/sites/{site_id}/admin/groups"),
            ("GET", "/api/v1/sites/{site_id}/admin/groups/{gr_id}"),
            ("PUT", "/api/v1/sites/{site_id}/admin/groups/{gr_id}"),
            ("DELETE", "/api/v1/sites/{site_id}/admin/groups/{gr_id}"),
            (
                "GET",
                "/api/v1/sites/{site_id}/admin/groups/{gr_id}/members"
            ),
            (
                "POST",
                "/api/v1/sites/{site_id}/admin/groups/{gr_id}/members"
            ),
            (
                "DELETE",
                "/api/v1/sites/{site_id}/admin/groups/{gr_id}/members/{mb_id}"
            ),
            ("GET", "/api/v1/sites/{site_id}/admin/boards"),
            ("POST", "/api/v1/sites/{site_id}/admin/boards"),
            ("DELETE", "/api/v1/sites/{site_id}/admin/boards/new-posts"),
            ("GET", "/api/v1/sites/{site_id}/admin/boards/{bo_table}"),
            ("PUT", "/api/v1/sites/{site_id}/admin/boards/{bo_table}"),
            ("DELETE", "/api/v1/sites/{site_id}/admin/boards/{bo_table}"),
            (
                "POST",
                "/api/v1/sites/{site_id}/admin/boards/{bo_table}/copy"
            ),
            ("GET", "/api/v1/sites/{site_id}/admin/contents"),
            ("POST", "/api/v1/sites/{site_id}/admin/contents"),
            ("GET", "/api/v1/sites/{site_id}/admin/contents/{co_id}"),
            ("PUT", "/api/v1/sites/{site_id}/admin/contents/{co_id}"),
            ("DELETE", "/api/v1/sites/{site_id}/admin/contents/{co_id}"),
            ("GET", "/api/v1/sites/{site_id}/admin/faq-masters"),
            ("POST", "/api/v1/sites/{site_id}/admin/faq-masters"),
            ("GET", "/api/v1/sites/{site_id}/admin/faq-masters/{fm_id}"),
            ("PUT", "/api/v1/sites/{site_id}/admin/faq-masters/{fm_id}"),
            (
                "DELETE",
                "/api/v1/sites/{site_id}/admin/faq-masters/{fm_id}"
            ),
            (
                "POST",
                "/api/v1/sites/{site_id}/admin/faq-masters/{fm_id}/header-image"
            ),
            (
                "DELETE",
                "/api/v1/sites/{site_id}/admin/faq-masters/{fm_id}/header-image"
            ),
            (
                "POST",
                "/api/v1/sites/{site_id}/admin/faq-masters/{fm_id}/footer-image"
            ),
            (
                "DELETE",
                "/api/v1/sites/{site_id}/admin/faq-masters/{fm_id}/footer-image"
            ),
            (
                "GET",
                "/api/v1/sites/{site_id}/admin/faq-masters/{fm_id}/images/{kind}"
            ),
            ("GET", "/api/v1/sites/{site_id}/admin/faqs"),
            ("POST", "/api/v1/sites/{site_id}/admin/faqs"),
            ("GET", "/api/v1/sites/{site_id}/admin/faqs/{fa_id}"),
            ("PUT", "/api/v1/sites/{site_id}/admin/faqs/{fa_id}"),
            ("DELETE", "/api/v1/sites/{site_id}/admin/faqs/{fa_id}"),
            ("GET", "/api/v1/sites/{site_id}/admin/menus"),
            ("POST", "/api/v1/sites/{site_id}/admin/menus"),
            ("PATCH", "/api/v1/sites/{site_id}/admin/menus"),
            ("GET", "/api/v1/sites/{site_id}/admin/menus/{me_id}"),
            ("PUT", "/api/v1/sites/{site_id}/admin/menus/{me_id}"),
            ("DELETE", "/api/v1/sites/{site_id}/admin/menus/{me_id}"),
            ("PATCH", "/api/v1/sites/{site_id}/admin/menus/reorder"),
            ("GET", "/api/v1/sites/{site_id}/admin/layouts"),
            ("GET", "/api/v1/sites/{site_id}/admin/layouts/{page_id}"),
            ("PUT", "/api/v1/sites/{site_id}/admin/layouts/{page_id}"),
            (
                "POST",
                "/api/v1/sites/{site_id}/admin/layouts/{page_id}/widgets"
            ),
            (
                "PATCH",
                "/api/v1/sites/{site_id}/admin/layouts/{page_id}/widgets"
            ),
            (
                "PATCH",
                "/api/v1/sites/{site_id}/admin/layouts/{page_id}/widgets/{widget_id}"
            ),
            (
                "DELETE",
                "/api/v1/sites/{site_id}/admin/layouts/{page_id}/widgets/{widget_id}"
            ),
            (
                "PATCH",
                "/api/v1/sites/{site_id}/admin/layouts/{page_id}/reorder"
            ),
            ("GET", "/api/v1/sites/{site_id}/admin/theme"),
            ("PUT", "/api/v1/sites/{site_id}/admin/theme"),
            ("GET", "/api/v1/sites/{site_id}/admin/themes"),
            ("GET", "/api/v1/sites/{site_id}/admin/themes/{theme}"),
            ("GET", "/api/v1/sites/{site_id}/admin/system/polls"),
            ("POST", "/api/v1/sites/{site_id}/admin/system/polls"),
            ("GET", "/api/v1/sites/{site_id}/admin/system/polls/{po_id}"),
            ("PUT", "/api/v1/sites/{site_id}/admin/system/polls/{po_id}"),
            (
                "DELETE",
                "/api/v1/sites/{site_id}/admin/system/polls/{po_id}"
            ),
            ("GET", "/api/v1/sites/{site_id}/admin/polls"),
            ("POST", "/api/v1/sites/{site_id}/admin/polls"),
            ("GET", "/api/v1/sites/{site_id}/admin/polls/{po_id}"),
            ("PATCH", "/api/v1/sites/{site_id}/admin/polls/{po_id}"),
            ("DELETE", "/api/v1/sites/{site_id}/admin/polls/{po_id}"),
            ("GET", "/api/v1/sites/{site_id}/admin/system/popups"),
            ("POST", "/api/v1/sites/{site_id}/admin/system/popups"),
            ("GET", "/api/v1/sites/{site_id}/admin/system/popups/{nw_id}"),
            ("PUT", "/api/v1/sites/{site_id}/admin/system/popups/{nw_id}"),
            (
                "DELETE",
                "/api/v1/sites/{site_id}/admin/system/popups/{nw_id}"
            ),
            ("GET", "/api/v1/sites/{site_id}/admin/popups"),
            ("POST", "/api/v1/sites/{site_id}/admin/popups"),
            ("GET", "/api/v1/sites/{site_id}/admin/popups/{nw_id}"),
            ("PATCH", "/api/v1/sites/{site_id}/admin/popups/{nw_id}"),
            ("DELETE", "/api/v1/sites/{site_id}/admin/popups/{nw_id}"),
            ("GET", "/api/v1/sites/{site_id}/admin/popular"),
            ("DELETE", "/api/v1/sites/{site_id}/admin/popular"),
            ("GET", "/api/v1/sites/{site_id}/admin/popular/rank"),
            ("GET", "/api/v1/sites/{site_id}/admin/visits/stats"),
            ("GET", "/api/v1/sites/{site_id}/admin/visits/search"),
            ("DELETE", "/api/v1/sites/{site_id}/admin/visits"),
            ("GET", "/api/v1/sites/{site_id}/admin/reports"),
            ("GET", "/api/v1/sites/{site_id}/admin/reports/stats"),
            ("PATCH", "/api/v1/sites/{site_id}/admin/reports/{report_id}"),
            ("GET", "/api/v1/sites/{site_id}/admin/system/qa-config"),
            ("PUT", "/api/v1/sites/{site_id}/admin/system/qa-config"),
            ("DELETE", "/api/v1/sites/{site_id}/admin/qa"),
            ("GET", "/api/v1/sites/{site_id}/admin/write-count/stats"),
            ("GET", "/api/v1/sites/{site_id}/admin/mails"),
            ("POST", "/api/v1/sites/{site_id}/admin/mails"),
            ("POST", "/api/v1/sites/{site_id}/admin/mails/templates"),
            ("GET", "/api/v1/sites/{site_id}/admin/mails/recipients"),
            ("POST", "/api/v1/sites/{site_id}/admin/mails/test"),
            ("POST", "/api/v1/sites/{site_id}/admin/mails/test/legacy"),
            ("GET", "/api/v1/sites/{site_id}/admin/mails/{ma_id}"),
            ("PUT", "/api/v1/sites/{site_id}/admin/mails/{ma_id}"),
            ("DELETE", "/api/v1/sites/{site_id}/admin/mails/{ma_id}"),
            ("GET", "/api/v1/sites/{site_id}/admin/system/mails"),
            (
                "GET",
                "/api/v1/sites/{site_id}/admin/system/mail-recipients"
            ),
            ("POST", "/api/v1/sites/{site_id}/admin/system/mails/test"),
            ("POST", "/api/v1/sites/{site_id}/admin/system/mails/send"),
            ("GET", "/api/v1/sites/{site_id}/admin/sms/config"),
            ("PUT", "/api/v1/sites/{site_id}/admin/sms/config"),
            ("POST", "/api/v1/sites/{site_id}/admin/sms/member-sync"),
            ("GET", "/api/v1/sites/{site_id}/admin/sms/contact-groups"),
            ("POST", "/api/v1/sites/{site_id}/admin/sms/contact-groups"),
            (
                "GET",
                "/api/v1/sites/{site_id}/admin/sms/contact-groups/{bg_no}"
            ),
            (
                "PUT",
                "/api/v1/sites/{site_id}/admin/sms/contact-groups/{bg_no}"
            ),
            (
                "DELETE",
                "/api/v1/sites/{site_id}/admin/sms/contact-groups/{bg_no}"
            ),
            (
                "POST",
                "/api/v1/sites/{site_id}/admin/sms/contact-groups/{bg_no}/move"
            ),
            (
                "DELETE",
                "/api/v1/sites/{site_id}/admin/sms/contact-groups/{bg_no}/contacts"
            ),
            ("GET", "/api/v1/sites/{site_id}/admin/sms/contacts"),
            ("POST", "/api/v1/sites/{site_id}/admin/sms/contacts"),
            ("POST", "/api/v1/sites/{site_id}/admin/sms/contacts/batch"),
            ("POST", "/api/v1/sites/{site_id}/admin/sms/contacts/import"),
            ("GET", "/api/v1/sites/{site_id}/admin/sms/contacts/export"),
            ("GET", "/api/v1/sites/{site_id}/admin/sms/contacts/{bk_no}"),
            ("PUT", "/api/v1/sites/{site_id}/admin/sms/contacts/{bk_no}"),
            (
                "DELETE",
                "/api/v1/sites/{site_id}/admin/sms/contacts/{bk_no}"
            ),
            ("GET", "/api/v1/sites/{site_id}/admin/sms/history/batches"),
            (
                "GET",
                "/api/v1/sites/{site_id}/admin/sms/history/batches/{wr_no}"
            ),
            (
                "POST",
                "/api/v1/sites/{site_id}/admin/sms/history/batches/{wr_no}/resend-failures"
            ),
            (
                "POST",
                "/api/v1/sites/{site_id}/admin/sms/history/batches/{wr_no}/resend-all"
            ),
            (
                "GET",
                "/api/v1/sites/{site_id}/admin/sms/history/deliveries"
            ),
            ("POST", "/api/v1/sites/{site_id}/admin/sms/messages"),
            ("GET", "/api/v1/sites/{site_id}/admin/sms/template-groups"),
            ("POST", "/api/v1/sites/{site_id}/admin/sms/template-groups"),
            (
                "GET",
                "/api/v1/sites/{site_id}/admin/sms/template-groups/{fg_no}"
            ),
            (
                "PUT",
                "/api/v1/sites/{site_id}/admin/sms/template-groups/{fg_no}"
            ),
            (
                "DELETE",
                "/api/v1/sites/{site_id}/admin/sms/template-groups/{fg_no}"
            ),
            (
                "POST",
                "/api/v1/sites/{site_id}/admin/sms/template-groups/{fg_no}/move"
            ),
            (
                "DELETE",
                "/api/v1/sites/{site_id}/admin/sms/template-groups/{fg_no}/templates"
            ),
            ("GET", "/api/v1/sites/{site_id}/admin/sms/templates"),
            ("POST", "/api/v1/sites/{site_id}/admin/sms/templates"),
            ("POST", "/api/v1/sites/{site_id}/admin/sms/templates/batch"),
            ("GET", "/api/v1/sites/{site_id}/admin/sms/templates/{fo_no}"),
            ("PUT", "/api/v1/sites/{site_id}/admin/sms/templates/{fo_no}"),
            (
                "DELETE",
                "/api/v1/sites/{site_id}/admin/sms/templates/{fo_no}"
            ),
            ("GET", "/api/v1/sites/{site_id}/admin/points"),
            ("POST", "/api/v1/sites/{site_id}/admin/points"),
            ("DELETE", "/api/v1/sites/{site_id}/admin/points"),
            ("POST", "/api/v1/sites/{site_id}/admin/points/grant"),
            ("POST", "/api/v1/sites/{site_id}/admin/points/deduct"),
            ("GET", "/api/v1/sites/{site_id}/admin/points/summary"),
            ("POST", "/api/v1/sites/{site_id}/admin/points/expire"),
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
        groups: Arc::new(Mutex::new(vec![serde_json::json!({
            "gr_id": "staff",
            "gr_subject": "운영진",
            "gr_admin": "g5admin",
            "gr_device": "both",
            "gr_use_access": 0
        })])),
        group_members: Arc::new(Mutex::new(vec![serde_json::json!({
            "gm_id": 1,
            "gr_id": "staff",
            "mb_id": "member01",
            "gm_datetime": "2026-08-12 10:00:00",
            "mb_name": "회원 이름",
            "mb_nick": "회원 닉네임",
            "mb_level": 2,
            "mb_today_login": "2026-08-12 09:00:00"
        })])),
        boards: Arc::new(Mutex::new(vec![serde_json::json!({
            "bo_table": "notice",
            "bo_subject": "공지사항",
            "gr_id": "staff",
            "bo_use_category": false,
            "bo_category_list": "",
            "bo_read_level": 1,
            "bo_write_level": 10,
            "bo_comment_level": 2,
            "bo_download_level": 2,
            "bo_use_secret": 0,
            "bo_upload_count": 2,
            "bo_upload_size": 1048576,
            "bo_count_write": 4,
            "bo_count_comment": 1
        })])),
        contents: Arc::new(Mutex::new(vec![serde_json::json!({
            "co_id": "company",
            "co_subject": "회사 소개",
            "co_html": 2,
            "co_content": "<p>company</p>",
            "co_mobile_content": "mobile company",
            "co_include_head": "",
            "co_include_tail": "",
            "co_tag_filter_use": 1,
            "co_skin": "basic",
            "co_mobile_skin": "basic"
        })])),
        faq_masters: Arc::new(Mutex::new(vec![serde_json::json!({
            "fm_id": 1,
            "fm_subject": "서비스 안내",
            "fm_head_html": "<p>head</p>",
            "fm_tail_html": "",
            "fm_mobile_head_html": "",
            "fm_mobile_tail_html": "",
            "fm_order": 0,
            "faq_count": 1,
            "header_image": {"exists": false, "relative_path": "", "url": "", "width": null, "height": null, "mime": null, "size": null},
            "footer_image": {"exists": false, "relative_path": "", "url": "", "width": null, "height": null, "mime": null, "size": null}
        })])),
        faqs: Arc::new(Mutex::new(vec![serde_json::json!({
            "fa_id": 1,
            "fm_id": 1,
            "fm_subject": "서비스 안내",
            "fa_subject": "서비스는 무엇인가요?",
            "fa_content": "<p>Fleet 서비스입니다.</p>",
            "fa_order": 0
        })])),
        menus: Arc::new(Mutex::new(Vec::new())),
        layouts: Arc::new(Mutex::new(Vec::new())),
        theme_config: Arc::new(Mutex::new(serde_json::json!({
            "cf_theme": "basic",
            "cf_mobile_theme": "basic",
            "cf_theme_installed": true,
            "cf_mobile_theme_installed": true,
            "installed_count": 2
        }))),
        themes: Arc::new(Mutex::new(vec![
            mock_theme("basic", true, true),
            mock_theme("modern", false, false),
        ])),
        polls: Arc::new(Mutex::new(Vec::new())),
        popups: Arc::new(Mutex::new(Vec::new())),
        popular: Arc::new(Mutex::new(vec![
            serde_json::json!({"pp_word": "fleet", "pp_date": "2026-08-18", "pp_cnt": 2, "pp_rank": 1}),
            serde_json::json!({"pp_word": "gnuboard", "pp_date": "2026-08-19", "pp_cnt": 1, "pp_rank": 2}),
        ])),
        visits: Arc::new(Mutex::new(vec![
            serde_json::json!({"vi_id": 1, "vi_ip": "127.0.0.1", "vi_date": "2026-08-18", "vi_time": "09:10:00", "vi_referer": "https://example.com", "vi_agent": "Mozilla/5.0", "vi_browser": "Chrome", "vi_os": "macOS", "vi_device": "desktop"}),
            serde_json::json!({"vi_id": 2, "vi_ip": "127.0.0.2", "vi_date": "2026-08-19", "vi_time": "10:20:00", "vi_referer": "", "vi_agent": "Mobile Safari", "vi_browser": "Safari", "vi_os": "iOS", "vi_device": "mobile"}),
        ])),
        reports: Arc::new(Mutex::new(vec![
            serde_json::json!({"rp_id": 41, "mb_id": "member01", "rp_target_type": "post", "rp_target_id": "notice:10", "rp_reason": "spam", "rp_detail": "중복 홍보 게시물", "rp_status": "pending", "rp_admin_memo": null, "rp_datetime": "2026-08-18 09:00:00", "rp_processed_at": null}),
            serde_json::json!({"rp_id": 42, "mb_id": null, "rp_target_type": "comment", "rp_target_id": "notice:11:3", "rp_reason": "abuse", "rp_detail": "욕설 댓글", "rp_status": "hold", "rp_admin_memo": "추가 확인", "rp_datetime": "2026-08-19 10:00:00", "rp_processed_at": null}),
        ])),
        qa_config: Arc::new(Mutex::new(mock_qa_config())),
        qa_ids: Arc::new(Mutex::new(vec![71, 72, 73])),
        mails: Arc::new(Mutex::new(vec![mock_mail(51, "기준 메일", "기준 본문")])),
        external_mail_operations: Arc::new(Mutex::new(Vec::new())),
        points: Arc::new(Mutex::new(Vec::new())),
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

    let group_list = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/board-groups",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(group_list.status(), StatusCode::OK);
    assert_eq!(
        json::<Value>(group_list).await["items"][0]["gr_id"],
        "staff"
    );

    let group_create = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/admin/board-groups",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "gr_id": "audit", "gr_subject": "감사팀", "gr_admin": "g5admin",
                "gr_device": "both", "gr_use_access": 0
            })),
        ))
        .await
        .unwrap();
    assert_eq!(group_create.status(), StatusCode::CREATED);

    let group_get = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/board-groups/audit",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(json::<Value>(group_get).await["gr_subject"], "감사팀");

    let group_update = app
        .clone()
        .oneshot(json_request(
            Method::PUT,
            "/api/v1/sites/site-a/admin/board-groups/audit",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "gr_subject": "감사 운영팀", "gr_admin": "g5admin",
                "gr_device": "pc", "gr_use_access": 1
            })),
        ))
        .await
        .unwrap();
    assert_eq!(json::<Value>(group_update).await["gr_device"], "pc");

    let group_patch = app
        .clone()
        .oneshot(json_request(
            Method::PATCH,
            "/api/v1/sites/site-a/admin/board-groups/audit",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"gr_subject": "감사팀 확정"})),
        ))
        .await
        .unwrap();
    assert_eq!(
        json::<Value>(group_patch).await["gr_subject"],
        "감사팀 확정"
    );

    let group_members = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/board-groups/staff/members?page=1&per_page=20",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(
        json::<Value>(group_members).await["items"][0]["mb_id"],
        "member01"
    );

    let group_member_add = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/admin/board-groups/audit/members",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"mb_id": "member02"})),
        ))
        .await
        .unwrap();
    assert_eq!(group_member_add.status(), StatusCode::CREATED);
    assert_eq!(json::<Value>(group_member_add).await["mb_id"], "member02");

    let group_member_delete = app
        .clone()
        .oneshot(json_request(
            Method::DELETE,
            "/api/v1/sites/site-a/admin/board-groups/audit/members/member02",
            Some(&cookie),
            Some(&csrf),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(group_member_delete.status(), StatusCode::NO_CONTENT);

    let group_delete = app
        .clone()
        .oneshot(json_request(
            Method::DELETE,
            "/api/v1/sites/site-a/admin/board-groups/audit",
            Some(&cookie),
            Some(&csrf),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(group_delete.status(), StatusCode::NO_CONTENT);

    let legacy_list = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/groups",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(legacy_list.status(), StatusCode::OK);

    let legacy_create = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/admin/groups",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"gr_id": "legacy", "gr_subject": "레거시"})),
        ))
        .await
        .unwrap();
    assert_eq!(legacy_create.status(), StatusCode::CREATED);

    let legacy_get = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/groups/legacy",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(json::<Value>(legacy_get).await["gr_id"], "legacy");

    let legacy_update = app
        .clone()
        .oneshot(json_request(
            Method::PUT,
            "/api/v1/sites/site-a/admin/groups/legacy",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"gr_subject": "레거시 갱신"})),
        ))
        .await
        .unwrap();
    assert_eq!(
        json::<Value>(legacy_update).await["gr_subject"],
        "레거시 갱신"
    );

    let legacy_members = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/groups/staff/members?page=1&per_page=20",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(legacy_members.status(), StatusCode::OK);

    let legacy_member_add = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/admin/groups/legacy/members",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"mb_id": "member03"})),
        ))
        .await
        .unwrap();
    assert_eq!(legacy_member_add.status(), StatusCode::CREATED);

    let legacy_member_delete = app
        .clone()
        .oneshot(json_request(
            Method::DELETE,
            "/api/v1/sites/site-a/admin/groups/legacy/members/member03",
            Some(&cookie),
            Some(&csrf),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(legacy_member_delete.status(), StatusCode::NO_CONTENT);

    let legacy_delete = app
        .clone()
        .oneshot(json_request(
            Method::DELETE,
            "/api/v1/sites/site-a/admin/groups/legacy",
            Some(&cookie),
            Some(&csrf),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(legacy_delete.status(), StatusCode::NO_CONTENT);

    let board_list = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/boards?page=1&per_page=20&sort_by=bo_table&sort_direction=ASC",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(board_list.status(), StatusCode::OK);
    assert_eq!(
        json::<Value>(board_list).await["items"][0]["bo_table"],
        "notice"
    );

    let board_create = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/admin/boards",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "bo_table": "audit_board", "bo_subject": "감사 게시판", "gr_id": "staff",
                "bo_use_category": true, "bo_category_list": "공지|일반",
                "bo_read_level": 1, "bo_write_level": 2, "bo_comment_level": 2,
                "bo_download_level": 2, "bo_use_secret": 0,
                "bo_upload_count": 2, "bo_upload_size": 1048576
            })),
        ))
        .await
        .unwrap();
    assert_eq!(board_create.status(), StatusCode::CREATED);

    let board_get = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/boards/audit_board",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(json::<Value>(board_get).await["bo_subject"], "감사 게시판");

    let board_update = app
        .clone()
        .oneshot(json_request(
            Method::PUT,
            "/api/v1/sites/site-a/admin/boards/audit_board",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"bo_subject": "감사 게시판 갱신"})),
        ))
        .await
        .unwrap();
    assert_eq!(
        json::<Value>(board_update).await["bo_subject"],
        "감사 게시판 갱신"
    );

    let board_copy = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/admin/boards/audit_board/copy",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "target_bo_table": "audit_copy", "target_bo_subject": "감사 복제",
                "copy_posts": false
            })),
        ))
        .await
        .unwrap();
    assert_eq!(board_copy.status(), StatusCode::CREATED);
    assert_eq!(json::<Value>(board_copy).await["bo_table"], "audit_copy");

    let new_posts_delete = app
        .clone()
        .oneshot(json_request(
            Method::DELETE,
            "/api/v1/sites/site-a/admin/boards/new-posts",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"bn_ids": [101, 102]})),
        ))
        .await
        .unwrap();
    assert_eq!(json::<Value>(new_posts_delete).await["deleted_count"], 2);

    for bo_table in ["audit_copy", "audit_board"] {
        let board_delete = app
            .clone()
            .oneshot(json_request(
                Method::DELETE,
                &format!("/api/v1/sites/site-a/admin/boards/{bo_table}"),
                Some(&cookie),
                Some(&csrf),
                None,
            ))
            .await
            .unwrap();
        assert_eq!(board_delete.status(), StatusCode::NO_CONTENT);
    }

    let content_list = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/contents?page=1&per_page=20&search=company",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(content_list.status(), StatusCode::OK);
    assert_eq!(json::<Value>(content_list).await["items"][0]["co_html"], 2);

    let content_create = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/admin/contents",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "co_id": "fleet_terms",
                "co_subject": "Fleet 약관",
                "co_html": 2,
                "co_content": "<p>terms</p>",
                "co_mobile_content": "mobile terms",
                "co_tag_filter_use": 1
            })),
        ))
        .await
        .unwrap();
    assert_eq!(content_create.status(), StatusCode::CREATED);
    assert_eq!(json::<Value>(content_create).await["co_id"], "fleet_terms");

    let content_get = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/contents/fleet_terms",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(json::<Value>(content_get).await["co_html"], 2);

    let content_update = app
        .clone()
        .oneshot(json_request(
            Method::PUT,
            "/api/v1/sites/site-a/admin/contents/fleet_terms",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"co_subject": "Fleet 약관 갱신"})),
        ))
        .await
        .unwrap();
    assert_eq!(
        json::<Value>(content_update).await["co_subject"],
        "Fleet 약관 갱신"
    );

    let content_delete = app
        .clone()
        .oneshot(json_request(
            Method::DELETE,
            "/api/v1/sites/site-a/admin/contents/fleet_terms",
            Some(&cookie),
            Some(&csrf),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(content_delete.status(), StatusCode::NO_CONTENT);

    let faq_master_list = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/faq-masters?page=1&per_page=20",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(faq_master_list.status(), StatusCode::OK);
    assert_eq!(json::<Value>(faq_master_list).await["items"][0]["fm_id"], 1);

    let faq_master_create = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/admin/faq-masters",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "fm_subject": "Fleet FAQ",
                "fm_order": 2,
                "fm_head_html": "<p>head</p>",
                "fm_mobile_head_html": ""
            })),
        ))
        .await
        .unwrap();
    assert_eq!(faq_master_create.status(), StatusCode::CREATED);
    assert_eq!(json::<Value>(faq_master_create).await["fm_id"], 2);

    let faq_master_update = app
        .clone()
        .oneshot(json_request(
            Method::PUT,
            "/api/v1/sites/site-a/admin/faq-masters/2",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"fm_subject": "Fleet FAQ 갱신"})),
        ))
        .await
        .unwrap();
    assert_eq!(
        json::<Value>(faq_master_update).await["fm_subject"],
        "Fleet FAQ 갱신"
    );

    let faq_header_upload = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/admin/faq-masters/2/header-image",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "file_name": "header.png",
                "mime_type": "image/png",
                "bytes_base64": "aGVsbG8="
            })),
        ))
        .await
        .unwrap();
    assert_eq!(json::<Value>(faq_header_upload).await["exists"], true);

    let faq_header_content = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/faq-masters/2/images/header",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(faq_header_content.status(), StatusCode::OK);
    assert_eq!(faq_header_content.headers()["content-type"], "image/png");
    assert_eq!(
        faq_header_content.headers()["cache-control"],
        "private, no-store"
    );
    assert_eq!(
        faq_header_content
            .into_body()
            .collect()
            .await
            .unwrap()
            .to_bytes(),
        &[0x89, b'P', b'N', b'G', 0x0d, 0x0a, 0x1a, 0x0a][..]
    );

    let faq_header_delete = app
        .clone()
        .oneshot(json_request(
            Method::DELETE,
            "/api/v1/sites/site-a/admin/faq-masters/2/header-image",
            Some(&cookie),
            Some(&csrf),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(json::<Value>(faq_header_delete).await["exists"], false);

    let faq_create = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/admin/faqs",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "fm_id": 2,
                "fa_subject": "Fleet은 무엇인가요?",
                "fa_content": "<p>통합 관리자입니다.</p>",
                "fa_order": 1
            })),
        ))
        .await
        .unwrap();
    assert_eq!(faq_create.status(), StatusCode::CREATED);
    assert_eq!(json::<Value>(faq_create).await["fa_id"], 2);

    let faq_list = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/faqs?page=1&per_page=20&fm_id=2",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    let faq_list: Value = json(faq_list).await;
    assert_eq!(faq_list["items"].as_array().map(Vec::len), Some(1));
    assert_eq!(faq_list["items"][0]["fm_id"], 2);

    let faq_update = app
        .clone()
        .oneshot(json_request(
            Method::PUT,
            "/api/v1/sites/site-a/admin/faqs/2",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"fa_subject": "Fleet FAQ 수정"})),
        ))
        .await
        .unwrap();
    assert_eq!(
        json::<Value>(faq_update).await["fa_subject"],
        "Fleet FAQ 수정"
    );

    let faq_delete = app
        .clone()
        .oneshot(json_request(
            Method::DELETE,
            "/api/v1/sites/site-a/admin/faqs/2",
            Some(&cookie),
            Some(&csrf),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(faq_delete.status(), StatusCode::NO_CONTENT);

    let faq_master_delete = app
        .clone()
        .oneshot(json_request(
            Method::DELETE,
            "/api/v1/sites/site-a/admin/faq-masters/2",
            Some(&cookie),
            Some(&csrf),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(faq_master_delete.status(), StatusCode::NO_CONTENT);

    let menu_create = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/admin/menus",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "me_code": "100100", "me_name": "Fleet 메뉴",
                "me_link": "/fleet", "me_target": "_self",
                "me_order": 10, "me_use": 1, "me_mobile_use": 1
            })),
        ))
        .await
        .unwrap();
    assert_eq!(menu_create.status(), StatusCode::CREATED);
    assert_eq!(json::<Value>(menu_create).await["me_id"], 1);

    let menu_list = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/menus",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(
        json::<Value>(menu_list).await["items"][0]["me_code"],
        "100100"
    );

    let menu_get = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/menus/1",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(json::<Value>(menu_get).await["me_name"], "Fleet 메뉴");

    let menu_update = app
        .clone()
        .oneshot(json_request(
            Method::PUT,
            "/api/v1/sites/site-a/admin/menus/1",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"me_name": "Fleet 메뉴 갱신"})),
        ))
        .await
        .unwrap();
    assert_eq!(
        json::<Value>(menu_update).await["me_name"],
        "Fleet 메뉴 갱신"
    );

    for path in [
        "/api/v1/sites/site-a/admin/menus",
        "/api/v1/sites/site-a/admin/menus/reorder",
    ] {
        let reorder = app
            .clone()
            .oneshot(json_request(
                Method::PATCH,
                path,
                Some(&cookie),
                Some(&csrf),
                Some(serde_json::json!({"orders": [{"me_id": 1, "me_order": 20}]})),
            ))
            .await
            .unwrap();
        assert_eq!(json::<Value>(reorder).await["result"], "ok");
    }

    let menu_delete = app
        .clone()
        .oneshot(json_request(
            Method::DELETE,
            "/api/v1/sites/site-a/admin/menus/1",
            Some(&cookie),
            Some(&csrf),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(menu_delete.status(), StatusCode::NO_CONTENT);

    let layout_list = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/layouts",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(
        json::<Value>(layout_list).await["items"],
        serde_json::json!([])
    );

    let layout_save = app
        .clone()
        .oneshot(json_request(
            Method::PUT,
            "/api/v1/sites/site-a/admin/layouts/fleet-dashboard",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "title": "Fleet 대시보드",
                "widgets": [{
                    "widget_id": "fleet_one", "type": "latest_posts",
                    "title": "최근 글", "order": 1, "config": {}, "style": {}
                }]
            })),
        ))
        .await
        .unwrap();
    assert_eq!(layout_save.status(), StatusCode::OK);
    assert_eq!(
        json::<Value>(layout_save).await["sl_page_id"],
        "fleet-dashboard"
    );

    let layout_get = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/layouts/fleet-dashboard",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert!(
        json::<Value>(layout_get).await["sl_schema"]
            .as_str()
            .unwrap()
            .contains("fleet_one")
    );

    let layout_widget_add = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/admin/layouts/fleet-dashboard/widgets",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "widget_id": "fleet_two", "type": "notice_banner",
                "title": "알림", "order": 2, "config": {}, "style": {}
            })),
        ))
        .await
        .unwrap();
    assert!(
        json::<Value>(layout_widget_add).await["sl_schema"]
            .as_str()
            .unwrap()
            .contains("fleet_two")
    );

    let layout_widget_update = app
        .clone()
        .oneshot(json_request(
            Method::PATCH,
            "/api/v1/sites/site-a/admin/layouts/fleet-dashboard/widgets/fleet_two",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"title": "중요 알림"})),
        ))
        .await
        .unwrap();
    assert!(
        json::<Value>(layout_widget_update).await["sl_schema"]
            .as_str()
            .unwrap()
            .contains("중요 알림")
    );

    for path in [
        "/api/v1/sites/site-a/admin/layouts/fleet-dashboard/widgets",
        "/api/v1/sites/site-a/admin/layouts/fleet-dashboard/reorder",
    ] {
        let reorder = app
            .clone()
            .oneshot(json_request(
                Method::PATCH,
                path,
                Some(&cookie),
                Some(&csrf),
                Some(serde_json::json!({"widget_ids": ["fleet_two", "fleet_one"]})),
            ))
            .await
            .unwrap();
        let reordered = json::<Value>(reorder).await;
        let schema: Value = serde_json::from_str(reordered["sl_schema"].as_str().unwrap()).unwrap();
        assert_eq!(schema["widgets"][0]["widget_id"], "fleet_two");
        assert_eq!(schema["widgets"][0]["order"], 1);
    }

    let layout_widget_delete = app
        .clone()
        .oneshot(json_request(
            Method::DELETE,
            "/api/v1/sites/site-a/admin/layouts/fleet-dashboard/widgets/fleet_two",
            Some(&cookie),
            Some(&csrf),
            None,
        ))
        .await
        .unwrap();
    let layout_widget_delete = json::<Value>(layout_widget_delete).await;
    assert!(
        layout_widget_delete["sl_schema"]
            .as_str()
            .unwrap()
            .contains("fleet_one")
    );
    assert!(
        !layout_widget_delete["sl_schema"]
            .as_str()
            .unwrap()
            .contains("fleet_two")
    );

    let theme_config = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/theme",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(json::<Value>(theme_config).await["cf_theme"], "basic");

    let theme_list = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/themes",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    let theme_list = json::<Value>(theme_list).await;
    assert_eq!(theme_list["total"], 2);
    assert_eq!(theme_list["items"][1]["id"], "modern");

    let theme_detail = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/themes/modern",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(json::<Value>(theme_detail).await["theme_name"], "Modern");

    let theme_update = app
        .clone()
        .oneshot(json_request(
            Method::PUT,
            "/api/v1/sites/site-a/admin/theme",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "cf_theme": "modern",
                "cf_mobile_theme": "modern"
            })),
        ))
        .await
        .unwrap();
    let theme_update = json::<Value>(theme_update).await;
    assert_eq!(theme_update["cf_theme"], "modern");
    assert_eq!(theme_update["cf_mobile_theme"], "modern");

    let theme_readback = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/themes/modern",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    let theme_readback = json::<Value>(theme_readback).await;
    assert_eq!(theme_readback["is_active"], true);
    assert_eq!(theme_readback["is_mobile_active"], true);

    // All ten R21 poll operations: system and legacy aliases share typed site scope.
    let system_poll_create = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/admin/system/polls",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "po_subject": "R21 시스템 투표",
                "po_poll1": "찬성",
                "po_poll2": "반대",
                "po_level": 1,
                "po_point": 0,
                "po_use": 1
            })),
        ))
        .await
        .unwrap();
    assert_eq!(system_poll_create.status(), StatusCode::CREATED);
    let system_poll_create = json::<Value>(system_poll_create).await;
    assert_eq!(system_poll_create["po_id"], 1);

    let legacy_poll_create = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/admin/polls",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "po_subject": "R21 레거시 투표",
                "po_poll1": "예",
                "po_poll2": "아니오",
                "po_date": "2026-08-18"
            })),
        ))
        .await
        .unwrap();
    assert_eq!(legacy_poll_create.status(), StatusCode::CREATED);

    for path in [
        "/api/v1/sites/site-a/admin/system/polls?page=1&per_page=20",
        "/api/v1/sites/site-a/admin/polls?page=1&per_page=20",
    ] {
        let list = app
            .clone()
            .oneshot(json_request(Method::GET, path, Some(&cookie), None, None))
            .await
            .unwrap();
        let list = json::<Value>(list).await;
        assert_eq!(list["items"].as_array().map(Vec::len), Some(2));
    }

    for path in [
        "/api/v1/sites/site-a/admin/system/polls/1",
        "/api/v1/sites/site-a/admin/polls/2",
    ] {
        let detail = app
            .clone()
            .oneshot(json_request(Method::GET, path, Some(&cookie), None, None))
            .await
            .unwrap();
        assert_eq!(detail.status(), StatusCode::OK);
    }

    let system_poll_update = app
        .clone()
        .oneshot(json_request(
            Method::PUT,
            "/api/v1/sites/site-a/admin/system/polls/1",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"po_subject": "R21 시스템 투표 수정"})),
        ))
        .await
        .unwrap();
    assert_eq!(
        json::<Value>(system_poll_update).await["po_subject"],
        "R21 시스템 투표 수정"
    );

    let legacy_poll_update = app
        .clone()
        .oneshot(json_request(
            Method::PATCH,
            "/api/v1/sites/site-a/admin/polls/2",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"po_use": 0})),
        ))
        .await
        .unwrap();
    assert_eq!(json::<Value>(legacy_poll_update).await["po_use"], 0);

    for path in [
        "/api/v1/sites/site-a/admin/system/polls/1",
        "/api/v1/sites/site-a/admin/polls/2",
    ] {
        let delete = app
            .clone()
            .oneshot(json_request(
                Method::DELETE,
                path,
                Some(&cookie),
                Some(&csrf),
                None,
            ))
            .await
            .unwrap();
        assert_eq!(delete.status(), StatusCode::NO_CONTENT);
    }
    assert!(mock.polls.lock().unwrap().is_empty());

    // All ten R22 popup operations preserve the system and legacy provider aliases.
    for (path, subject) in [
        (
            "/api/v1/sites/site-a/admin/system/popups",
            "R22 시스템 팝업",
        ),
        ("/api/v1/sites/site-a/admin/popups", "R22 레거시 팝업"),
    ] {
        let create = app
            .clone()
            .oneshot(json_request(
                Method::POST,
                path,
                Some(&cookie),
                Some(&csrf),
                Some(serde_json::json!({
                    "nw_division": "both", "nw_device": "both",
                    "nw_disable_hours": 24, "nw_left": 100, "nw_top": 100,
                    "nw_height": 400, "nw_width": 600,
                    "nw_subject": subject, "nw_content": "팝업 본문", "nw_content_html": 0
                })),
            ))
            .await
            .unwrap();
        assert_eq!(create.status(), StatusCode::CREATED);
    }

    for path in [
        "/api/v1/sites/site-a/admin/system/popups?page=1&per_page=20",
        "/api/v1/sites/site-a/admin/popups?page=1&per_page=20",
    ] {
        let list = app
            .clone()
            .oneshot(json_request(Method::GET, path, Some(&cookie), None, None))
            .await
            .unwrap();
        assert_eq!(
            json::<Value>(list).await["items"].as_array().map(Vec::len),
            Some(2)
        );
    }

    for path in [
        "/api/v1/sites/site-a/admin/system/popups/1",
        "/api/v1/sites/site-a/admin/popups/2",
    ] {
        let detail = app
            .clone()
            .oneshot(json_request(Method::GET, path, Some(&cookie), None, None))
            .await
            .unwrap();
        assert_eq!(detail.status(), StatusCode::OK);
    }

    let system_popup_update = app
        .clone()
        .oneshot(json_request(
            Method::PUT,
            "/api/v1/sites/site-a/admin/system/popups/1",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"nw_subject": "R22 시스템 팝업 수정"})),
        ))
        .await
        .unwrap();
    assert_eq!(
        json::<Value>(system_popup_update).await["nw_subject"],
        "R22 시스템 팝업 수정"
    );

    let legacy_popup_update = app
        .clone()
        .oneshot(json_request(
            Method::PATCH,
            "/api/v1/sites/site-a/admin/popups/2",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"nw_device": "mobile"})),
        ))
        .await
        .unwrap();
    assert_eq!(
        json::<Value>(legacy_popup_update).await["nw_device"],
        "mobile"
    );

    for path in [
        "/api/v1/sites/site-a/admin/system/popups/1",
        "/api/v1/sites/site-a/admin/popups/2",
    ] {
        let delete = app
            .clone()
            .oneshot(json_request(
                Method::DELETE,
                path,
                Some(&cookie),
                Some(&csrf),
                None,
            ))
            .await
            .unwrap();
        assert_eq!(delete.status(), StatusCode::NO_CONTENT);
    }
    assert!(mock.popups.lock().unwrap().is_empty());

    // All three R23 popular operations preserve filters, rank and confirmed reset readback.
    let popular_list = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/popular?page=1&per_page=20&date_from=2026-08-18&date_to=2026-08-19",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(popular_list.status(), StatusCode::OK);
    let popular_list = json::<Value>(popular_list).await;
    assert_eq!(popular_list["items"].as_array().map(Vec::len), Some(2));

    let popular_rank = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/popular/rank?limit=10",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(popular_rank.status(), StatusCode::OK);
    assert_eq!(
        json::<Value>(popular_rank).await["items"][0]["pp_word"],
        "fleet"
    );

    let popular_reset = app
        .clone()
        .oneshot(json_request(
            Method::DELETE,
            "/api/v1/sites/site-a/admin/popular",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"date_from": "2026-08-18", "date_to": "2026-08-18"})),
        ))
        .await
        .unwrap();
    assert_eq!(popular_reset.status(), StatusCode::OK);
    assert_eq!(json::<Value>(popular_reset).await["deleted_rows"], 1);
    assert_eq!(mock.popular.lock().unwrap().len(), 1);

    let popular_cleanup = app
        .clone()
        .oneshot(json_request(
            Method::DELETE,
            "/api/v1/sites/site-a/admin/popular",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({})),
        ))
        .await
        .unwrap();
    assert_eq!(popular_cleanup.status(), StatusCode::OK);
    assert_eq!(json::<Value>(popular_cleanup).await["deleted_rows"], 1);
    assert!(mock.popular.lock().unwrap().is_empty());

    // R24 visit statistics, search and condition-bounded deletion stay site-scoped.
    let visit_stats = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/visits/stats?type=device&limit=30",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(visit_stats.status(), StatusCode::OK);
    let visit_stats = json::<Value>(visit_stats).await;
    assert_eq!(visit_stats["summary"]["total_visits"], 2);
    assert_eq!(visit_stats["type"], "device");

    let visit_search = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/visits/search?page=1&per_page=50&ip=127.0.0.2",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(visit_search.status(), StatusCode::OK);
    assert_eq!(
        json::<Value>(visit_search).await["items"][0]["vi_device"],
        "mobile"
    );

    let unsafe_delete = app
        .clone()
        .oneshot(json_request(
            Method::DELETE,
            "/api/v1/sites/site-a/admin/visits",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({})),
        ))
        .await
        .unwrap();
    assert_eq!(unsafe_delete.status(), StatusCode::BAD_REQUEST);
    assert_eq!(mock.visits.lock().unwrap().len(), 2);

    let visit_delete = app
        .clone()
        .oneshot(json_request(
            Method::DELETE,
            "/api/v1/sites/site-a/admin/visits",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"before": "2026-08-19"})),
        ))
        .await
        .unwrap();
    assert_eq!(visit_delete.status(), StatusCode::OK);
    assert_eq!(json::<Value>(visit_delete).await["deleted_rows"], 1);
    assert_eq!(mock.visits.lock().unwrap().len(), 1);

    // R25 report list, statistics and processing preserve the selected site.
    let report_list = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/reports?status=pending&page=1&per_page=20",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(report_list.status(), StatusCode::OK);
    let report_list = json::<Value>(report_list).await;
    assert_eq!(report_list["items"].as_array().unwrap().len(), 1);
    assert_eq!(report_list["items"][0]["rp_id"], 41);

    let report_stats = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/reports/stats",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(report_stats.status(), StatusCode::OK);
    let report_stats = json::<Value>(report_stats).await;
    assert_eq!(report_stats["total"], 2);
    assert_eq!(report_stats["pending"], 1);

    let report_update = app
        .clone()
        .oneshot(json_request(
            Method::PATCH,
            "/api/v1/sites/site-a/admin/reports/41",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "status": "approved",
                "admin_memo": "운영 검토 완료"
            })),
        ))
        .await
        .unwrap();
    assert_eq!(report_update.status(), StatusCode::OK);
    let report_update = json::<Value>(report_update).await;
    assert_eq!(report_update["rp_status"], "approved");
    assert_eq!(report_update["rp_admin_memo"], "운영 검토 완료");
    assert_eq!(mock.reports.lock().unwrap()[0]["rp_status"], "approved");

    // R26 QA config and bulk deletion stay site-scoped and require step-up for writes.
    let qa_config = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/system/qa-config",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(qa_config.status(), StatusCode::OK);
    let qa_config = json::<Value>(qa_config).await;
    assert_eq!(qa_config["qa_title"], "1:1 문의");
    assert_eq!(qa_config["qa_1_subj"], "추가 항목 1");

    let qa_config_update = app
        .clone()
        .oneshot(json_request(
            Method::PUT,
            "/api/v1/sites/site-a/admin/system/qa-config",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "qa_title": "Fleet 문의",
                "qa_1_subj": "주문 번호"
            })),
        ))
        .await
        .unwrap();
    assert_eq!(qa_config_update.status(), StatusCode::OK);
    let qa_config_update = json::<Value>(qa_config_update).await;
    assert_eq!(qa_config_update["qa_title"], "Fleet 문의");
    assert_eq!(qa_config_update["qa_1_subj"], "주문 번호");
    assert_eq!(mock.qa_config.lock().unwrap()["qa_title"], "Fleet 문의");

    let qa_bulk_delete = app
        .clone()
        .oneshot(json_request(
            Method::DELETE,
            "/api/v1/sites/site-a/admin/qa",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"qa_ids": [71, 72]})),
        ))
        .await
        .unwrap();
    assert_eq!(qa_bulk_delete.status(), StatusCode::OK);
    let qa_bulk_delete = json::<Value>(qa_bulk_delete).await;
    assert_eq!(qa_bulk_delete["deleted_count"], 2);
    assert_eq!(qa_bulk_delete["qa_ids"], serde_json::json!([71, 72]));
    assert_eq!(*mock.qa_ids.lock().unwrap(), vec![73]);

    // R27 write-count filters and bucket summaries stay site-scoped and read-only.
    let write_count = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/write-count/stats?period=week&date_from=2026-08-01&date_to=2026-08-21&bo_table=notice",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(write_count.status(), StatusCode::OK);
    let write_count = json::<Value>(write_count).await;
    assert_eq!(write_count["period"], "week");
    assert_eq!(write_count["bo_table"], "notice");
    assert_eq!(write_count["summary"]["write_total"], 7);
    assert_eq!(write_count["summary"]["comment_total"], 3);
    assert_eq!(write_count["items"].as_array().map(Vec::len), Some(2));

    let unsafe_write_count = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/write-count/stats?bo_table=notice%3Bdrop",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(unsafe_write_count.status(), StatusCode::BAD_REQUEST);

    // R28 mail templates, recipients and explicitly confirmed external actions are typed.
    let mail_list = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/mails?page=1&per_page=20",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(mail_list.status(), StatusCode::OK);
    assert_eq!(json::<Value>(mail_list).await["pagination"]["total"], 1);

    let mail_create = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/admin/mails/templates",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "ma_subject": "Fleet 운영 공지",
                "ma_content": "안녕하세요 {이름}"
            })),
        ))
        .await
        .unwrap();
    assert_eq!(mail_create.status(), StatusCode::CREATED);
    let mail_create = json::<Value>(mail_create).await;
    let mail_id = mail_create["ma_id"].as_i64().unwrap();

    let mail_recipients = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/mails/recipients?page=1&per_page=20&search=member&mailling_only=true",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(mail_recipients.status(), StatusCode::OK);
    assert_eq!(
        json::<Value>(mail_recipients).await["items"][0]["mb_id"],
        "member01"
    );

    let mail_detail = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            &format!("/api/v1/sites/site-a/admin/mails/{mail_id}"),
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(mail_detail.status(), StatusCode::OK);
    assert_eq!(
        json::<Value>(mail_detail).await["ma_subject"],
        "Fleet 운영 공지"
    );

    let mail_update = app
        .clone()
        .oneshot(json_request(
            Method::PUT,
            &format!("/api/v1/sites/site-a/admin/mails/{mail_id}"),
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "ma_subject": "Fleet 수정 공지",
                "ma_content": "수정 본문"
            })),
        ))
        .await
        .unwrap();
    assert_eq!(mail_update.status(), StatusCode::OK);
    assert_eq!(
        json::<Value>(mail_update).await["ma_subject"],
        "Fleet 수정 공지"
    );

    let unconfirmed_send = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/admin/mails",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "confirm_send": false, "ma_id": mail_id, "target_type": "member",
                "mb_ids": ["member01"], "mailling_only": true, "dry_run": true
            })),
        ))
        .await
        .unwrap();
    assert_eq!(unconfirmed_send.status(), StatusCode::BAD_REQUEST);
    assert_eq!(
        json::<ErrorEnvelope>(unconfirmed_send).await.error.code,
        "external_effect_confirmation_required"
    );

    let mail_send = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/admin/mails",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "confirm_send": true, "ma_id": mail_id, "target_type": "member",
                "mb_ids": ["member01"], "mailling_only": true, "dry_run": true
            })),
        ))
        .await
        .unwrap();
    assert_eq!(mail_send.status(), StatusCode::OK);
    let mail_send = json::<Value>(mail_send).await;
    assert_eq!(mail_send["dry_run"], true);
    assert_eq!(mail_send["target_count"], 1);
    assert_eq!(mail_send["sent_count"], 0);

    for path in [
        "/api/v1/sites/site-a/admin/mails/test",
        "/api/v1/sites/site-a/admin/mails/test/legacy",
    ] {
        let mail_test = app
            .clone()
            .oneshot(json_request(
                Method::POST,
                path,
                Some(&cookie),
                Some(&csrf),
                Some(serde_json::json!({
                    "confirm_send": true,
                    "ma_id": mail_id,
                    "to": "mail-test@example.invalid"
                })),
            ))
            .await
            .unwrap();
        assert_eq!(mail_test.status(), StatusCode::OK);
        assert_eq!(json::<Value>(mail_test).await["mail_enabled"], false);
    }

    let system_mail_list = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/system/mails?page=1&per_page=20",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(system_mail_list.status(), StatusCode::OK);
    assert_eq!(
        json::<Value>(system_mail_list).await["pagination"]["total"],
        2
    );

    let system_recipients = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/system/mail-recipients?search=member",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(system_recipients.status(), StatusCode::OK);
    assert_eq!(
        json::<Value>(system_recipients).await["items"][0]["mb_id"],
        "member01"
    );

    let system_mail_test = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/admin/system/mails/test",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "confirm_send": true,
                "to": "system-test@example.invalid",
                "subject": "시스템 테스트",
                "content": "로컬 로그 전용"
            })),
        ))
        .await
        .unwrap();
    assert_eq!(system_mail_test.status(), StatusCode::OK);
    assert_eq!(json::<Value>(system_mail_test).await["mail_log_id"], 9001);

    let system_mail_send = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/admin/system/mails/send",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "confirm_send": true, "ma_id": mail_id, "mb_ids": ["member01"],
                "mailling_only": true, "dry_run": true
            })),
        ))
        .await
        .unwrap();
    assert_eq!(system_mail_send.status(), StatusCode::OK);
    let system_mail_send = json::<Value>(system_mail_send).await;
    assert_eq!(system_mail_send["mail_log_id"], 9002);
    assert_eq!(system_mail_send["dry_run"], true);

    assert_eq!(
        *mock.external_mail_operations.lock().unwrap(),
        vec![
            "adminSendMail",
            "adminCreateMailTest",
            "adminSendTestMail",
            "adminSystemSendMailTest",
            "adminSystemSendMemberMail"
        ]
    );

    let mail_delete = app
        .clone()
        .oneshot(json_request(
            Method::DELETE,
            &format!("/api/v1/sites/site-a/admin/mails/{mail_id}"),
            Some(&cookie),
            Some(&csrf),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(mail_delete.status(), StatusCode::NO_CONTENT);
    assert_eq!(mock.mails.lock().unwrap().len(), 1);

    let point_baseline = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/points/summary?mb_id=member01",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    let point_baseline = json::<Value>(point_baseline).await;
    assert_eq!(point_baseline["total_point"], 0);
    assert_eq!(point_baseline["total_rows"], 0);

    let point_action = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/admin/points",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "action": "grant",
                "mb_id": "member01",
                "point": 120,
                "po_content": "canonical grant"
            })),
        ))
        .await
        .unwrap();
    let point_action = json::<Value>(point_action).await;
    assert_eq!(point_action["changed_point"], 120);
    assert_eq!(point_action["after_point"], 120);

    let point_grant = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/admin/points/grant",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "mb_id": "member01",
                "point": 30,
                "po_content": "legacy grant"
            })),
        ))
        .await
        .unwrap();
    assert_eq!(json::<Value>(point_grant).await["after_point"], 150);

    let point_deduct = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/admin/points/deduct",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({
                "mb_id": "member01",
                "point": 20,
                "po_content": "legacy deduct"
            })),
        ))
        .await
        .unwrap();
    assert_eq!(json::<Value>(point_deduct).await["after_point"], 130);

    let point_expire = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/sites/site-a/admin/points/expire",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"base_date": "2026-08-18"})),
        ))
        .await
        .unwrap();
    assert_eq!(json::<Value>(point_expire).await["expired_count"], 0);

    let point_list = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/points?mb_id=member01&page=1&per_page=20",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    let point_list = json::<Value>(point_list).await;
    assert_eq!(point_list["items"].as_array().map(Vec::len), Some(3));
    assert_eq!(point_list["pagination"]["total"], 3);

    let point_summary = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/points/summary?mb_id=member01",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    let point_summary = json::<Value>(point_summary).await;
    assert_eq!(point_summary["total_point"], 130);
    assert_eq!(point_summary["total_rows"], 3);

    let point_delete = app
        .clone()
        .oneshot(json_request(
            Method::DELETE,
            "/api/v1/sites/site-a/admin/points",
            Some(&cookie),
            Some(&csrf),
            Some(serde_json::json!({"po_ids": [1, 2, 3]})),
        ))
        .await
        .unwrap();
    let point_delete = json::<Value>(point_delete).await;
    assert_eq!(point_delete["requested_count"], 3);
    assert_eq!(point_delete["deleted_count"], 3);

    let point_cleanup = app
        .clone()
        .oneshot(json_request(
            Method::GET,
            "/api/v1/sites/site-a/admin/points/summary?mb_id=member01",
            Some(&cookie),
            None,
            None,
        ))
        .await
        .unwrap();
    assert_eq!(json::<Value>(point_cleanup).await["total_rows"], 0);

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
    assert_eq!(core_read.data.unwrap()["data"][0]["gr_id"], "staff");

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

fn mock_theme(id: &str, is_active: bool, is_mobile_active: bool) -> Value {
    let title = match id {
        "basic" => "Basic",
        "modern" => "Modern",
        _ => id,
    };
    serde_json::json!({
        "id": id,
        "path": format!("/var/www/html/theme/{id}"),
        "theme_name": title,
        "theme_uri": "https://example.test/theme",
        "maker": "G5 Fleet",
        "maker_uri": "https://example.test",
        "version": "1.0.0",
        "detail": format!("{title} theme"),
        "license": "MIT",
        "license_uri": "https://opensource.org/license/mit",
        "readme_path": format!("/var/www/html/theme/{id}/README.md"),
        "theme_config_path": format!("/var/www/html/theme/{id}/theme.config.php"),
        "screenshot_path": null,
        "set_default_skin": true,
        "preview_board_skin": "basic",
        "preview_mobile_board_skin": "basic",
        "is_active": is_active,
        "is_mobile_active": is_mobile_active,
        "theme_config": {}
    })
}

fn mock_poll(po_id: i64, body: &Value) -> Value {
    serde_json::json!({
        "po_id": po_id,
        "po_subject": body["po_subject"],
        "po_poll1": body["po_poll1"],
        "po_poll2": body["po_poll2"],
        "po_poll3": body.get("po_poll3").cloned().unwrap_or(serde_json::json!("")),
        "po_poll4": body.get("po_poll4").cloned().unwrap_or(serde_json::json!("")),
        "po_poll5": body.get("po_poll5").cloned().unwrap_or(serde_json::json!("")),
        "po_poll6": body.get("po_poll6").cloned().unwrap_or(serde_json::json!("")),
        "po_poll7": body.get("po_poll7").cloned().unwrap_or(serde_json::json!("")),
        "po_poll8": body.get("po_poll8").cloned().unwrap_or(serde_json::json!("")),
        "po_poll9": body.get("po_poll9").cloned().unwrap_or(serde_json::json!("")),
        "po_cnt1": 0, "po_cnt2": 0, "po_cnt3": 0, "po_cnt4": 0, "po_cnt5": 0,
        "po_cnt6": 0, "po_cnt7": 0, "po_cnt8": 0, "po_cnt9": 0,
        "po_etc": body.get("po_etc").cloned().unwrap_or(serde_json::json!("")),
        "po_level": body.get("po_level").cloned().unwrap_or(serde_json::json!(1)),
        "po_point": body.get("po_point").cloned().unwrap_or(serde_json::json!(0)),
        "po_date": body.get("po_date").cloned().unwrap_or(serde_json::json!("2026-08-18")),
        "po_ips": "",
        "mb_ids": "",
        "po_use": body.get("po_use").cloned().unwrap_or(serde_json::json!(1))
    })
}

fn mock_popup(nw_id: i64, body: &Value) -> Value {
    serde_json::json!({
        "nw_id": nw_id,
        "nw_division": body.get("nw_division").cloned().unwrap_or(serde_json::json!("both")),
        "nw_device": body.get("nw_device").cloned().unwrap_or(serde_json::json!("both")),
        "nw_begin_time": body.get("nw_begin_time").cloned().unwrap_or(Value::Null),
        "nw_end_time": body.get("nw_end_time").cloned().unwrap_or(Value::Null),
        "nw_disable_hours": body.get("nw_disable_hours").cloned().unwrap_or(serde_json::json!(24)),
        "nw_left": body.get("nw_left").cloned().unwrap_or(serde_json::json!(100)),
        "nw_top": body.get("nw_top").cloned().unwrap_or(serde_json::json!(100)),
        "nw_height": body.get("nw_height").cloned().unwrap_or(serde_json::json!(400)),
        "nw_width": body.get("nw_width").cloned().unwrap_or(serde_json::json!(600)),
        "nw_subject": body["nw_subject"],
        "nw_content": body["nw_content"],
        "nw_content_html": body.get("nw_content_html").cloned().unwrap_or(serde_json::json!(0))
    })
}

fn mock_point_change(points: &Mutex<Vec<Value>>, body: &Value, deduct: bool) -> Value {
    let member_id = body["mb_id"].as_str().unwrap();
    let requested = body["point"].as_i64().unwrap();
    let changed = if deduct { -requested } else { requested };
    let mut items = points.lock().unwrap();
    let before = items
        .iter()
        .filter(|item| item["mb_id"].as_str() == Some(member_id))
        .filter_map(|item| item["po_point"].as_i64())
        .sum::<i64>();
    let after = before + changed;
    let po_id = items
        .iter()
        .filter_map(|item| item["po_id"].as_i64())
        .max()
        .unwrap_or(0)
        + 1;
    let content = body["po_content"].as_str().unwrap_or(if deduct {
        "관리자 차감"
    } else {
        "관리자 지급"
    });
    items.push(serde_json::json!({
        "po_id": po_id,
        "mb_id": member_id,
        "po_point": changed,
        "po_datetime": "2026-08-18T00:00:00+00:00",
        "po_content": content,
        "po_use_point": 0,
        "po_expired": 0,
        "po_expire_date": "9999-12-31",
        "po_mb_point": after,
        "po_rel_table": "@passive",
        "po_rel_id": member_id,
        "po_rel_action": if deduct { "deduct" } else { "grant" }
    }));
    serde_json::json!({
        "data": {
            "mb_id": member_id,
            "before_point": before,
            "changed_point": changed,
            "after_point": after,
            "po_content": content,
            "processed_at": "2026-08-18T00:00:00+00:00"
        },
        "meta": {}
    })
}

fn mock_qa_config() -> Value {
    serde_json::json!({
        "qa_id": 1,
        "qa_title": "1:1 문의",
        "qa_category": "회원,결제",
        "qa_skin": "basic",
        "qa_mobile_skin": "basic",
        "qa_use_email": "1",
        "qa_req_email": "0",
        "qa_use_hp": "1",
        "qa_req_hp": "0",
        "qa_use_sms": "0",
        "qa_send_number": "",
        "qa_admin_hp": "",
        "qa_admin_email": "admin@example.test",
        "qa_use_editor": "1",
        "qa_subject_len": "40",
        "qa_mobile_subject_len": "30",
        "qa_page_rows": "15",
        "qa_mobile_page_rows": "10",
        "qa_image_width": "800",
        "qa_upload_size": "1048576",
        "qa_insert_content": "문의 내용을 입력하십시오.",
        "qa_include_head": "",
        "qa_include_tail": "",
        "qa_content_head": "",
        "qa_content_tail": "",
        "qa_mobile_content_head": "",
        "qa_mobile_content_tail": "",
        "qa_1_subj": "추가 항목 1",
        "qa_2_subj": "추가 항목 2",
        "qa_3_subj": "",
        "qa_4_subj": "",
        "qa_5_subj": "",
        "qa_1": "",
        "qa_2": "",
        "qa_3": "",
        "qa_4": "",
        "qa_5": ""
    })
}

fn mock_mail(ma_id: i64, subject: &str, content: &str) -> Value {
    serde_json::json!({
        "ma_id": ma_id,
        "ma_subject": subject,
        "ma_content": content,
        "ma_time": "2026-08-21 09:00:00",
        "ma_ip": "127.0.0.1",
        "ma_last_option": "",
        "last_option": {
            "mb_id1": 1,
            "mb_id1_from": "",
            "mb_id1_to": "",
            "mb_email": "",
            "mb_mailling": 1,
            "mb_level_from": 1,
            "mb_level_to": 10,
            "gr_id": ""
        },
        "preview_html": content
    })
}

#[derive(Clone, Default)]
struct MockConnector {
    cf_10: Arc<Mutex<String>>,
    permissions: Arc<Mutex<Vec<Value>>>,
    auth_members: Arc<Mutex<Vec<Value>>>,
    members: Arc<Mutex<Vec<Value>>>,
    groups: Arc<Mutex<Vec<Value>>>,
    group_members: Arc<Mutex<Vec<Value>>>,
    boards: Arc<Mutex<Vec<Value>>>,
    contents: Arc<Mutex<Vec<Value>>>,
    faq_masters: Arc<Mutex<Vec<Value>>>,
    faqs: Arc<Mutex<Vec<Value>>>,
    menus: Arc<Mutex<Vec<Value>>>,
    layouts: Arc<Mutex<Vec<Value>>>,
    theme_config: Arc<Mutex<Value>>,
    themes: Arc<Mutex<Vec<Value>>>,
    polls: Arc<Mutex<Vec<Value>>>,
    popups: Arc<Mutex<Vec<Value>>>,
    popular: Arc<Mutex<Vec<Value>>>,
    visits: Arc<Mutex<Vec<Value>>>,
    reports: Arc<Mutex<Vec<Value>>>,
    qa_config: Arc<Mutex<Value>>,
    qa_ids: Arc<Mutex<Vec<i64>>>,
    mails: Arc<Mutex<Vec<Value>>>,
    external_mail_operations: Arc<Mutex<Vec<String>>>,
    points: Arc<Mutex<Vec<Value>>>,
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

    async fn admin_get_faq_master_image_content(
        &self,
        _base_url: &str,
        _request_id: &str,
        fm_id: i64,
        kind: &str,
    ) -> ConnectorResult<FaqImageContent> {
        assert_eq!(fm_id, 2);
        assert_eq!(kind, "header");
        Ok(FaqImageContent {
            bytes: vec![0x89, b'P', b'N', b'G', 0x0d, 0x0a, 0x1a, 0x0a],
        })
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
            "adminListBoards" => serde_json::json!({
                "data": self.boards.lock().unwrap().clone(),
                "pagination": {
                    "mode": "page", "total": self.boards.lock().unwrap().len(),
                    "page": 1, "per_page": 20, "last_page": 1,
                    "cursor": null, "next_cursor": null, "has_next": false, "has_prev": false
                },
                "meta": {}
            }),
            "adminCreateBoard" => {
                let body = input.body.as_ref().unwrap();
                let board = serde_json::json!({
                    "bo_table": body["bo_table"], "bo_subject": body["bo_subject"],
                    "gr_id": body["gr_id"],
                    "bo_use_category": body.get("bo_use_category").cloned().unwrap_or(serde_json::json!(false)),
                    "bo_category_list": body.get("bo_category_list").cloned().unwrap_or(serde_json::json!("")),
                    "bo_read_level": body.get("bo_read_level").cloned().unwrap_or(serde_json::json!(1)),
                    "bo_write_level": body.get("bo_write_level").cloned().unwrap_or(serde_json::json!(2)),
                    "bo_comment_level": body.get("bo_comment_level").cloned().unwrap_or(serde_json::json!(2)),
                    "bo_download_level": body.get("bo_download_level").cloned().unwrap_or(serde_json::json!(2)),
                    "bo_use_secret": body.get("bo_use_secret").cloned().unwrap_or(serde_json::json!(0)),
                    "bo_upload_count": body.get("bo_upload_count").cloned().unwrap_or(serde_json::json!(2)),
                    "bo_upload_size": body.get("bo_upload_size").cloned().unwrap_or(serde_json::json!(1048576)),
                    "bo_count_write": 0, "bo_count_comment": 0
                });
                self.boards.lock().unwrap().push(board.clone());
                serde_json::json!({"data": board, "meta": {}})
            }
            "adminGetBoard" => {
                let bo_table = input.path.get("bo_table").map(String::as_str);
                let board = self
                    .boards
                    .lock()
                    .unwrap()
                    .iter()
                    .find(|item| item["bo_table"].as_str() == bo_table)
                    .cloned()
                    .unwrap();
                serde_json::json!({"data": board, "meta": {}})
            }
            "adminUpdateBoard" => {
                let bo_table = input.path.get("bo_table").map(String::as_str);
                let mut boards = self.boards.lock().unwrap();
                let board = boards
                    .iter_mut()
                    .find(|item| item["bo_table"].as_str() == bo_table)
                    .unwrap();
                for (name, value) in input.body.as_ref().unwrap().as_object().unwrap() {
                    board[name] = value.clone();
                }
                serde_json::json!({"data": board.clone(), "meta": {}})
            }
            "adminCopyBoard" => {
                let source_table = input.path.get("bo_table").map(String::as_str);
                let source = self
                    .boards
                    .lock()
                    .unwrap()
                    .iter()
                    .find(|item| item["bo_table"].as_str() == source_table)
                    .cloned()
                    .unwrap();
                let body = input.body.as_ref().unwrap();
                let mut copied = source;
                copied["bo_table"] = body["target_bo_table"].clone();
                if let Some(subject) = body.get("target_bo_subject") {
                    copied["bo_subject"] = subject.clone();
                }
                copied["bo_count_write"] = serde_json::json!(0);
                copied["bo_count_comment"] = serde_json::json!(0);
                self.boards.lock().unwrap().push(copied.clone());
                serde_json::json!({"data": copied, "meta": {}})
            }
            "adminDeleteBoard" => {
                let bo_table = input.path.get("bo_table").map(String::as_str);
                self.boards
                    .lock()
                    .unwrap()
                    .retain(|item| item["bo_table"].as_str() != bo_table);
                Value::Null
            }
            "adminDeleteNewPosts" => {
                let ids = input.body.as_ref().unwrap()["bn_ids"].clone();
                serde_json::json!({"data": {
                    "deleted": true, "deleted_count": ids.as_array().unwrap().len(),
                    "deleted_posts": ids.as_array().unwrap().len(), "deleted_comments": 0,
                    "skipped": 0, "bn_ids": ids
                }, "meta": {}})
            }
            "adminListContents" => serde_json::json!({
                "data": self.contents.lock().unwrap().clone(),
                "pagination": {
                    "mode": "page", "total": self.contents.lock().unwrap().len(),
                    "page": 1, "per_page": 20, "last_page": 1,
                    "cursor": null, "next_cursor": null, "has_next": false, "has_prev": false
                },
                "meta": {}
            }),
            "adminCreateContent" => {
                let body = input.body.as_ref().unwrap();
                let content = serde_json::json!({
                    "co_id": body["co_id"],
                    "co_subject": body["co_subject"],
                    "co_html": body.get("co_html").cloned().unwrap_or(serde_json::json!(0)),
                    "co_content": body["co_content"],
                    "co_mobile_content": body.get("co_mobile_content").cloned().unwrap_or(serde_json::json!("")),
                    "co_include_head": body.get("co_include_head").cloned().unwrap_or(serde_json::json!("")),
                    "co_include_tail": body.get("co_include_tail").cloned().unwrap_or(serde_json::json!("")),
                    "co_tag_filter_use": body.get("co_tag_filter_use").cloned().unwrap_or(serde_json::json!(1)),
                    "co_skin": body.get("co_skin").cloned().unwrap_or(serde_json::json!("")),
                    "co_mobile_skin": body.get("co_mobile_skin").cloned().unwrap_or(serde_json::json!(""))
                });
                self.contents.lock().unwrap().push(content.clone());
                serde_json::json!({"data": content, "meta": {}})
            }
            "adminGetContent" => {
                let co_id = input.path.get("co_id").map(String::as_str);
                let content = self
                    .contents
                    .lock()
                    .unwrap()
                    .iter()
                    .find(|item| item["co_id"].as_str() == co_id)
                    .cloned()
                    .unwrap();
                serde_json::json!({"data": content, "meta": {}})
            }
            "adminUpdateContent" => {
                let co_id = input.path.get("co_id").map(String::as_str);
                let mut contents = self.contents.lock().unwrap();
                let content = contents
                    .iter_mut()
                    .find(|item| item["co_id"].as_str() == co_id)
                    .unwrap();
                for (name, value) in input.body.as_ref().unwrap().as_object().unwrap() {
                    content[name] = value.clone();
                }
                serde_json::json!({"data": content.clone(), "meta": {}})
            }
            "adminDeleteContent" => {
                let co_id = input.path.get("co_id").map(String::as_str);
                self.contents
                    .lock()
                    .unwrap()
                    .retain(|item| item["co_id"].as_str() != co_id);
                Value::Null
            }
            "adminListFaqMasters" => serde_json::json!({
                "data": self.faq_masters.lock().unwrap().clone(),
                "pagination": {
                    "mode": "page", "total": self.faq_masters.lock().unwrap().len(),
                    "page": 1, "per_page": 20, "last_page": 1,
                    "cursor": null, "next_cursor": null, "has_next": false, "has_prev": false
                },
                "meta": {}
            }),
            "adminCreateFaqMaster" => {
                let body = input.body.as_ref().unwrap();
                let fm_id = self.faq_masters.lock().unwrap().len() as i64 + 1;
                let image = serde_json::json!({
                    "exists": false, "relative_path": "", "url": "", "width": null,
                    "height": null, "mime": null, "size": null
                });
                let master = serde_json::json!({
                    "fm_id": fm_id,
                    "fm_subject": body["fm_subject"],
                    "fm_head_html": body.get("fm_head_html").cloned().unwrap_or(serde_json::json!("")),
                    "fm_tail_html": body.get("fm_tail_html").cloned().unwrap_or(serde_json::json!("")),
                    "fm_mobile_head_html": body.get("fm_mobile_head_html").cloned().unwrap_or(serde_json::json!("")),
                    "fm_mobile_tail_html": body.get("fm_mobile_tail_html").cloned().unwrap_or(serde_json::json!("")),
                    "fm_order": body.get("fm_order").cloned().unwrap_or(serde_json::json!(0)),
                    "faq_count": 0,
                    "header_image": image.clone(),
                    "footer_image": image
                });
                self.faq_masters.lock().unwrap().push(master.clone());
                serde_json::json!({"data": master, "meta": {}})
            }
            "adminGetFaqMaster" => {
                let fm_id = input.path.get("fm_id").unwrap().parse::<i64>().unwrap();
                let master = self
                    .faq_masters
                    .lock()
                    .unwrap()
                    .iter()
                    .find(|item| item["fm_id"].as_i64() == Some(fm_id))
                    .cloned()
                    .unwrap();
                serde_json::json!({"data": master, "meta": {}})
            }
            "adminUpdateFaqMaster" => {
                let fm_id = input.path.get("fm_id").unwrap().parse::<i64>().unwrap();
                let mut masters = self.faq_masters.lock().unwrap();
                let master = masters
                    .iter_mut()
                    .find(|item| item["fm_id"].as_i64() == Some(fm_id))
                    .unwrap();
                for (name, value) in input.body.as_ref().unwrap().as_object().unwrap() {
                    master[name] = value.clone();
                }
                serde_json::json!({"data": master.clone(), "meta": {}})
            }
            "adminDeleteFaqMaster" => {
                let fm_id = input.path.get("fm_id").unwrap().parse::<i64>().unwrap();
                self.faq_masters
                    .lock()
                    .unwrap()
                    .retain(|item| item["fm_id"].as_i64() != Some(fm_id));
                self.faqs
                    .lock()
                    .unwrap()
                    .retain(|item| item["fm_id"].as_i64() != Some(fm_id));
                Value::Null
            }
            "adminUploadFaqMasterHeaderImage" | "adminUploadFaqMasterFooterImage" => {
                let fm_id = input.path.get("fm_id").unwrap().parse::<i64>().unwrap();
                let header = operation_id.contains("Header");
                let image = serde_json::json!({
                    "exists": true,
                    "relative_path": if header { format!("faq/{fm_id}_h") } else { format!("faq/{fm_id}_t") },
                    "url": if header { format!("/data/faq/{fm_id}_h") } else { format!("/data/faq/{fm_id}_t") },
                    "width": 32, "height": 32, "mime": "image/png", "size": 4
                });
                let mut masters = self.faq_masters.lock().unwrap();
                let master = masters
                    .iter_mut()
                    .find(|item| item["fm_id"].as_i64() == Some(fm_id))
                    .unwrap();
                master[if header {
                    "header_image"
                } else {
                    "footer_image"
                }] = image.clone();
                serde_json::json!({"data": image, "meta": {}})
            }
            "adminDeleteFaqMasterHeaderImage" | "adminDeleteFaqMasterFooterImage" => {
                let fm_id = input.path.get("fm_id").unwrap().parse::<i64>().unwrap();
                let header = operation_id.contains("Header");
                let image = serde_json::json!({
                    "exists": false, "relative_path": "", "url": "", "width": null,
                    "height": null, "mime": null, "size": null
                });
                let mut masters = self.faq_masters.lock().unwrap();
                let master = masters
                    .iter_mut()
                    .find(|item| item["fm_id"].as_i64() == Some(fm_id))
                    .unwrap();
                master[if header {
                    "header_image"
                } else {
                    "footer_image"
                }] = image.clone();
                serde_json::json!({"data": image, "meta": {}})
            }
            "adminListFaqs" => {
                let fm_id = input.query.get("fm_id").and_then(Value::as_i64);
                let items = self
                    .faqs
                    .lock()
                    .unwrap()
                    .iter()
                    .filter(|item| fm_id.is_none_or(|id| item["fm_id"].as_i64() == Some(id)))
                    .cloned()
                    .collect::<Vec<_>>();
                serde_json::json!({
                    "data": items,
                    "pagination": {
                        "mode": "page", "total": items.len(), "page": 1, "per_page": 20,
                        "last_page": 1, "cursor": null, "next_cursor": null,
                        "has_next": false, "has_prev": false
                    },
                    "meta": {}
                })
            }
            "adminCreateFaq" => {
                let body = input.body.as_ref().unwrap();
                let fa_id = self.faqs.lock().unwrap().len() as i64 + 1;
                let fm_id = body["fm_id"].as_i64().unwrap();
                let fm_subject = self
                    .faq_masters
                    .lock()
                    .unwrap()
                    .iter()
                    .find(|item| item["fm_id"].as_i64() == Some(fm_id))
                    .and_then(|item| item["fm_subject"].as_str())
                    .unwrap()
                    .to_owned();
                let faq = serde_json::json!({
                    "fa_id": fa_id, "fm_id": fm_id, "fm_subject": fm_subject,
                    "fa_subject": body["fa_subject"], "fa_content": body["fa_content"],
                    "fa_order": body.get("fa_order").cloned().unwrap_or(serde_json::json!(0))
                });
                self.faqs.lock().unwrap().push(faq.clone());
                serde_json::json!({"data": faq, "meta": {}})
            }
            "adminGetFaq" => {
                let fa_id = input.path.get("fa_id").unwrap().parse::<i64>().unwrap();
                let faq = self
                    .faqs
                    .lock()
                    .unwrap()
                    .iter()
                    .find(|item| item["fa_id"].as_i64() == Some(fa_id))
                    .cloned()
                    .unwrap();
                serde_json::json!({"data": faq, "meta": {}})
            }
            "adminUpdateFaq" => {
                let fa_id = input.path.get("fa_id").unwrap().parse::<i64>().unwrap();
                let mut faqs = self.faqs.lock().unwrap();
                let faq = faqs
                    .iter_mut()
                    .find(|item| item["fa_id"].as_i64() == Some(fa_id))
                    .unwrap();
                for (name, value) in input.body.as_ref().unwrap().as_object().unwrap() {
                    faq[name] = value.clone();
                }
                serde_json::json!({"data": faq.clone(), "meta": {}})
            }
            "adminDeleteFaq" => {
                let fa_id = input.path.get("fa_id").unwrap().parse::<i64>().unwrap();
                self.faqs
                    .lock()
                    .unwrap()
                    .retain(|item| item["fa_id"].as_i64() != Some(fa_id));
                Value::Null
            }
            "adminListMenus" => serde_json::json!({
                "data": self.menus.lock().unwrap().clone(),
                "pagination": {
                    "mode": "page", "total": self.menus.lock().unwrap().len(),
                    "page": 1, "per_page": 100, "last_page": 1,
                    "cursor": null, "next_cursor": null, "has_next": false, "has_prev": false
                },
                "meta": {}
            }),
            "adminCreateMenu" => {
                let body = input.body.as_ref().unwrap();
                let menu = serde_json::json!({
                    "me_id": self.menus.lock().unwrap().len() as i64 + 1,
                    "me_code": body["me_code"], "me_name": body["me_name"],
                    "me_link": body["me_link"],
                    "me_target": body.get("me_target").cloned().unwrap_or(serde_json::json!("_self")),
                    "me_order": body.get("me_order").cloned().unwrap_or(serde_json::json!(0)),
                    "me_use": body.get("me_use").cloned().unwrap_or(serde_json::json!(1)),
                    "me_mobile_use": body.get("me_mobile_use").cloned().unwrap_or(serde_json::json!(1))
                });
                self.menus.lock().unwrap().push(menu.clone());
                serde_json::json!({"data": menu, "meta": {}})
            }
            "adminGetMenu" => {
                let me_id = input.path.get("me_id").unwrap().parse::<i64>().unwrap();
                let menu = self
                    .menus
                    .lock()
                    .unwrap()
                    .iter()
                    .find(|item| item["me_id"].as_i64() == Some(me_id))
                    .cloned()
                    .unwrap();
                serde_json::json!({"data": menu, "meta": {}})
            }
            "adminUpdateMenu" => {
                let me_id = input.path.get("me_id").unwrap().parse::<i64>().unwrap();
                let mut menus = self.menus.lock().unwrap();
                let menu = menus
                    .iter_mut()
                    .find(|item| item["me_id"].as_i64() == Some(me_id))
                    .unwrap();
                for (name, value) in input.body.as_ref().unwrap().as_object().unwrap() {
                    menu[name] = value.clone();
                }
                serde_json::json!({"data": menu.clone(), "meta": {}})
            }
            "adminDeleteMenu" => {
                let me_id = input.path.get("me_id").unwrap().parse::<i64>().unwrap();
                self.menus
                    .lock()
                    .unwrap()
                    .retain(|item| item["me_id"].as_i64() != Some(me_id));
                Value::Null
            }
            "adminReorderMenus" | "adminReorderMenusLegacy" => {
                let orders = input.body.as_ref().unwrap()["orders"].as_array().unwrap();
                let mut menus = self.menus.lock().unwrap();
                for order in orders {
                    if let Some(menu) = menus
                        .iter_mut()
                        .find(|item| item["me_id"] == order["me_id"])
                    {
                        menu["me_order"] = order["me_order"].clone();
                    }
                }
                serde_json::json!({"data": {"result": "ok"}, "meta": {}})
            }
            "adminListLayouts" => serde_json::json!({
                "data": self.layouts.lock().unwrap().clone(),
                "pagination": {
                    "mode": "page", "total": self.layouts.lock().unwrap().len(),
                    "page": 1, "per_page": 20, "last_page": 1,
                    "cursor": null, "next_cursor": null, "has_next": false, "has_prev": false
                },
                "meta": {}
            }),
            "adminGetLayout" => {
                let page_id = input.path.get("page_id").map(String::as_str);
                let layout = self
                    .layouts
                    .lock()
                    .unwrap()
                    .iter()
                    .find(|item| item["sl_page_id"].as_str() == page_id)
                    .cloned()
                    .unwrap();
                serde_json::json!({"data": layout, "meta": {}})
            }
            "adminSaveLayout" => {
                let page_id = input.path.get("page_id").unwrap();
                let body = input.body.as_ref().unwrap();
                let widgets = body["widgets"].clone();
                let schema = serde_json::json!({"widgets": widgets}).to_string();
                let mut layouts = self.layouts.lock().unwrap();
                if let Some(layout) = layouts
                    .iter_mut()
                    .find(|item| item["sl_page_id"].as_str() == Some(page_id))
                {
                    layout["sl_title"] = body
                        .get("title")
                        .cloned()
                        .unwrap_or_else(|| serde_json::json!(page_id));
                    layout["widgets"] = widgets;
                    layout["sl_schema"] = serde_json::json!(schema);
                    layout["sl_updated"] = serde_json::json!("2026-08-18 00:01:00");
                    serde_json::json!({"data": layout.clone(), "meta": {}})
                } else {
                    let layout = serde_json::json!({
                        "sl_id": layouts.len() as i64 + 1,
                        "sl_page_id": page_id,
                        "sl_title": body.get("title").cloned().unwrap_or_else(|| serde_json::json!(page_id)),
                        "sl_schema": schema,
                        "sl_active": 1,
                        "sl_datetime": "2026-08-18 00:00:00",
                        "sl_updated": "2026-08-18 00:00:00",
                        "widgets": widgets
                    });
                    layouts.push(layout.clone());
                    serde_json::json!({"data": layout, "meta": {}})
                }
            }
            "adminAddWidget" => {
                let page_id = input.path.get("page_id").map(String::as_str);
                let body = input.body.as_ref().unwrap();
                let mut layouts = self.layouts.lock().unwrap();
                let layout = layouts
                    .iter_mut()
                    .find(|item| item["sl_page_id"].as_str() == page_id)
                    .unwrap();
                let widget_count = layout["widgets"].as_array().unwrap().len();
                let widget = serde_json::json!({
                    "widget_id": body.get("widget_id").cloned().unwrap_or_else(|| serde_json::json!(format!("widget-{}", widget_count + 1))),
                    "type": body["type"],
                    "title": body.get("title").cloned().unwrap_or_else(|| serde_json::json!("")),
                    "order": body.get("order").cloned().unwrap_or_else(|| serde_json::json!(widget_count + 1)),
                    "config": body.get("config").cloned().unwrap_or_else(|| serde_json::json!({})),
                    "style": body.get("style").cloned().unwrap_or_else(|| serde_json::json!({}))
                });
                layout["widgets"].as_array_mut().unwrap().push(widget);
                layout["sl_schema"] = serde_json::json!(
                    serde_json::json!({"widgets": layout["widgets"].clone()}).to_string()
                );
                serde_json::json!({"data": layout.clone(), "meta": {}})
            }
            "adminUpdateWidget" => {
                let page_id = input.path.get("page_id").map(String::as_str);
                let widget_id = input.path.get("widget_id").map(String::as_str);
                let body = input.body.as_ref().unwrap();
                let mut layouts = self.layouts.lock().unwrap();
                let layout = layouts
                    .iter_mut()
                    .find(|item| item["sl_page_id"].as_str() == page_id)
                    .unwrap();
                let widget = layout["widgets"]
                    .as_array_mut()
                    .unwrap()
                    .iter_mut()
                    .find(|item| item["widget_id"].as_str() == widget_id)
                    .unwrap();
                for (name, value) in body.as_object().unwrap() {
                    widget[name] = value.clone();
                }
                layout["sl_schema"] = serde_json::json!(
                    serde_json::json!({"widgets": layout["widgets"].clone()}).to_string()
                );
                serde_json::json!({"data": layout.clone(), "meta": {}})
            }
            "adminDeleteWidget" => {
                let page_id = input.path.get("page_id").map(String::as_str);
                let widget_id = input.path.get("widget_id").map(String::as_str);
                let mut layouts = self.layouts.lock().unwrap();
                let layout = layouts
                    .iter_mut()
                    .find(|item| item["sl_page_id"].as_str() == page_id)
                    .unwrap();
                layout["widgets"]
                    .as_array_mut()
                    .unwrap()
                    .retain(|item| item["widget_id"].as_str() != widget_id);
                layout["sl_schema"] = serde_json::json!(
                    serde_json::json!({"widgets": layout["widgets"].clone()}).to_string()
                );
                serde_json::json!({"data": layout.clone(), "meta": {}})
            }
            "adminReorderWidgetCollection" | "adminReorderWidget" => {
                let page_id = input.path.get("page_id").map(String::as_str);
                let widget_ids = input.body.as_ref().unwrap()["widget_ids"]
                    .as_array()
                    .unwrap();
                let mut layouts = self.layouts.lock().unwrap();
                let layout = layouts
                    .iter_mut()
                    .find(|item| item["sl_page_id"].as_str() == page_id)
                    .unwrap();
                let widgets = layout["widgets"].as_array().unwrap().clone();
                let mut ordered = Vec::new();
                for (index, widget_id) in widget_ids.iter().enumerate() {
                    let mut widget = widgets
                        .iter()
                        .find(|item| item["widget_id"] == *widget_id)
                        .cloned()
                        .unwrap();
                    widget["order"] = serde_json::json!(index + 1);
                    ordered.push(widget);
                }
                layout["widgets"] = serde_json::json!(ordered);
                layout["sl_schema"] = serde_json::json!(
                    serde_json::json!({"widgets": layout["widgets"].clone()}).to_string()
                );
                serde_json::json!({"data": layout.clone(), "meta": {}})
            }
            "adminSystemGetTheme" => serde_json::json!({
                "data": self.theme_config.lock().unwrap().clone(),
                "meta": {}
            }),
            "adminSystemUpdateTheme" => {
                let body = input.body.as_ref().unwrap();
                let mut config = self.theme_config.lock().unwrap();
                for (name, value) in body.as_object().unwrap() {
                    config[name] = value.clone();
                }
                let active = config["cf_theme"].as_str().unwrap_or_default().to_owned();
                let mobile = config["cf_mobile_theme"]
                    .as_str()
                    .unwrap_or_default()
                    .to_owned();
                for theme in self.themes.lock().unwrap().iter_mut() {
                    theme["is_active"] =
                        serde_json::json!(theme["id"].as_str() == Some(active.as_str()));
                    theme["is_mobile_active"] =
                        serde_json::json!(theme["id"].as_str() == Some(mobile.as_str()));
                }
                serde_json::json!({"data": config.clone(), "meta": {}})
            }
            "adminSystemListThemes" => serde_json::json!({
                "data": self.themes.lock().unwrap().clone(),
                "meta": {"total": self.themes.lock().unwrap().len()}
            }),
            "adminSystemDetailTheme" => {
                let theme_id = input.path.get("theme").map(String::as_str);
                let theme = self
                    .themes
                    .lock()
                    .unwrap()
                    .iter()
                    .find(|item| item["id"].as_str() == theme_id)
                    .cloned()
                    .unwrap();
                serde_json::json!({"data": theme, "meta": {}})
            }
            "adminSystemListPolls" | "adminListPolls" => {
                let polls = self.polls.lock().unwrap().clone();
                serde_json::json!({
                    "data": polls,
                    "pagination": {
                        "mode": "page", "total": polls.len(), "page": 1, "per_page": 20,
                        "last_page": 1, "cursor": null, "next_cursor": null,
                        "has_next": false, "has_prev": false
                    },
                    "meta": {}
                })
            }
            "adminSystemCreatePoll" | "adminCreatePoll" => {
                let body = input.body.as_ref().unwrap();
                let po_id = self.polls.lock().unwrap().len() as i64 + 1;
                let poll = mock_poll(po_id, body);
                self.polls.lock().unwrap().push(poll.clone());
                serde_json::json!({"data": poll, "meta": {}})
            }
            "adminSystemGetPoll" | "adminGetPoll" => {
                let po_id = input
                    .path
                    .get("po_id")
                    .and_then(|value| value.parse::<i64>().ok());
                let poll = self
                    .polls
                    .lock()
                    .unwrap()
                    .iter()
                    .find(|item| item["po_id"].as_i64() == po_id)
                    .cloned()
                    .unwrap();
                serde_json::json!({"data": poll, "meta": {}})
            }
            "adminSystemUpdatePoll" | "adminUpdatePoll" => {
                let po_id = input
                    .path
                    .get("po_id")
                    .and_then(|value| value.parse::<i64>().ok());
                let mut polls = self.polls.lock().unwrap();
                let poll = polls
                    .iter_mut()
                    .find(|item| item["po_id"].as_i64() == po_id)
                    .unwrap();
                for (name, value) in input.body.as_ref().unwrap().as_object().unwrap() {
                    poll[name] = value.clone();
                }
                serde_json::json!({"data": poll.clone(), "meta": {}})
            }
            "adminSystemDeletePoll" | "adminDeletePoll" => {
                let po_id = input
                    .path
                    .get("po_id")
                    .and_then(|value| value.parse::<i64>().ok());
                self.polls
                    .lock()
                    .unwrap()
                    .retain(|item| item["po_id"].as_i64() != po_id);
                Value::Null
            }
            "adminSystemListPopups" | "adminListPopups" => {
                let popups = self.popups.lock().unwrap().clone();
                serde_json::json!({
                    "data": popups,
                    "pagination": {
                        "mode": "page", "total": popups.len(), "page": 1, "per_page": 20,
                        "last_page": 1, "cursor": null, "next_cursor": null,
                        "has_next": false, "has_prev": false
                    },
                    "meta": {}
                })
            }
            "adminSystemCreatePopup" | "adminCreatePopup" => {
                let body = input.body.as_ref().unwrap();
                let nw_id = self.popups.lock().unwrap().len() as i64 + 1;
                let popup = mock_popup(nw_id, body);
                self.popups.lock().unwrap().push(popup.clone());
                serde_json::json!({"data": popup, "meta": {}})
            }
            "adminSystemGetPopup" | "adminGetPopup" => {
                let nw_id = input
                    .path
                    .get("nw_id")
                    .and_then(|value| value.parse::<i64>().ok());
                let popup = self
                    .popups
                    .lock()
                    .unwrap()
                    .iter()
                    .find(|item| item["nw_id"].as_i64() == nw_id)
                    .cloned()
                    .unwrap();
                serde_json::json!({"data": popup, "meta": {}})
            }
            "adminSystemUpdatePopup" | "adminUpdatePopup" => {
                let nw_id = input
                    .path
                    .get("nw_id")
                    .and_then(|value| value.parse::<i64>().ok());
                let mut popups = self.popups.lock().unwrap();
                let popup = popups
                    .iter_mut()
                    .find(|item| item["nw_id"].as_i64() == nw_id)
                    .unwrap();
                for (name, value) in input.body.as_ref().unwrap().as_object().unwrap() {
                    popup[name] = value.clone();
                }
                serde_json::json!({"data": popup.clone(), "meta": {}})
            }
            "adminSystemDeletePopup" | "adminDeletePopup" => {
                let nw_id = input
                    .path
                    .get("nw_id")
                    .and_then(|value| value.parse::<i64>().ok());
                self.popups
                    .lock()
                    .unwrap()
                    .retain(|item| item["nw_id"].as_i64() != nw_id);
                Value::Null
            }
            "adminListPopular" => {
                let date_from = input.query.get("date_from").and_then(Value::as_str);
                let date_to = input.query.get("date_to").and_then(Value::as_str);
                let items = self
                    .popular
                    .lock()
                    .unwrap()
                    .iter()
                    .filter(|item| {
                        let date = item["pp_date"].as_str().unwrap_or_default();
                        date_from.is_none_or(|from| date >= from)
                            && date_to.is_none_or(|to| date <= to)
                    })
                    .cloned()
                    .collect::<Vec<_>>();
                serde_json::json!({
                    "data": items,
                    "pagination": {
                        "mode": "page", "total": items.len(), "page": 1, "per_page": 20,
                        "last_page": 1, "cursor": null, "next_cursor": null,
                        "has_next": false, "has_prev": false
                    },
                    "meta": {}
                })
            }
            "adminPopularRank" => {
                let limit = input
                    .query
                    .get("limit")
                    .and_then(Value::as_u64)
                    .unwrap_or(20) as usize;
                let ranks = self
                    .popular
                    .lock()
                    .unwrap()
                    .iter()
                    .take(limit)
                    .enumerate()
                    .map(|(index, item)| {
                        serde_json::json!({
                            "rank": index + 1,
                            "pp_word": item["pp_word"],
                            "hit_count": item["pp_cnt"],
                            "first_date": item["pp_date"],
                            "last_date": item["pp_date"]
                        })
                    })
                    .collect::<Vec<_>>();
                serde_json::json!({
                    "data": ranks,
                    "pagination": {
                        "mode": "page", "total": ranks.len(), "page": 1,
                        "per_page": ranks.len(), "last_page": 1, "cursor": null,
                        "next_cursor": null, "has_next": false, "has_prev": false
                    },
                    "meta": {}
                })
            }
            "adminResetPopular" => {
                assert!(input.confirm_destructive);
                let body = input.body.as_ref().unwrap();
                let date_from = body.get("date_from").and_then(Value::as_str);
                let date_to = body.get("date_to").and_then(Value::as_str);
                let mut items = self.popular.lock().unwrap();
                let before = items.len();
                items.retain(|item| {
                    let date = item["pp_date"].as_str().unwrap_or_default();
                    !(date_from.is_none_or(|from| date >= from)
                        && date_to.is_none_or(|to| date <= to))
                });
                serde_json::json!({
                    "data": {
                        "deleted_rows": before - items.len(),
                        "date_from": date_from,
                        "date_to": date_to
                    },
                    "meta": {}
                })
            }
            "adminVisitStats" => {
                let stats_type = input
                    .query
                    .get("type")
                    .and_then(Value::as_str)
                    .unwrap_or("date");
                let visits = self.visits.lock().unwrap();
                let mut counts = std::collections::BTreeMap::<String, i64>::new();
                for visit in visits.iter() {
                    let key = match stats_type {
                        "device" => visit["vi_device"].as_str().unwrap_or_default(),
                        "browser" => visit["vi_browser"].as_str().unwrap_or_default(),
                        "os" => visit["vi_os"].as_str().unwrap_or_default(),
                        _ => visit["vi_date"].as_str().unwrap_or_default(),
                    };
                    *counts.entry(key.to_owned()).or_default() += 1;
                }
                serde_json::json!({"data": {
                    "type": stats_type,
                    "summary": {"total_visits": visits.len(), "active_days": 2, "first_date": "2026-08-18", "last_date": "2026-08-19", "visit_rows": visits.len(), "unique_ips": visits.len()},
                    "items": counts.into_iter().map(|(stat_key, visit_count)| serde_json::json!({"stat_key": stat_key, "visit_count": visit_count})).collect::<Vec<_>>()
                }, "meta": {}})
            }
            "adminSearchVisits" => {
                let ip = input.query.get("ip").and_then(Value::as_str);
                let date_from = input.query.get("date_from").and_then(Value::as_str);
                let date_to = input.query.get("date_to").and_then(Value::as_str);
                let visits = self
                    .visits
                    .lock()
                    .unwrap()
                    .iter()
                    .filter(|visit| {
                        let date = visit["vi_date"].as_str().unwrap_or_default();
                        ip.is_none_or(|value| {
                            visit["vi_ip"]
                                .as_str()
                                .is_some_and(|candidate| candidate.contains(value))
                        }) && date_from.is_none_or(|value| date >= value)
                            && date_to.is_none_or(|value| date <= value)
                    })
                    .cloned()
                    .collect::<Vec<_>>();
                serde_json::json!({"data": visits, "pagination": {
                    "mode": "page", "total": visits.len(), "page": 1, "per_page": 50,
                    "last_page": 1, "cursor": null, "next_cursor": null,
                    "has_next": false, "has_prev": false
                }, "meta": {}})
            }
            "adminDeleteVisits" => {
                assert!(input.confirm_destructive);
                let body = input.body.as_ref().unwrap();
                let before_date = body.get("before").and_then(Value::as_str);
                let date_from = body.get("date_from").and_then(Value::as_str);
                let date_to = body.get("date_to").and_then(Value::as_str);
                let ip = body.get("ip").and_then(Value::as_str);
                let mut visits = self.visits.lock().unwrap();
                let prior = visits.len();
                visits.retain(|visit| {
                    let date = visit["vi_date"].as_str().unwrap_or_default();
                    let matches = if let Some(cutoff) = before_date {
                        date < cutoff
                    } else {
                        date_from.is_none_or(|value| date >= value)
                            && date_to.is_none_or(|value| date <= value)
                            && ip.is_none_or(|value| visit["vi_ip"].as_str() == Some(value))
                    };
                    !matches
                });
                serde_json::json!({"data": {"deleted_rows": prior - visits.len(), "before": before_date, "date_from": date_from, "date_to": date_to, "ip": ip}, "meta": {}})
            }
            "adminListReports" => {
                let status = input.query.get("status").and_then(Value::as_str);
                let target_type = input.query.get("target_type").and_then(Value::as_str);
                let reports = self
                    .reports
                    .lock()
                    .unwrap()
                    .iter()
                    .filter(|report| {
                        status.is_none_or(|value| report["rp_status"].as_str() == Some(value))
                            && target_type.is_none_or(|value| {
                                report["rp_target_type"].as_str() == Some(value)
                            })
                    })
                    .cloned()
                    .collect::<Vec<_>>();
                serde_json::json!({"data": reports, "pagination": {
                    "mode": "page", "total": reports.len(), "page": 1, "per_page": 20,
                    "last_page": 1, "cursor": null, "next_cursor": null,
                    "has_next": false, "has_prev": false
                }, "meta": {}})
            }
            "adminReportStats" => {
                let reports = self.reports.lock().unwrap();
                let count = |status: &str| {
                    reports
                        .iter()
                        .filter(|report| report["rp_status"].as_str() == Some(status))
                        .count()
                };
                serde_json::json!({"data": {
                    "pending": count("pending"), "approved": count("approved"),
                    "rejected": count("rejected"), "hold": count("hold"),
                    "total": reports.len()
                }, "meta": {}})
            }
            "adminUpdateReport" => {
                let report_id = input.path["report_id"].parse::<i64>().unwrap();
                let body = input.body.as_ref().unwrap();
                let mut reports = self.reports.lock().unwrap();
                let report = reports
                    .iter_mut()
                    .find(|report| report["rp_id"].as_i64() == Some(report_id))
                    .unwrap();
                report["rp_status"] = body["status"].clone();
                report["rp_admin_memo"] = body.get("admin_memo").cloned().unwrap_or(Value::Null);
                report["rp_processed_at"] = serde_json::json!("2026-08-20 12:00:00");
                serde_json::json!({"data": report.clone(), "meta": {}})
            }
            "adminSystemGetQaConfig" => {
                serde_json::json!({"data": self.qa_config.lock().unwrap().clone(), "meta": {}})
            }
            "adminSystemUpdateQaConfig" => {
                let body = input.body.as_ref().unwrap().as_object().unwrap();
                let mut config = self.qa_config.lock().unwrap();
                let config_fields = config.as_object_mut().unwrap();
                for (key, value) in body {
                    config_fields.insert(key.clone(), value.clone());
                }
                serde_json::json!({"data": config.clone(), "meta": {}})
            }
            "adminDeleteQaBulk" => {
                let requested = input.body.as_ref().unwrap()["qa_ids"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .filter_map(Value::as_i64)
                    .collect::<Vec<_>>();
                let mut qa_ids = self.qa_ids.lock().unwrap();
                let prior = qa_ids.len();
                qa_ids.retain(|qa_id| !requested.contains(qa_id));
                serde_json::json!({
                    "data": {"deleted_count": prior - qa_ids.len(), "qa_ids": requested},
                    "meta": {}
                })
            }
            "adminWriteCountStats" => {
                let period = input
                    .query
                    .get("period")
                    .and_then(Value::as_str)
                    .unwrap_or("day");
                let date_from = input
                    .query
                    .get("date_from")
                    .and_then(Value::as_str)
                    .unwrap_or("2026-08-01");
                let date_to = input
                    .query
                    .get("date_to")
                    .and_then(Value::as_str)
                    .unwrap_or("2026-08-21");
                let bo_table = input.query.get("bo_table").cloned().unwrap_or(Value::Null);
                serde_json::json!({
                    "data": {
                        "period": period,
                        "date_from": date_from,
                        "date_to": date_to,
                        "bo_table": bo_table,
                        "summary": {"write_total": 7, "comment_total": 3},
                        "items": [
                            {"bucket": "2026-W32", "write_count": 3, "comment_count": 1},
                            {"bucket": "2026-W33", "write_count": 4, "comment_count": 2}
                        ]
                    },
                    "meta": {}
                })
            }
            "adminListMails" | "adminSystemListMails" => {
                let mails = self.mails.lock().unwrap().clone();
                serde_json::json!({
                    "data": mails,
                    "pagination": {
                        "mode": "page", "total": mails.len(), "page": 1, "per_page": 20,
                        "last_page": 1, "cursor": null, "next_cursor": null,
                        "has_next": false, "has_prev": false
                    },
                    "meta": {}
                })
            }
            "adminCreateMailTemplate" => {
                let body = input.body.as_ref().unwrap();
                let ma_id = self.mails.lock().unwrap().len() as i64 + 51;
                let mail = mock_mail(
                    ma_id,
                    body["ma_subject"].as_str().unwrap(),
                    body["ma_content"].as_str().unwrap(),
                );
                self.mails.lock().unwrap().push(mail.clone());
                serde_json::json!({"data": mail, "meta": {}})
            }
            "adminListMailRecipients" => serde_json::json!({
                "data": [{
                    "mb_id": "member01", "mb_name": "회원 이름", "mb_nick": "회원 닉네임",
                    "mb_email": "member@example.test", "mb_level": 2, "mb_mailling": 1,
                    "mb_datetime": "2026-08-01 10:00:00"
                }],
                "pagination": {
                    "mode": "page", "total": 1, "page": 1, "per_page": 20,
                    "last_page": 1, "cursor": null, "next_cursor": null,
                    "has_next": false, "has_prev": false
                },
                "meta": {}
            }),
            "adminSystemListMailRecipients" => serde_json::json!({
                "data": [{
                    "mb_id": "member01", "mb_name": "회원 이름", "mb_nick": "회원 닉네임",
                    "mb_email": "member@example.test", "mb_level": 2, "mb_mailling": 1,
                    "mb_today_login": "2026-08-21 08:00:00"
                }],
                "pagination": {
                    "mode": "page", "total": 1, "page": 1, "per_page": 20,
                    "last_page": 1, "cursor": null, "next_cursor": null,
                    "has_next": false, "has_prev": false
                },
                "meta": {}
            }),
            "adminGetMail" => {
                let ma_id = input.path["ma_id"].parse::<i64>().unwrap();
                let mail = self
                    .mails
                    .lock()
                    .unwrap()
                    .iter()
                    .find(|mail| mail["ma_id"].as_i64() == Some(ma_id))
                    .cloned()
                    .unwrap();
                serde_json::json!({"data": mail, "meta": {}})
            }
            "adminUpdateMailTemplate" => {
                let ma_id = input.path["ma_id"].parse::<i64>().unwrap();
                let body = input.body.as_ref().unwrap();
                let mut mails = self.mails.lock().unwrap();
                let mail = mails
                    .iter_mut()
                    .find(|mail| mail["ma_id"].as_i64() == Some(ma_id))
                    .unwrap();
                mail["ma_subject"] = body["ma_subject"].clone();
                mail["ma_content"] = body["ma_content"].clone();
                mail["preview_html"] = body["ma_content"].clone();
                serde_json::json!({"data": mail.clone(), "meta": {}})
            }
            "adminDeleteMail" => {
                let ma_id = input.path["ma_id"].parse::<i64>().unwrap();
                self.mails
                    .lock()
                    .unwrap()
                    .retain(|mail| mail["ma_id"].as_i64() != Some(ma_id));
                Value::Null
            }
            "adminListPoints" => {
                let member_id = input.query.get("mb_id").and_then(Value::as_str);
                let items = self
                    .points
                    .lock()
                    .unwrap()
                    .iter()
                    .filter(|item| {
                        member_id.is_none_or(|value| item["mb_id"].as_str() == Some(value))
                    })
                    .cloned()
                    .collect::<Vec<_>>();
                serde_json::json!({
                    "data": items,
                    "pagination": {
                        "mode": "page", "total": items.len(), "page": 1, "per_page": 20,
                        "last_page": 1, "cursor": null, "next_cursor": null,
                        "has_next": false, "has_prev": false
                    },
                    "meta": {}
                })
            }
            "adminCreatePointAction" => {
                let body = input.body.as_ref().unwrap();
                match body["action"].as_str().unwrap() {
                    "grant" => mock_point_change(&self.points, body, false),
                    "deduct" => mock_point_change(&self.points, body, true),
                    "expire" => serde_json::json!({
                        "data": {"base_date": body.get("base_date").and_then(Value::as_str).unwrap_or("2026-08-18"), "expired_count": 0, "synced_members": 0},
                        "meta": {}
                    }),
                    _ => unreachable!(),
                }
            }
            "adminGrantPoint" => {
                mock_point_change(&self.points, input.body.as_ref().unwrap(), false)
            }
            "adminDeductPoint" => {
                mock_point_change(&self.points, input.body.as_ref().unwrap(), true)
            }
            "adminDeletePoints" => {
                let ids = input.body.as_ref().unwrap()["po_ids"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .filter_map(Value::as_i64)
                    .collect::<Vec<_>>();
                let mut items = self.points.lock().unwrap();
                let before = items.len();
                items.retain(|item| !ids.contains(&item["po_id"].as_i64().unwrap()));
                serde_json::json!({
                    "data": {"requested_count": ids.len(), "deleted_count": before - items.len()},
                    "meta": {}
                })
            }
            "adminPointSummary" => {
                let member_id = input.query.get("mb_id").and_then(Value::as_str);
                let items = self.points.lock().unwrap();
                let matching = items
                    .iter()
                    .filter(|item| {
                        member_id.is_none_or(|value| item["mb_id"].as_str() == Some(value))
                    })
                    .collect::<Vec<_>>();
                let total_point = matching
                    .iter()
                    .filter_map(|item| item["po_point"].as_i64())
                    .sum::<i64>();
                serde_json::json!({
                    "data": {"mb_id": member_id, "total_point": total_point, "total_rows": matching.len()},
                    "meta": {}
                })
            }
            "adminExpirePoints" => serde_json::json!({
                "data": {
                    "base_date": input.body.as_ref().and_then(|body| body.get("base_date")).and_then(Value::as_str).unwrap_or("2026-08-18"),
                    "expired_count": 0,
                    "synced_members": 0
                },
                "meta": {}
            }),
            "adminListBoardGroups" | "adminLegacyListGroups" => serde_json::json!({
                "data": self.groups.lock().unwrap().clone(),
                "pagination": {
                    "mode": "page",
                    "total": self.groups.lock().unwrap().len(),
                    "page": 1,
                    "per_page": 50,
                    "last_page": 1,
                    "cursor": null,
                    "next_cursor": null,
                    "has_next": false,
                    "has_prev": false
                },
                "meta": {}
            }),
            "adminCreateBoardGroup" | "adminLegacyCreateGroup" => {
                let body = input.body.as_ref().unwrap();
                let group = serde_json::json!({
                    "gr_id": body["gr_id"],
                    "gr_subject": body["gr_subject"],
                    "gr_admin": body.get("gr_admin").cloned().unwrap_or(serde_json::json!("")),
                    "gr_device": body.get("gr_device").cloned().unwrap_or(serde_json::json!("both")),
                    "gr_use_access": body.get("gr_use_access").cloned().unwrap_or(serde_json::json!(0))
                });
                self.groups.lock().unwrap().push(group.clone());
                serde_json::json!({"data": group, "meta": {}})
            }
            "adminGetBoardGroup" | "adminLegacyGetGroup" => {
                let gr_id = input.path.get("gr_id").map(String::as_str);
                let group = self
                    .groups
                    .lock()
                    .unwrap()
                    .iter()
                    .find(|item| item["gr_id"].as_str() == gr_id)
                    .cloned()
                    .unwrap();
                serde_json::json!({"data": group, "meta": {}})
            }
            "adminUpdateBoardGroup" | "adminPatchBoardGroup" | "adminLegacyUpdateGroup" => {
                let gr_id = input.path.get("gr_id").map(String::as_str);
                let mut groups = self.groups.lock().unwrap();
                let group = groups
                    .iter_mut()
                    .find(|item| item["gr_id"].as_str() == gr_id)
                    .unwrap();
                for (name, value) in input.body.as_ref().unwrap().as_object().unwrap() {
                    group[name] = value.clone();
                }
                serde_json::json!({"data": group.clone(), "meta": {}})
            }
            "adminDeleteBoardGroup" | "adminLegacyDeleteGroup" => {
                let gr_id = input.path.get("gr_id").map(String::as_str);
                self.groups
                    .lock()
                    .unwrap()
                    .retain(|item| item["gr_id"].as_str() != gr_id);
                self.group_members
                    .lock()
                    .unwrap()
                    .retain(|item| item["gr_id"].as_str() != gr_id);
                Value::Null
            }
            "adminListBoardGroupMembers" | "adminLegacyListGroupMembers" => {
                let gr_id = input.path.get("gr_id").map(String::as_str);
                let members = self
                    .group_members
                    .lock()
                    .unwrap()
                    .iter()
                    .filter(|item| item["gr_id"].as_str() == gr_id)
                    .cloned()
                    .collect::<Vec<_>>();
                serde_json::json!({
                    "data": members,
                    "pagination": {
                        "mode": "page", "total": members.len(), "page": 1, "per_page": 20,
                        "last_page": 1, "cursor": null, "next_cursor": null,
                        "has_next": false, "has_prev": false
                    },
                    "meta": {}
                })
            }
            "adminAddBoardGroupMember" | "adminLegacyAddGroupMember" => {
                let gr_id = input.path.get("gr_id").unwrap().clone();
                let mb_id = input.body.as_ref().unwrap()["mb_id"]
                    .as_str()
                    .unwrap()
                    .to_owned();
                let member = serde_json::json!({
                    "gm_id": 2,
                    "gr_id": gr_id,
                    "mb_id": mb_id,
                    "gm_datetime": "2026-08-12 11:00:00",
                    "mb_name": "추가 회원",
                    "mb_nick": "추가 회원",
                    "mb_level": 2,
                    "mb_today_login": null
                });
                self.group_members.lock().unwrap().push(member);
                serde_json::json!({
                    "data": {"gr_id": gr_id, "mb_id": mb_id, "gm_datetime": "2026-08-12 11:00:00"},
                    "meta": {}
                })
            }
            "adminDeleteBoardGroupMember" | "adminLegacyDeleteGroupMember" => {
                let gr_id = input.path.get("gr_id").map(String::as_str);
                let mb_id = input.path.get("mb_id").map(String::as_str);
                self.group_members.lock().unwrap().retain(|item| {
                    item["gr_id"].as_str() != gr_id || item["mb_id"].as_str() != mb_id
                });
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

    async fn external_execute(
        &self,
        _base_url: &str,
        _request_id: &str,
        access_token: &str,
        operation_id: &str,
        input: &CoreExecuteRequest,
    ) -> ConnectorResult<CoreExecuteResponse> {
        assert_eq!(access_token, "g5-access-token");
        self.external_mail_operations
            .lock()
            .unwrap()
            .push(operation_id.to_owned());
        let body = input.body.as_ref().unwrap();
        let data = match operation_id {
            "adminSendMail" => serde_json::json!({
                "data": {
                    "ma_id": body.get("ma_id").cloned().unwrap_or(Value::Null),
                    "template_used": body.get("ma_id").is_some(),
                    "target_count": 1,
                    "sent_count": 0,
                    "skipped_count": 1,
                    "mail_enabled": false,
                    "dry_run": body["dry_run"],
                    "targets": [{"mb_id": "member01", "mb_email": "member@example.test"}]
                },
                "meta": {}
            }),
            "adminSendTestMail" | "adminCreateMailTest" => serde_json::json!({
                "data": {
                    "ma_id": body.get("ma_id").cloned().unwrap_or(Value::Null),
                    "template_used": body.get("ma_id").is_some(),
                    "mail_enabled": false,
                    "sent": false,
                    "to": body["to"]
                },
                "meta": {}
            }),
            "adminSystemSendMailTest" => serde_json::json!({
                "data": {"sent": true, "mail_log_id": 9001, "to": body["to"]},
                "meta": {}
            }),
            "adminSystemSendMemberMail" => serde_json::json!({
                "data": {
                    "mail_log_id": 9002,
                    "target_count": 1,
                    "sent_count": 0,
                    "skipped_count": 1,
                    "mail_enabled": false,
                    "dry_run": body["dry_run"],
                    "recipients": [{"mb_id": "member01", "mb_email": "member@example.test"}]
                },
                "meta": {}
            }),
            _ => panic!("unexpected specialized external operation: {operation_id}"),
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
