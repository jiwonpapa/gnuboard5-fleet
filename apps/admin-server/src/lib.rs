use std::{path::PathBuf, time::Instant};

use axum::{
    Json, Router,
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
};
use g5_fleet_store::{EXPECTED_SCHEMA_VERSION, FleetStore};
use serde::{Deserialize, Serialize};
use tower_http::{
    services::{ServeDir, ServeFile},
    trace::TraceLayer,
};

pub const SERVICE_NAME: &str = "g5-fleet-admin-server";
pub const API_VERSION: &str = "v1";

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub web_root: PathBuf,
    pub store: FleetStore,
}

#[derive(Clone, Debug)]
struct AppState {
    config: AppConfig,
    started_at: Instant,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
    pub version: String,
    pub uptime_seconds: u64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct MetaResponse {
    pub api_version: String,
    pub product_name: String,
    pub server_version: String,
    pub database_schema_version: i64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ErrorEnvelope {
    pub error: ErrorBody,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ErrorBody {
    pub code: String,
    pub message: String,
    pub request_id: Option<String>,
}

pub fn build_router(config: AppConfig) -> Router {
    let index = config.web_root.join("index.html");
    let static_files = ServeDir::new(&config.web_root).fallback(ServeFile::new(index));
    let state = AppState {
        config,
        started_at: Instant::now(),
    };
    let api = Router::new()
        .route("/meta", get(meta))
        .fallback(api_not_found);

    Router::new()
        .route("/healthz", get(healthz))
        .route("/readyz", get(readyz))
        .nest("/api/v1", api)
        .fallback_service(static_files)
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

async fn healthz(State(state): State<AppState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_owned(),
        service: SERVICE_NAME.to_owned(),
        version: env!("CARGO_PKG_VERSION").to_owned(),
        uptime_seconds: state.started_at.elapsed().as_secs(),
    })
}

async fn readyz(State(state): State<AppState>) -> Response {
    if !state.config.web_root.join("index.html").is_file() {
        return api_error(
            StatusCode::SERVICE_UNAVAILABLE,
            "web_assets_missing",
            "Admin Web build output is not ready.",
        );
    }
    if state.config.store.quick_check().await.is_ok() {
        return (
            StatusCode::OK,
            Json(HealthResponse {
                status: "ready".to_owned(),
                service: SERVICE_NAME.to_owned(),
                version: env!("CARGO_PKG_VERSION").to_owned(),
                uptime_seconds: state.started_at.elapsed().as_secs(),
            }),
        )
            .into_response();
    }

    api_error(
        StatusCode::SERVICE_UNAVAILABLE,
        "database_not_ready",
        "Fleet database integrity check did not pass.",
    )
}

async fn meta() -> Json<MetaResponse> {
    Json(MetaResponse {
        api_version: API_VERSION.to_owned(),
        product_name: "G5 Fleet".to_owned(),
        server_version: env!("CARGO_PKG_VERSION").to_owned(),
        database_schema_version: EXPECTED_SCHEMA_VERSION,
    })
}

async fn api_not_found() -> Response {
    api_error(
        StatusCode::NOT_FOUND,
        "route_not_found",
        "The requested Fleet API route does not exist.",
    )
}

fn api_error(status: StatusCode, code: &'static str, message: &'static str) -> Response {
    (
        status,
        Json(ErrorEnvelope {
            error: ErrorBody {
                code: code.to_owned(),
                message: message.to_owned(),
                request_id: None,
            },
        }),
    )
        .into_response()
}
