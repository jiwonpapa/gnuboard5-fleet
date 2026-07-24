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

#[derive(Debug, Deserialize)]
struct BootstrapRequest {
    login_name: String,
    password: String,
}

#[derive(Debug, Deserialize)]
struct LoginRequest {
    login_name: String,
    password: String,
}

#[derive(Debug, Deserialize)]
struct StepUpRequest {
    password: String,
}

#[derive(Debug, Deserialize)]
struct CreateSiteRequest {
    site_id: String,
    display_name: String,
    base_url: String,
}

#[derive(Debug, Deserialize)]
struct PutSecretRequest {
    purpose: String,
    secret: String,
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
