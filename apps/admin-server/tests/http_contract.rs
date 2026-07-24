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
    ConnectorResult,
};
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
    assert_eq!(meta.database_schema_version, 2);
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
            ("POST", "/api/v1/bootstrap"),
            ("POST", "/api/v1/auth/login"),
            ("POST", "/api/v1/auth/logout"),
            ("POST", "/api/v1/auth/step-up"),
            ("GET", "/api/v1/session"),
            ("GET", "/api/v1/sites"),
            ("POST", "/api/v1/sites"),
            ("GET", "/api/v1/sites/{site_id}"),
            ("PUT", "/api/v1/sites/{site_id}/secrets"),
            ("GET", "/api/v1/sites/{site_id}/connector/health"),
            ("POST", "/api/v1/sites/{site_id}/connector/login"),
            ("GET", "/api/v1/sites/{site_id}/overview"),
            ("GET", "/api/v1/sites/{site_id}/config/basic"),
            ("PUT", "/api/v1/sites/{site_id}/config/basic"),
        ]
    );
}

#[tokio::test]
async fn login_cookie_csrf_and_logout_contract_fail_closed() {
    let (_web, _data, app) = fixture().await;
    let password = "correct horse battery staple";
    let bootstrap = app
        .clone()
        .oneshot(
            Request::post("/api/v1/bootstrap")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({"login_name":"admin","password":password}).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(bootstrap.status(), StatusCode::CREATED);
    let bootstrap_body = bootstrap.into_body().collect().await.unwrap().to_bytes();
    assert!(!String::from_utf8_lossy(&bootstrap_body).contains(password));

    let login = app
        .clone()
        .oneshot(
            Request::post("/api/v1/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({"login_name":"admin","password":password}).to_string(),
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

    let logout = app
        .clone()
        .oneshot(
            Request::post("/api/v1/auth/logout")
                .header("cookie", &cookie)
                .header("x-csrf-token", login.csrf_token)
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
    });
    let fleet_password = "correct horse battery staple";
    let bootstrap = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/bootstrap",
            None,
            None,
            Some(serde_json::json!({
                "login_name": "admin",
                "password": fleet_password
            })),
        ))
        .await
        .unwrap();
    assert_eq!(bootstrap.status(), StatusCode::CREATED);

    let login = app
        .clone()
        .oneshot(json_request(
            Method::POST,
            "/api/v1/auth/login",
            None,
            None,
            Some(serde_json::json!({
                "login_name": "admin",
                "password": fleet_password
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
            Some(serde_json::json!({"password": fleet_password})),
        ))
        .await
        .unwrap();
    assert_eq!(step_up.status(), StatusCode::NO_CONTENT);

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

    let overview = app
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
    assert_eq!(mock.cf_10.lock().unwrap().as_str(), "baseline");
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
}
