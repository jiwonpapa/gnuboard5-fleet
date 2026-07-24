use std::{
    sync::atomic::{AtomicU64, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};

use axum::{
    Json, Router,
    extract::{Path, State},
    http::{
        HeaderMap, HeaderValue, StatusCode,
        header::{COOKIE, SET_COOKIE},
    },
    response::{IntoResponse, Response},
    routing::{get, post, put},
};
use g5_fleet_connector::{
    BasicConfig, ConnectorCredentials, ConnectorError, ConnectorHealth, ConnectorLogin,
    SiteOverview,
};
use g5_fleet_security::{AuthError, PrincipalSession, SecretPurpose, SystemResolver, UrlGuard};
use g5_fleet_store::{SiteRecord, StoreError};
use serde::{Deserialize, Serialize};

use crate::{AppState, api_error};

const SESSION_COOKIE: &str = "g5_fleet_session";
const CSRF_HEADER: &str = "x-csrf-token";
static REQUEST_COUNTER: AtomicU64 = AtomicU64::new(1);

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct RequestContext {
    pub principal_id: String,
    pub web_session_id: String,
    pub site_id: Option<String>,
    pub request_id: String,
}

#[derive(Deserialize)]
struct BootstrapRequest {
    login_name: String,
    password: String,
}

#[derive(Deserialize)]
struct LoginRequest {
    login_name: String,
    password: String,
}

#[derive(Deserialize)]
struct StepUpRequest {
    password: String,
}

#[derive(Debug, Deserialize)]
struct CreateSiteRequest {
    site_id: String,
    display_name: String,
    base_url: String,
}

#[derive(Deserialize)]
struct PutSecretRequest {
    purpose: String,
    secret: String,
}

#[derive(Deserialize)]
struct ConnectorLoginRequest {
    mb_id: String,
    mb_password: String,
}

#[derive(Debug, Deserialize)]
struct BasicConfigUpdateRequest {
    cf_10: String,
}

#[derive(Debug, Serialize)]
struct ConnectorLoginResponse {
    connected: bool,
    expires_in: i64,
}

#[derive(Debug, Serialize)]
struct BootstrapResponse {
    principal_id: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct LoginResponse {
    pub csrf_token: String,
    pub expires_at_unix: i64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SessionResponse {
    pub principal_id: String,
    pub web_session_id: String,
    pub expires_at_unix: i64,
    pub step_up_active: bool,
}

pub(crate) fn router() -> Router<AppState> {
    Router::new()
        .route("/bootstrap", post(bootstrap))
        .route("/auth/login", post(login))
        .route("/auth/logout", post(logout))
        .route("/auth/step-up", post(step_up))
        .route("/session", get(session))
        .route("/sites", get(list_sites).post(create_site))
        .route("/sites/{site_id}", get(get_site))
        .route("/sites/{site_id}/secrets", put(put_secret))
        .route("/sites/{site_id}/connector/health", get(connector_health))
        .route("/sites/{site_id}/connector/login", post(connector_login))
        .route("/sites/{site_id}/overview", get(site_overview))
        .route(
            "/sites/{site_id}/config/basic",
            get(basic_config_get).put(basic_config_update),
        )
}

async fn bootstrap(
    State(state): State<AppState>,
    Json(payload): Json<BootstrapRequest>,
) -> Response {
    match state
        .config
        .auth
        .bootstrap_admin(&payload.login_name, &payload.password)
        .await
    {
        Ok(principal_id) => (
            StatusCode::CREATED,
            Json(BootstrapResponse { principal_id }),
        )
            .into_response(),
        Err(error) => auth_error(error),
    }
}

async fn login(State(state): State<AppState>, Json(payload): Json<LoginRequest>) -> Response {
    match state
        .config
        .auth
        .login(&payload.login_name, &payload.password)
        .await
    {
        Ok(tokens) => {
            let mut response = Json(LoginResponse {
                csrf_token: tokens.csrf_token,
                expires_at_unix: tokens.expires_at_unix,
            })
            .into_response();
            let cookie = format!(
                "{SESSION_COOKIE}={}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200",
                tokens.session_token
            );
            match HeaderValue::from_str(&cookie) {
                Ok(value) => {
                    response.headers_mut().insert(SET_COOKIE, value);
                    response
                }
                Err(_) => api_error(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "session_cookie_failed",
                    "Session could not be created.",
                ),
            }
        }
        Err(error) => auth_error(error),
    }
}

async fn session(State(state): State<AppState>, headers: HeaderMap) -> Response {
    let (_, principal) = match context(&state, &headers, None).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let step_up_active = state.config.auth.require_recent_step_up(&principal).is_ok();
    Json(SessionResponse {
        principal_id: principal.principal_id,
        web_session_id: principal.web_session_id,
        expires_at_unix: principal.expires_at_unix,
        step_up_active,
    })
    .into_response()
}

async fn logout(State(state): State<AppState>, headers: HeaderMap) -> Response {
    let (_, principal) = match mutation_context(&state, &headers, None).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state.config.auth.logout(&principal).await {
        Ok(()) => {
            let mut response = StatusCode::NO_CONTENT.into_response();
            response.headers_mut().insert(
                SET_COOKIE,
                HeaderValue::from_static(
                    "g5_fleet_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0",
                ),
            );
            response
        }
        Err(error) => auth_error(error),
    }
}

async fn step_up(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<StepUpRequest>,
) -> Response {
    let (_, principal) = match mutation_context(&state, &headers, None).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state
        .config
        .auth
        .step_up(&principal, &payload.password)
        .await
    {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(error) => auth_error(error),
    }
}

async fn list_sites(State(state): State<AppState>, headers: HeaderMap) -> Response {
    let (context, _) = match context(&state, &headers, None).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state
        .config
        .auth
        .store()
        .list_owned_sites(&context.principal_id)
        .await
    {
        Ok(sites) => Json(sites).into_response(),
        Err(error) => store_error(error),
    }
}

async fn create_site(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateSiteRequest>,
) -> Response {
    let (context, _) = match mutation_context(&state, &headers, None).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    if UrlGuard::new(SystemResolver)
        .resolve_initial(&payload.base_url)
        .await
        .is_err()
    {
        return api_error(
            StatusCode::BAD_REQUEST,
            "site_url_forbidden",
            "Site URL is invalid or resolves to a non-public address.",
        );
    }
    match state
        .config
        .auth
        .store()
        .create_site(
            &payload.site_id,
            &context.principal_id,
            &payload.display_name,
            &payload.base_url,
        )
        .await
    {
        Ok(()) => StatusCode::CREATED.into_response(),
        Err(error) => store_error(error),
    }
}

async fn get_site(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
) -> Response {
    let (context, _) = match context(&state, &headers, Some(site_id.clone())).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state
        .config
        .auth
        .store()
        .owned_site(&context.principal_id, &site_id)
        .await
    {
        Ok(Some(site)) => Json::<SiteRecord>(site).into_response(),
        Ok(None) => api_error(
            StatusCode::NOT_FOUND,
            "site_not_found",
            "Site was not found.",
        ),
        Err(error) => store_error(error),
    }
}

async fn put_secret(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    Json(payload): Json<PutSecretRequest>,
) -> Response {
    let (context, principal) = match mutation_context(&state, &headers, Some(site_id.clone())).await
    {
        Ok(value) => value,
        Err(response) => return response,
    };
    if let Err(error) = state.config.auth.require_recent_step_up(&principal) {
        return auth_error(error);
    }
    let purpose = match payload.purpose.as_str() {
        "g5_api" => SecretPurpose::G5Api,
        "ssh" => SecretPurpose::Ssh,
        "sftp" => SecretPurpose::Sftp,
        "notification" => SecretPurpose::Notification,
        _ => {
            return api_error(
                StatusCode::BAD_REQUEST,
                "invalid_secret_purpose",
                "Secret purpose is invalid.",
            );
        }
    };
    match state
        .config
        .auth
        .put_secret(
            &context.principal_id,
            &site_id,
            purpose,
            payload.secret.as_bytes(),
        )
        .await
    {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(error) => auth_error(error),
    }
}

async fn connector_health(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
) -> Response {
    let (context, _, site) = match owned_site_context(&state, &headers, site_id, false).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state
        .config
        .connector
        .health(&site.base_url, &context.request_id)
        .await
    {
        Ok(health) => Json::<ConnectorHealth>(health).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn connector_login(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    Json(payload): Json<ConnectorLoginRequest>,
) -> Response {
    let (context, principal, site) = match owned_site_context(&state, &headers, site_id, true).await
    {
        Ok(value) => value,
        Err(response) => return response,
    };
    if let Err(error) = state.config.auth.require_recent_step_up(&principal) {
        return auth_error(error);
    }
    let credentials = match state
        .config
        .connector
        .login(
            &site.base_url,
            &context.request_id,
            &ConnectorLogin {
                mb_id: payload.mb_id,
                mb_password: payload.mb_password,
            },
        )
        .await
    {
        Ok(value) => value,
        Err(error) => return connector_error(error),
    };
    let encrypted_payload = match serde_json::to_vec(&credentials) {
        Ok(value) => value,
        Err(_) => {
            return api_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "connector_credential_failed",
                "Connector credentials could not be stored.",
            );
        }
    };
    if let Err(error) = state
        .config
        .auth
        .put_secret(
            &context.principal_id,
            &site.site_id,
            SecretPurpose::G5Api,
            &encrypted_payload,
        )
        .await
    {
        return auth_error(error);
    }
    Json(ConnectorLoginResponse {
        connected: true,
        expires_in: credentials.expires_in,
    })
    .into_response()
}

async fn site_overview(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
) -> Response {
    let (context, _, site) = match owned_site_context(&state, &headers, site_id, false).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let credentials = match connector_credentials(&state, &context, &site.site_id).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let health = match state
        .config
        .connector
        .health(&site.base_url, &context.request_id)
        .await
    {
        Ok(value) => value,
        Err(error) => return connector_error(error),
    };
    let config = match state
        .config
        .connector
        .basic_config(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
        )
        .await
    {
        Ok(value) => value,
        Err(error) => return connector_error(error),
    };
    Json(SiteOverview {
        connector_status: health.status,
        connector_version: health.version,
        site_title: config.cf_title,
        administrator_id: config.cf_admin,
    })
    .into_response()
}

async fn basic_config_get(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
) -> Response {
    let (context, _, site) = match owned_site_context(&state, &headers, site_id, false).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let credentials = match connector_credentials(&state, &context, &site.site_id).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state
        .config
        .connector
        .basic_config(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
        )
        .await
    {
        Ok(config) => Json::<BasicConfig>(config).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn basic_config_update(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    Json(payload): Json<BasicConfigUpdateRequest>,
) -> Response {
    let (context, principal, site) = match owned_site_context(&state, &headers, site_id, true).await
    {
        Ok(value) => value,
        Err(response) => return response,
    };
    if let Err(error) = state.config.auth.require_recent_step_up(&principal) {
        return auth_error(error);
    }
    let credentials = match connector_credentials(&state, &context, &site.site_id).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state
        .config
        .connector
        .update_basic_config(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &payload.cf_10,
        )
        .await
    {
        Ok(config) => Json::<BasicConfig>(config).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn owned_site_context(
    state: &AppState,
    headers: &HeaderMap,
    site_id: String,
    mutation: bool,
) -> Result<(RequestContext, PrincipalSession, SiteRecord), Response> {
    let (context, principal) = if mutation {
        mutation_context(state, headers, Some(site_id.clone())).await?
    } else {
        context(state, headers, Some(site_id.clone())).await?
    };
    let site = state
        .config
        .auth
        .store()
        .owned_site(&context.principal_id, &site_id)
        .await
        .map_err(store_error)?
        .ok_or_else(|| {
            api_error(
                StatusCode::NOT_FOUND,
                "site_not_found",
                "Site was not found.",
            )
        })?;
    Ok((context, principal, site))
}

async fn connector_credentials(
    state: &AppState,
    context: &RequestContext,
    site_id: &str,
) -> Result<ConnectorCredentials, Response> {
    let encrypted = state
        .config
        .auth
        .decrypt_secret_for_connector(&context.principal_id, site_id, SecretPurpose::G5Api)
        .await
        .map_err(auth_error)?;
    serde_json::from_slice(&encrypted).map_err(|_| {
        api_error(
            StatusCode::SERVICE_UNAVAILABLE,
            "connector_login_required",
            "Connector login is required.",
        )
    })
}

async fn mutation_context(
    state: &AppState,
    headers: &HeaderMap,
    site_id: Option<String>,
) -> Result<(RequestContext, PrincipalSession), Response> {
    let result = context(state, headers, site_id).await?;
    let csrf = headers
        .get(CSRF_HEADER)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default();
    state
        .config
        .auth
        .verify_csrf(&result.1, csrf)
        .map_err(auth_error)?;
    Ok(result)
}

async fn context(
    state: &AppState,
    headers: &HeaderMap,
    site_id: Option<String>,
) -> Result<(RequestContext, PrincipalSession), Response> {
    let token = cookie_value(headers, SESSION_COOKIE).ok_or_else(|| {
        api_error(
            StatusCode::UNAUTHORIZED,
            "authentication_required",
            "Authentication is required.",
        )
    })?;
    let principal = state
        .config
        .auth
        .authenticate(token)
        .await
        .map_err(auth_error)?;
    let request_context = RequestContext {
        principal_id: principal.principal_id.clone(),
        web_session_id: principal.web_session_id.clone(),
        site_id,
        request_id: request_id(headers),
    };
    Ok((request_context, principal))
}

fn cookie_value<'a>(headers: &'a HeaderMap, name: &str) -> Option<&'a str> {
    headers
        .get(COOKIE)?
        .to_str()
        .ok()?
        .split(';')
        .filter_map(|item| item.trim().split_once('='))
        .find_map(|(key, value)| (key == name).then_some(value))
}

fn request_id(headers: &HeaderMap) -> String {
    if let Some(value) = headers
        .get("x-request-id")
        .and_then(|value| value.to_str().ok())
        .filter(|value| {
            (8..=128).contains(&value.len())
                && value
                    .chars()
                    .all(|character| character.is_ascii_alphanumeric() || "-_".contains(character))
        })
    {
        return value.to_owned();
    }
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |duration| duration.as_nanos());
    let counter = REQUEST_COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("req_{nanos:x}_{counter:x}")
}

fn auth_error(error: AuthError) -> Response {
    match error {
        AuthError::Unauthorized | AuthError::InvalidCredentials => api_error(
            StatusCode::UNAUTHORIZED,
            "invalid_credentials",
            "Authentication failed.",
        ),
        AuthError::Csrf => api_error(
            StatusCode::FORBIDDEN,
            "csrf_failed",
            "CSRF validation failed.",
        ),
        AuthError::StepUpRequired => api_error(
            StatusCode::FORBIDDEN,
            "step_up_required",
            "Recent password verification is required.",
        ),
        AuthError::PasswordPolicy => api_error(
            StatusCode::BAD_REQUEST,
            "password_policy",
            "Password does not meet policy.",
        ),
        AuthError::Store(error) => store_error(error),
        _ => api_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "security_operation_failed",
            "Security operation failed.",
        ),
    }
}

fn store_error(error: StoreError) -> Response {
    match error {
        StoreError::Conflict(_) => {
            api_error(StatusCode::CONFLICT, "state_conflict", "State conflict.")
        }
        StoreError::NotFound | StoreError::AccessDenied => api_error(
            StatusCode::NOT_FOUND,
            "resource_not_found",
            "Resource was not found.",
        ),
        _ => api_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "storage_failed",
            "Storage operation failed.",
        ),
    }
}

fn connector_error(error: ConnectorError) -> Response {
    let (status, code, message) = match error {
        ConnectorError::Http(401 | 403) => (
            StatusCode::BAD_GATEWAY,
            "connector_auth_failed",
            "Connector authentication failed.",
        ),
        ConnectorError::InvalidConfigValue => (
            StatusCode::BAD_REQUEST,
            "invalid_config_value",
            "Basic config value is invalid.",
        ),
        ConnectorError::UrlSecurity => (
            StatusCode::BAD_GATEWAY,
            "connector_url_forbidden",
            "Connector URL failed security validation.",
        ),
        _ => (
            StatusCode::BAD_GATEWAY,
            "connector_failed",
            "Connector request failed.",
        ),
    };
    api_error(status, code, message)
}
