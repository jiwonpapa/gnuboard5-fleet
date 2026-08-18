use std::{
    sync::atomic::{AtomicU64, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};

use axum::{
    Json, Router,
    body::{Body, Bytes},
    extract::{
        Path, Query, State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    http::{
        HeaderMap, HeaderName, HeaderValue, Method, Request, StatusCode,
        header::{CACHE_CONTROL, CONTENT_TYPE, COOKIE, SET_COOKIE},
    },
    middleware::Next,
    response::{IntoResponse, Response},
    routing::{get, post, put},
};
use futures_util::{SinkExt, StreamExt, stream};
use g5_fleet_connector::{
    AdminAuthListQuery, AdminAuthMember, AdminAuthMemberList, AdminAuthUpsert, AdminBoard,
    AdminBoardCopy, AdminBoardCreate, AdminBoardGroup, AdminBoardGroupCreate, AdminBoardGroupList,
    AdminBoardGroupMemberCreate, AdminBoardGroupMemberList, AdminBoardGroupMemberListQuery,
    AdminBoardGroupMemberResult, AdminBoardGroupUpdate, AdminBoardList, AdminBoardListQuery,
    AdminBoardUpdate, AdminConfig, AdminConfigUpdate, AdminContent, AdminContentCreate,
    AdminContentList, AdminContentListQuery, AdminContentUpdate, AdminDashboardData,
    AdminFaqCreate, AdminFaqImage, AdminFaqImageUpload, AdminFaqItem, AdminFaqList,
    AdminFaqListQuery, AdminFaqMasterCreate, AdminFaqMasterDetail, AdminFaqMasterList,
    AdminFaqMasterListQuery, AdminFaqMasterUpdate, AdminFaqUpdate, AdminLayoutDetail,
    AdminLayoutList, AdminLayoutListQuery, AdminLayoutSave, AdminLayoutWidgetCreate,
    AdminLayoutWidgetReorder, AdminLayoutWidgetUpdate, AdminMember, AdminMemberLevelUpdate,
    AdminMemberList, AdminMemberListQuery, AdminMemberMediaDeleteResult, AdminMemberMediaUpload,
    AdminMemberMediaUploadResult, AdminMemberUpdate, AdminMenu, AdminMenuCreate, AdminMenuList,
    AdminMenuReorder, AdminMenuReorderResult, AdminMenuUpdate, AdminNewPostsDelete,
    AdminNewPostsDeleteResult, AdminSchemaCatalog, AdminSchemaDetail, AdminSystemPermission,
    AdminSystemPermissionList, AdminSystemPermissionListQuery, AdminSystemPermissionSave,
    BasicConfig, ConnectorCredentials, ConnectorError, ConnectorHealth, ConnectorLogin,
    CoreExecuteRequest, CoreExecuteResponse, CoreOperationSpec, MemberProfile, SiteOverview,
    core_operation, core_operations,
};
use g5_fleet_notify::{NotificationChannel, NotificationPayload, NotifyError};
use g5_fleet_remote::{
    HostKeyInspection, RemoteError, SftpCommand, SftpResult, SshProfile, SshProfileSummary,
    TerminalProcess, TerminalTicket, TransferQueueSnapshot,
};
use g5_fleet_security::{AuthError, PrincipalSession, SecretPurpose, SystemResolver, UrlGuard};
use g5_fleet_store::{
    AuditEntry, JobRecord, PortableBackupEnvelope, SiteImportSummary, SiteRecord, StoreError,
    decrypt_portable_backup, encrypt_portable_backup,
};
use serde::{Deserialize, Serialize};
use tokio::io::{AsyncReadExt, AsyncWriteExt};

use crate::{AppState, api_error};

const SESSION_COOKIE: &str = "g5_fleet_session";
const CSRF_HEADER: &str = "x-csrf-token";
const REMOTE_PATH_HEADER: &str = "x-g5-remote-path";
const TERMINAL_PROTOCOL: &str = "g5-fleet-terminal";
const TERMINAL_TICKET_PROTOCOL_PREFIX: &str = "ticket.";
const MAX_TRANSFER_BYTES: u64 = 64 * 1024 * 1024;
static REQUEST_COUNTER: AtomicU64 = AtomicU64::new(1);

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct RequestContext {
    pub principal_id: String,
    pub web_session_id: String,
    pub site_id: Option<String>,
    pub request_id: String,
}

#[derive(Deserialize)]
struct InstallChallengeRequest {
    login_name: String,
}

#[derive(Deserialize)]
struct InstallCompleteRequest {
    setup_token: String,
    login_name: String,
    password: String,
    totp_code: String,
}

#[derive(Deserialize)]
struct LoginRequest {
    login_name: String,
    password: String,
    totp_code: Option<String>,
    recovery_code: Option<String>,
}

#[derive(Deserialize)]
struct StepUpRequest {
    password: String,
    totp_code: Option<String>,
    recovery_code: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CreateSiteRequest {
    site_id: String,
    display_name: String,
    base_url: String,
}

#[derive(Debug, Deserialize)]
struct UpdateSiteRequest {
    display_name: String,
    base_url: String,
}

#[derive(Debug, Deserialize)]
struct PortableBackupRequest {
    password: String,
}

#[derive(Debug, Deserialize)]
struct PortableBackupImportRequest {
    password: String,
    envelope: PortableBackupEnvelope,
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

#[derive(Debug, Deserialize)]
struct AdminDashboardQuery {
    limit: Option<u8>,
}

#[derive(Debug, Deserialize)]
struct RemotePathRequest {
    path: String,
}

#[derive(Deserialize)]
struct HostKeyInspectRequest {
    host: String,
    port: u16,
}

#[derive(Deserialize)]
struct TransferConcurrencyRequest {
    concurrency_limit: u8,
}

#[derive(Clone, Copy)]
enum TransferAction {
    Cancel,
    Pause,
    Retry,
}

#[derive(Debug, Deserialize)]
struct EnqueueNotificationRequest {
    event_id: String,
    channel: NotificationChannel,
    payload: NotificationPayload,
}

#[derive(Debug, Serialize)]
struct PluginSlot {
    plugin_id: &'static str,
    contract_version: &'static str,
    installed: bool,
    required: bool,
}

#[derive(Debug, Serialize)]
struct ConnectorLoginResponse {
    connected: bool,
    expires_in: i64,
}

#[derive(Debug, Serialize)]
struct DashboardResponse {
    site_count: usize,
    attention_count: usize,
    active_job_count: i64,
    recent_activity: Vec<AuditEntry>,
}

#[derive(Debug, Serialize)]
struct RuntimeDiagnosticsResponse {
    service: &'static str,
    server_version: &'static str,
    build_revision: String,
    image_version: String,
    database_engine: &'static str,
    database_status: &'static str,
    uptime_seconds: u64,
    dev_bootstrap_available: bool,
    native_devtools_available: bool,
    log_tail_available: bool,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct InstallStatusResponse {
    pub state: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct InstallChallengeResponse {
    pub setup_token: String,
    pub manual_entry_key: String,
    pub otpauth_uri: String,
    pub expires_at_unix: i64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TotpChallengeResponse {
    pub manual_entry_key: String,
    pub otpauth_uri: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct InstallCompleteResponse {
    pub principal_id: String,
    pub recovery_codes: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct RecoveryCodesResponse {
    pub recovery_codes: Vec<String>,
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
    pub csrf_token: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SecuritySettingsResponse {
    pub totp_enabled: bool,
    pub session_idle_timeout_minutes: i64,
}

#[derive(Deserialize)]
struct PasswordChangeRequest {
    current_password: String,
    new_password: String,
    totp_code: Option<String>,
    recovery_code: Option<String>,
}

#[derive(Deserialize)]
struct IdleTimeoutRequest {
    minutes: i64,
}

#[derive(Deserialize)]
struct TotpCodeRequest {
    code: String,
}

#[derive(Debug, Deserialize)]
struct AuditQuery {
    site_id: Option<String>,
    limit: Option<i64>,
}

pub(crate) fn router() -> Router<AppState> {
    Router::new()
        .route("/install/status", get(install_status))
        .route("/install/challenge", post(install_challenge))
        .route("/install/complete", post(install_complete))
        .route("/auth/login", post(login))
        .route("/auth/logout", post(logout))
        .route("/auth/step-up", post(step_up))
        .route("/session", get(session))
        .route("/security/settings", get(security_settings))
        .route("/security/password", put(change_password))
        .route("/security/idle-timeout", put(update_idle_timeout))
        .route("/security/totp/challenge", post(totp_challenge))
        .route("/security/totp/enable", post(enable_totp))
        .route("/security/totp/disable", post(disable_totp))
        .route("/security/recovery-codes", post(regenerate_recovery_codes))
        .route("/audit", get(list_audit_entries))
        .route("/activity", get(list_audit_entries))
        .route("/dashboard", get(dashboard))
        .route("/diagnostics/runtime", get(runtime_diagnostics))
        .route("/backup/export", post(export_portable_backup))
        .route("/backup/import", post(import_portable_backup))
        .route("/users", post(create_user))
        .route("/plugins", get(plugin_slots))
        .route("/core/registry", get(core_registry))
        .route("/sites", get(list_sites).post(create_site))
        .route(
            "/sites/{site_id}",
            get(get_site).put(update_site).delete(delete_site),
        )
        .route("/sites/{site_id}/secrets", put(put_secret))
        .route("/sites/{site_id}/connector/health", get(connector_health))
        .route("/sites/{site_id}/connector/login", post(connector_login))
        .route(
            "/sites/{site_id}/connector/refresh",
            post(connector_refresh),
        )
        .route("/sites/{site_id}/connector/logout", post(connector_logout))
        .route("/sites/{site_id}/overview", get(site_overview))
        .route("/sites/{site_id}/admin/dashboard", get(admin_dashboard))
        .route(
            "/sites/{site_id}/admin/config",
            get(admin_config_get).put(admin_config_update),
        )
        .route("/sites/{site_id}/admin/schema", get(admin_schema_catalog))
        .route(
            "/sites/{site_id}/admin/schema/{domain}",
            get(admin_schema_detail),
        )
        .route("/sites/{site_id}/member/me", get(member_me))
        .route("/sites/{site_id}/admin/auth", get(admin_auth_list))
        .route(
            "/sites/{site_id}/admin/auth/{mb_id}",
            put(admin_auth_upsert).delete(admin_auth_delete_member),
        )
        .route(
            "/sites/{site_id}/admin/permissions",
            get(admin_permission_list).post(admin_permission_save),
        )
        .route(
            "/sites/{site_id}/admin/permissions/{mb_id}/{au_menu}",
            axum::routing::delete(admin_permission_delete),
        )
        .route("/sites/{site_id}/admin/members", get(admin_member_list))
        .route(
            "/sites/{site_id}/admin/members/export",
            get(admin_member_export),
        )
        .route(
            "/sites/{site_id}/admin/members/{mb_id}",
            get(admin_member_get)
                .patch(admin_member_update)
                .delete(admin_member_delete),
        )
        .route(
            "/sites/{site_id}/admin/members/{mb_id}/level",
            axum::routing::patch(admin_member_level_update),
        )
        .route(
            "/sites/{site_id}/admin/members/{mb_id}/icon",
            post(admin_member_icon_upload).delete(admin_member_icon_delete),
        )
        .route(
            "/sites/{site_id}/admin/members/{mb_id}/image",
            post(admin_member_image_upload).delete(admin_member_image_delete),
        )
        .route(
            "/sites/{site_id}/admin/board-groups",
            get(admin_board_group_list).post(admin_board_group_create),
        )
        .route(
            "/sites/{site_id}/admin/board-groups/{gr_id}",
            get(admin_board_group_get)
                .put(admin_board_group_update)
                .patch(admin_board_group_patch)
                .delete(admin_board_group_delete),
        )
        .route(
            "/sites/{site_id}/admin/board-groups/{gr_id}/members",
            get(admin_board_group_member_list).post(admin_board_group_member_add),
        )
        .route(
            "/sites/{site_id}/admin/board-groups/{gr_id}/members/{mb_id}",
            axum::routing::delete(admin_board_group_member_delete),
        )
        .route(
            "/sites/{site_id}/admin/groups",
            get(admin_legacy_group_list).post(admin_legacy_group_create),
        )
        .route(
            "/sites/{site_id}/admin/groups/{gr_id}",
            get(admin_legacy_group_get)
                .put(admin_legacy_group_update)
                .delete(admin_legacy_group_delete),
        )
        .route(
            "/sites/{site_id}/admin/groups/{gr_id}/members",
            get(admin_legacy_group_member_list).post(admin_legacy_group_member_add),
        )
        .route(
            "/sites/{site_id}/admin/groups/{gr_id}/members/{mb_id}",
            axum::routing::delete(admin_legacy_group_member_delete),
        )
        .route(
            "/sites/{site_id}/admin/boards",
            get(admin_board_list).post(admin_board_create),
        )
        .route(
            "/sites/{site_id}/admin/boards/new-posts",
            axum::routing::delete(admin_board_new_posts_delete),
        )
        .route(
            "/sites/{site_id}/admin/boards/{bo_table}",
            get(admin_board_get)
                .put(admin_board_update)
                .delete(admin_board_delete),
        )
        .route(
            "/sites/{site_id}/admin/boards/{bo_table}/copy",
            post(admin_board_copy),
        )
        .route(
            "/sites/{site_id}/admin/contents",
            get(admin_content_list).post(admin_content_create),
        )
        .route(
            "/sites/{site_id}/admin/contents/{co_id}",
            get(admin_content_get)
                .put(admin_content_update)
                .delete(admin_content_delete),
        )
        .route(
            "/sites/{site_id}/admin/faq-masters",
            get(admin_faq_master_list).post(admin_faq_master_create),
        )
        .route(
            "/sites/{site_id}/admin/faq-masters/{fm_id}",
            get(admin_faq_master_get)
                .put(admin_faq_master_update)
                .delete(admin_faq_master_delete),
        )
        .route(
            "/sites/{site_id}/admin/faq-masters/{fm_id}/header-image",
            post(admin_faq_master_header_image_upload).delete(admin_faq_master_header_image_delete),
        )
        .route(
            "/sites/{site_id}/admin/faq-masters/{fm_id}/footer-image",
            post(admin_faq_master_footer_image_upload).delete(admin_faq_master_footer_image_delete),
        )
        .route(
            "/sites/{site_id}/admin/faq-masters/{fm_id}/images/{kind}",
            get(admin_faq_master_image_content),
        )
        .route(
            "/sites/{site_id}/admin/faqs",
            get(admin_faq_list).post(admin_faq_create),
        )
        .route(
            "/sites/{site_id}/admin/faqs/{fa_id}",
            get(admin_faq_get)
                .put(admin_faq_update)
                .delete(admin_faq_delete),
        )
        .route(
            "/sites/{site_id}/admin/menus",
            get(admin_menu_list)
                .post(admin_menu_create)
                .patch(admin_menu_reorder),
        )
        .route(
            "/sites/{site_id}/admin/menus/{me_id}",
            get(admin_menu_get)
                .put(admin_menu_update)
                .delete(admin_menu_delete),
        )
        .route(
            "/sites/{site_id}/admin/menus/reorder",
            axum::routing::patch(admin_menu_reorder_legacy),
        )
        .route("/sites/{site_id}/admin/layouts", get(admin_layout_list))
        .route(
            "/sites/{site_id}/admin/layouts/{page_id}",
            get(admin_layout_get).put(admin_layout_save),
        )
        .route(
            "/sites/{site_id}/admin/layouts/{page_id}/widgets",
            post(admin_layout_widget_add).patch(admin_layout_widget_reorder),
        )
        .route(
            "/sites/{site_id}/admin/layouts/{page_id}/widgets/{widget_id}",
            axum::routing::patch(admin_layout_widget_update).delete(admin_layout_widget_delete),
        )
        .route(
            "/sites/{site_id}/admin/layouts/{page_id}/reorder",
            axum::routing::patch(admin_layout_widget_reorder_legacy),
        )
        .route(
            "/sites/{site_id}/config/basic",
            get(basic_config_get).put(basic_config_update),
        )
        .route("/sites/{site_id}/core/{operation_id}", post(core_execute))
        .route(
            "/sites/{site_id}/ssh/profile",
            get(get_ssh_profile)
                .put(put_ssh_profile)
                .delete(delete_ssh_profile),
        )
        .route("/sites/{site_id}/ssh/host-key", post(inspect_ssh_host_key))
        .route(
            "/sites/{site_id}/terminal/ticket",
            post(issue_terminal_ticket),
        )
        .route("/sites/{site_id}/terminal", get(terminal_socket))
        .route("/sites/{site_id}/sftp", post(sftp_operation))
        .route("/sites/{site_id}/transfers/upload", post(upload_transfer))
        .route(
            "/sites/{site_id}/transfers/download",
            post(download_transfer),
        )
        .route("/sites/{site_id}/transfers", get(list_transfers))
        .route(
            "/sites/{site_id}/transfers/config",
            put(set_transfer_concurrency),
        )
        .route("/sites/{site_id}/transfers/{job_id}", get(get_transfer))
        .route(
            "/sites/{site_id}/transfers/{job_id}/cancel",
            post(cancel_transfer),
        )
        .route(
            "/sites/{site_id}/transfers/{job_id}/retry",
            post(retry_transfer),
        )
        .route(
            "/sites/{site_id}/transfers/{job_id}/pause",
            post(pause_transfer),
        )
        .route("/sites/{site_id}/notifications", post(enqueue_notification))
        .route(
            "/sites/{site_id}/notifications/{outbox_id}",
            get(get_notification),
        )
}

async fn install_status(State(state): State<AppState>) -> Response {
    match state.config.auth.install_status().await {
        Ok(status) => Json(InstallStatusResponse {
            state: status.state,
        })
        .into_response(),
        Err(error) => auth_error(error),
    }
}

async fn install_challenge(
    State(state): State<AppState>,
    Json(payload): Json<InstallChallengeRequest>,
) -> Response {
    match state
        .config
        .auth
        .start_install_challenge(&payload.login_name)
        .await
    {
        Ok(challenge) => (
            StatusCode::CREATED,
            Json(InstallChallengeResponse {
                setup_token: challenge
                    .setup_token
                    .expect("install challenge carries setup token"),
                manual_entry_key: challenge.manual_entry_key,
                otpauth_uri: challenge.otpauth_uri,
                expires_at_unix: challenge
                    .expires_at_unix
                    .expect("install challenge carries expiry"),
            }),
        )
            .into_response(),
        Err(error) => auth_error(error),
    }
}

async fn install_complete(
    State(state): State<AppState>,
    Json(payload): Json<InstallCompleteRequest>,
) -> Response {
    match state
        .config
        .auth
        .complete_install(
            &payload.setup_token,
            &payload.login_name,
            &payload.password,
            &payload.totp_code,
        )
        .await
    {
        Ok(completion) => (
            StatusCode::CREATED,
            Json(InstallCompleteResponse {
                principal_id: completion.principal_id,
                recovery_codes: completion.recovery_codes,
            }),
        )
            .into_response(),
        Err(error) => auth_error(error),
    }
}

async fn login(State(state): State<AppState>, Json(payload): Json<LoginRequest>) -> Response {
    match state
        .config
        .auth
        .login_with_factor(
            &payload.login_name,
            &payload.password,
            payload.totp_code.as_deref(),
            payload.recovery_code.as_deref(),
        )
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
    let csrf_token = match state.config.auth.rotate_csrf(&principal).await {
        Ok(token) => token,
        Err(error) => return auth_error(error),
    };
    let step_up_active = state.config.auth.require_recent_step_up(&principal).is_ok();
    Json(SessionResponse {
        principal_id: principal.principal_id,
        web_session_id: principal.web_session_id,
        expires_at_unix: principal.expires_at_unix,
        step_up_active,
        csrf_token,
    })
    .into_response()
}

async fn create_user(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(_payload): Json<serde_json::Value>,
) -> Response {
    let (_, _principal) = match mutation_context(&state, &headers, None).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    api_error(
        StatusCode::CONFLICT,
        "user_totp_enrollment_required",
        "Additional administrators require a dedicated OTP enrollment flow.",
    )
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
        .step_up_with_factor(
            &principal,
            &payload.password,
            payload.totp_code.as_deref(),
            payload.recovery_code.as_deref(),
        )
        .await
    {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(error) => auth_error(error),
    }
}

async fn security_settings(State(state): State<AppState>, headers: HeaderMap) -> Response {
    let (_, principal) = match context(&state, &headers, None).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state.config.auth.security_settings(&principal).await {
        Ok(settings) => Json(SecuritySettingsResponse {
            totp_enabled: settings.totp_enabled,
            session_idle_timeout_minutes: settings.session_idle_timeout_minutes,
        })
        .into_response(),
        Err(error) => auth_error(error),
    }
}

async fn change_password(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<PasswordChangeRequest>,
) -> Response {
    let (_, principal) = match mutation_context(&state, &headers, None).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state
        .config
        .auth
        .change_password(
            &principal,
            &payload.current_password,
            &payload.new_password,
            payload.totp_code.as_deref(),
            payload.recovery_code.as_deref(),
        )
        .await
    {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(error) => auth_error(error),
    }
}

async fn update_idle_timeout(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<IdleTimeoutRequest>,
) -> Response {
    let (_, principal) = match mutation_context(&state, &headers, None).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state
        .config
        .auth
        .update_idle_timeout(&principal, payload.minutes)
        .await
    {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(error) => auth_error(error),
    }
}

async fn totp_challenge(State(state): State<AppState>, headers: HeaderMap) -> Response {
    let (_, principal) = match mutation_context(&state, &headers, None).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state.config.auth.start_totp_enrollment(&principal).await {
        Ok(challenge) => Json(TotpChallengeResponse {
            manual_entry_key: challenge.manual_entry_key,
            otpauth_uri: challenge.otpauth_uri,
        })
        .into_response(),
        Err(error) => auth_error(error),
    }
}

async fn enable_totp(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<TotpCodeRequest>,
) -> Response {
    let (_, principal) = match mutation_context(&state, &headers, None).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state
        .config
        .auth
        .enable_totp(&principal, &payload.code)
        .await
    {
        Ok(recovery_codes) => Json(RecoveryCodesResponse { recovery_codes }).into_response(),
        Err(error) => auth_error(error),
    }
}

async fn disable_totp(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(_payload): Json<serde_json::Value>,
) -> Response {
    let (_, _principal) = match mutation_context(&state, &headers, None).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    api_error(
        StatusCode::FORBIDDEN,
        "totp_required_policy",
        "TOTP cannot be disabled for Fleet administrators.",
    )
}

async fn regenerate_recovery_codes(State(state): State<AppState>, headers: HeaderMap) -> Response {
    let (_, principal) = match mutation_context(&state, &headers, None).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state
        .config
        .auth
        .regenerate_recovery_codes(&principal)
        .await
    {
        Ok(recovery_codes) => Json(RecoveryCodesResponse { recovery_codes }).into_response(),
        Err(error) => auth_error(error),
    }
}

async fn list_audit_entries(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<AuditQuery>,
) -> Response {
    let (request_context, _) = match context(&state, &headers, query.site_id.clone()).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let limit = query.limit.unwrap_or(50).clamp(1, 100);
    match state
        .config
        .auth
        .store()
        .list_audit_entries(
            &request_context.principal_id,
            request_context.site_id.as_deref(),
            limit,
        )
        .await
    {
        Ok(entries) => Json::<Vec<AuditEntry>>(entries).into_response(),
        Err(error) => store_error(error),
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

async fn dashboard(State(state): State<AppState>, headers: HeaderMap) -> Response {
    let (context, _) = match context(&state, &headers, None).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let store = state.config.auth.store();
    let sites = match store.list_owned_sites(&context.principal_id).await {
        Ok(sites) => sites,
        Err(error) => return store_error(error),
    };
    let active_job_count = match store.count_active_jobs(&context.principal_id).await {
        Ok(count) => count,
        Err(error) => return store_error(error),
    };
    let recent_activity = match store
        .list_audit_entries(&context.principal_id, None, 8)
        .await
    {
        Ok(entries) => entries,
        Err(error) => return store_error(error),
    };
    Json(DashboardResponse {
        site_count: sites.len(),
        attention_count: sites.iter().filter(|site| site.status != "active").count(),
        active_job_count,
        recent_activity,
    })
    .into_response()
}

async fn runtime_diagnostics(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if let Err(response) = context(&state, &headers, None).await {
        return response;
    }
    let database_status = if state.config.auth.store().quick_check().await.is_ok() {
        "ok"
    } else {
        "failed"
    };
    Json(RuntimeDiagnosticsResponse {
        service: crate::SERVICE_NAME,
        server_version: env!("CARGO_PKG_VERSION"),
        build_revision: crate::build_revision(),
        image_version: crate::image_version(),
        database_engine: "sqlite",
        database_status,
        uptime_seconds: state.started_at.elapsed().as_secs(),
        dev_bootstrap_available: false,
        native_devtools_available: false,
        log_tail_available: false,
    })
    .into_response()
}

async fn export_portable_backup(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<PortableBackupRequest>,
) -> Response {
    let (context, principal) = match mutation_context(&state, &headers, None).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    if let Err(error) = state.config.auth.require_recent_step_up(&principal) {
        return auth_error(error);
    }
    let sites = match state
        .config
        .auth
        .store()
        .list_owned_sites(&context.principal_id)
        .await
    {
        Ok(sites) => sites,
        Err(error) => return store_error(error),
    };
    match encrypt_portable_backup(&sites, &payload.password) {
        Ok(envelope) => Json(envelope).into_response(),
        Err(error) => store_error(error),
    }
}

async fn import_portable_backup(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<PortableBackupImportRequest>,
) -> Response {
    let (context, principal) = match mutation_context(&state, &headers, None).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    if let Err(error) = state.config.auth.require_recent_step_up(&principal) {
        return auth_error(error);
    }
    let import = match decrypt_portable_backup(&payload.envelope, &payload.password) {
        Ok(import) => import,
        Err(error) => return store_error(error),
    };
    for site in &import.sites {
        if validate_site_url(&site.base_url).await.is_err() {
            return api_error(
                StatusCode::BAD_REQUEST,
                "backup_site_url_forbidden",
                "Backup contains an invalid or forbidden site URL.",
            );
        }
    }
    if let Err(error) = verify_pre_import_recovery(state.config.auth.store()).await {
        return store_error(error);
    }
    match state
        .config
        .auth
        .store()
        .import_owned_sites(&context.principal_id, &import.sites)
        .await
    {
        Ok(summary) => Json::<SiteImportSummary>(summary).into_response(),
        Err(error) => store_error(error),
    }
}

async fn verify_pre_import_recovery(store: &g5_fleet_store::FleetStore) -> Result<(), StoreError> {
    let backup_dir = tempfile::tempdir().map_err(|error| g5_fleet_store::StoreError::Io {
        context: "creating pre-import backup directory",
        source: error,
    })?;
    let restore_dir = tempfile::tempdir().map_err(|error| g5_fleet_store::StoreError::Io {
        context: "creating pre-import restore directory",
        source: error,
    })?;
    let snapshot = backup_dir.path().join("pre-import.sqlite3");
    let artifact = store
        .create_verified_backup(&snapshot, &crate::image_version(), &crate::build_revision())
        .await?;
    let restored = g5_fleet_store::FleetStore::restore_verified_backup(
        &artifact.snapshot_path,
        &artifact.manifest_path,
        restore_dir.path(),
    )
    .await?;
    if restored != artifact.manifest.readback {
        return Err(StoreError::BackupManifest(
            "pre-import restore readback mismatch".to_owned(),
        ));
    }
    let restored_store = g5_fleet_store::FleetStore::open_existing(restore_dir.path()).await?;
    restored_store.full_integrity_check().await?;
    restored_store.close().await;
    Ok(())
}

async fn core_registry(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if let Err(response) = context(&state, &headers, None).await {
        return response;
    }
    Json::<&[CoreOperationSpec]>(core_operations()).into_response()
}

async fn plugin_slots(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if let Err(response) = context(&state, &headers, None).await {
        return response;
    }
    Json(vec![PluginSlot {
        plugin_id: "commerce",
        contract_version: "g5-fleet.commerce-plugin/v1",
        installed: false,
        required: false,
    }])
    .into_response()
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
    if validate_site_url(&payload.base_url).await.is_err() {
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

async fn validate_site_url(
    base_url: &str,
) -> Result<g5_fleet_security::OutboundTarget, g5_fleet_security::SsrfError> {
    #[cfg(feature = "local-certification")]
    if std::env::var("G5_FLEET_CERTIFICATION_MODE").as_deref() == Ok("local") {
        return UrlGuard::local_certification(SystemResolver)
            .resolve_initial(base_url)
            .await;
    }
    UrlGuard::new(SystemResolver)
        .resolve_initial(base_url)
        .await
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

async fn update_site(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    Json(payload): Json<UpdateSiteRequest>,
) -> Response {
    let (context, principal, _) =
        match owned_site_context(&state, &headers, site_id.clone(), true).await {
            Ok(value) => value,
            Err(response) => return response,
        };
    if let Err(error) = state.config.auth.require_recent_step_up(&principal) {
        return auth_error(error);
    }
    if validate_site_url(&payload.base_url).await.is_err() {
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
        .update_owned_site(
            &context.principal_id,
            &site_id,
            &payload.display_name,
            &payload.base_url,
        )
        .await
    {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(error) => store_error(error),
    }
}

async fn delete_site(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
) -> Response {
    let (context, principal, _) =
        match owned_site_context(&state, &headers, site_id.clone(), true).await {
            Ok(value) => value,
            Err(response) => return response,
        };
    if let Err(error) = state.config.auth.require_recent_step_up(&principal) {
        return auth_error(error);
    }
    match state
        .config
        .auth
        .store()
        .delete_owned_site(&context.principal_id, &site_id)
        .await
    {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
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

async fn connector_refresh(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
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
    let refreshed = match state
        .config
        .connector
        .refresh(
            &site.base_url,
            &context.request_id,
            &credentials.refresh_token,
        )
        .await
    {
        Ok(value) => value,
        Err(error) => return connector_error(error),
    };
    match store_connector_credentials(&state, &context, &site.site_id, &refreshed).await {
        Ok(()) => Json(ConnectorLoginResponse {
            connected: true,
            expires_in: refreshed.expires_in,
        })
        .into_response(),
        Err(response) => response,
    }
}

async fn connector_logout(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
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
    if let Err(error) = state
        .config
        .connector
        .logout(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &credentials.refresh_token,
        )
        .await
    {
        return connector_error(error);
    }
    match state
        .config
        .auth
        .put_secret(
            &context.principal_id,
            &site.site_id,
            SecretPurpose::G5Api,
            b"{}",
        )
        .await
    {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(error) => auth_error(error),
    }
}

async fn store_connector_credentials(
    state: &AppState,
    context: &RequestContext,
    site_id: &str,
    credentials: &ConnectorCredentials,
) -> Result<(), Response> {
    let encrypted_payload = serde_json::to_vec(credentials).map_err(|_| {
        api_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "connector_credential_failed",
            "Connector credentials could not be stored.",
        )
    })?;
    state
        .config
        .auth
        .put_secret(
            &context.principal_id,
            site_id,
            SecretPurpose::G5Api,
            &encrypted_payload,
        )
        .await
        .map_err(auth_error)
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

async fn core_execute(
    State(state): State<AppState>,
    Path((site_id, operation_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<CoreExecuteRequest>,
) -> Response {
    let operation = match core_operation(&operation_id) {
        Some(value) => value,
        None => {
            return api_error(
                StatusCode::NOT_FOUND,
                "core_operation_not_found",
                "Core operation was not found.",
            );
        }
    };
    if operation.transport != "core_proxy" {
        return connector_error(ConnectorError::SpecializedOperation);
    }
    if operation.risk == "external_effect" {
        return connector_error(ConnectorError::ExternalEffectBlocked);
    }
    if operation.risk == "destructive" && !payload.confirm_destructive {
        return connector_error(ConnectorError::InvalidCoreRequest);
    }
    let (context, principal, site) = match owned_site_context(&state, &headers, site_id, true).await
    {
        Ok(value) => value,
        Err(response) => return response,
    };
    if operation.requires_step_up
        && let Err(error) = state.config.auth.require_recent_step_up(&principal)
    {
        return auth_error(error);
    }
    let credentials = match connector_credentials(&state, &context, &site.site_id).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state
        .config
        .connector
        .core_execute(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &operation_id,
            &payload,
        )
        .await
    {
        Ok(response) => Json::<CoreExecuteResponse>(response).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_dashboard(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    Query(query): Query<AdminDashboardQuery>,
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
        .admin_get_dashboard(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            query.limit,
        )
        .await
    {
        Ok(dashboard) => Json::<AdminDashboardData>(dashboard).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_config_get(
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
        .admin_get_config(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
        )
        .await
    {
        Ok(config) => Json::<AdminConfig>(config).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_config_update(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    Json(update): Json<AdminConfigUpdate>,
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
        .admin_update_config(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &update,
        )
        .await
    {
        Ok(config) => Json::<AdminConfig>(config).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_schema_catalog(
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
        .admin_list_field_schemas(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
        )
        .await
    {
        Ok(catalog) => Json::<AdminSchemaCatalog>(catalog).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_schema_detail(
    State(state): State<AppState>,
    Path((site_id, domain)): Path<(String, String)>,
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
        .admin_get_field_schema(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &domain,
        )
        .await
    {
        Ok(schema) => Json::<AdminSchemaDetail>(schema).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn member_me(
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
        .member_get_my_profile(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
        )
        .await
    {
        Ok(profile) => Json::<MemberProfile>(profile).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_auth_list(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    Query(query): Query<AdminAuthListQuery>,
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
        .admin_list_auth(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &query,
        )
        .await
    {
        Ok(items) => Json::<AdminAuthMemberList>(items).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_auth_upsert(
    State(state): State<AppState>,
    Path((site_id, mb_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(update): Json<AdminAuthUpsert>,
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
        .admin_upsert_auth(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &mb_id,
            &update,
        )
        .await
    {
        Ok(item) => Json::<AdminAuthMember>(item).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_auth_delete_member(
    State(state): State<AppState>,
    Path((site_id, mb_id)): Path<(String, String)>,
    headers: HeaderMap,
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
        .admin_delete_auth_by_member(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &mb_id,
        )
        .await
    {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_permission_list(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    Query(query): Query<AdminSystemPermissionListQuery>,
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
        .admin_system_list_auths(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &query,
        )
        .await
    {
        Ok(items) => Json::<AdminSystemPermissionList>(items).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_permission_save(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    Json(input): Json<AdminSystemPermissionSave>,
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
        .admin_system_save_auth(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &input,
        )
        .await
    {
        Ok(item) => Json::<AdminSystemPermission>(item).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_permission_delete(
    State(state): State<AppState>,
    Path((site_id, mb_id, au_menu)): Path<(String, String, String)>,
    headers: HeaderMap,
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
        .admin_system_delete_auth(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &mb_id,
            &au_menu,
        )
        .await
    {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_member_list(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    Query(query): Query<AdminMemberListQuery>,
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
        .admin_list_members(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &query,
        )
        .await
    {
        Ok(items) => Json::<AdminMemberList>(items).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_member_export(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    Query(query): Query<AdminMemberListQuery>,
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
        .admin_export_members(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &query,
        )
        .await
    {
        Ok(items) => Json::<AdminMemberList>(items).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_member_get(
    State(state): State<AppState>,
    Path((site_id, mb_id)): Path<(String, String)>,
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
        .admin_get_member(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &mb_id,
        )
        .await
    {
        Ok(member) => Json::<AdminMember>(member).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_member_update(
    State(state): State<AppState>,
    Path((site_id, mb_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(update): Json<AdminMemberUpdate>,
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
        .admin_update_member(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &mb_id,
            &update,
        )
        .await
    {
        Ok(member) => Json::<AdminMember>(member).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_member_delete(
    State(state): State<AppState>,
    Path((site_id, mb_id)): Path<(String, String)>,
    headers: HeaderMap,
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
        .admin_delete_member(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &mb_id,
        )
        .await
    {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_member_level_update(
    State(state): State<AppState>,
    Path((site_id, mb_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(update): Json<AdminMemberLevelUpdate>,
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
        .admin_update_member_level(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &mb_id,
            &update,
        )
        .await
    {
        Ok(member) => Json::<AdminMember>(member).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_member_icon_upload(
    State(state): State<AppState>,
    Path((site_id, mb_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(upload): Json<AdminMemberMediaUpload>,
) -> Response {
    admin_member_media_upload(state, headers, site_id, mb_id, "icon", upload).await
}

async fn admin_member_image_upload(
    State(state): State<AppState>,
    Path((site_id, mb_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(upload): Json<AdminMemberMediaUpload>,
) -> Response {
    admin_member_media_upload(state, headers, site_id, mb_id, "image", upload).await
}

async fn admin_member_media_upload(
    state: AppState,
    headers: HeaderMap,
    site_id: String,
    mb_id: String,
    kind: &str,
    upload: AdminMemberMediaUpload,
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
        .admin_upload_member_media(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &mb_id,
            kind,
            &upload,
        )
        .await
    {
        Ok(result) => Json::<AdminMemberMediaUploadResult>(result).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_member_icon_delete(
    State(state): State<AppState>,
    Path((site_id, mb_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Response {
    admin_member_media_delete(state, headers, site_id, mb_id, "icon").await
}

async fn admin_member_image_delete(
    State(state): State<AppState>,
    Path((site_id, mb_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Response {
    admin_member_media_delete(state, headers, site_id, mb_id, "image").await
}

async fn admin_member_media_delete(
    state: AppState,
    headers: HeaderMap,
    site_id: String,
    mb_id: String,
    kind: &str,
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
        .admin_delete_member_media(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &mb_id,
            kind,
        )
        .await
    {
        Ok(result) => Json::<AdminMemberMediaDeleteResult>(result).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_board_list(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    Query(query): Query<AdminBoardListQuery>,
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
        .admin_list_boards(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &query,
        )
        .await
    {
        Ok(boards) => Json::<AdminBoardList>(boards).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_board_create(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    Json(create): Json<AdminBoardCreate>,
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
        .admin_create_board(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &create,
        )
        .await
    {
        Ok(board) => (StatusCode::CREATED, Json::<AdminBoard>(board)).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_board_get(
    State(state): State<AppState>,
    Path((site_id, bo_table)): Path<(String, String)>,
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
        .admin_get_board(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &bo_table,
        )
        .await
    {
        Ok(board) => Json::<AdminBoard>(board).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_board_update(
    State(state): State<AppState>,
    Path((site_id, bo_table)): Path<(String, String)>,
    headers: HeaderMap,
    Json(update): Json<AdminBoardUpdate>,
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
        .admin_update_board(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &bo_table,
            &update,
        )
        .await
    {
        Ok(board) => Json::<AdminBoard>(board).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_board_delete(
    State(state): State<AppState>,
    Path((site_id, bo_table)): Path<(String, String)>,
    headers: HeaderMap,
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
        .admin_delete_board(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &bo_table,
        )
        .await
    {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_board_copy(
    State(state): State<AppState>,
    Path((site_id, bo_table)): Path<(String, String)>,
    headers: HeaderMap,
    Json(copy): Json<AdminBoardCopy>,
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
        .admin_copy_board(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &bo_table,
            &copy,
        )
        .await
    {
        Ok(board) => (StatusCode::CREATED, Json::<AdminBoard>(board)).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_board_new_posts_delete(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    Json(delete): Json<AdminNewPostsDelete>,
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
        .admin_delete_new_posts(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &delete,
        )
        .await
    {
        Ok(result) => Json::<AdminNewPostsDeleteResult>(result).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_content_list(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    Query(query): Query<AdminContentListQuery>,
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
        .admin_list_contents(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &query,
        )
        .await
    {
        Ok(contents) => Json::<AdminContentList>(contents).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_content_create(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    Json(create): Json<AdminContentCreate>,
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
        .admin_create_content(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &create,
        )
        .await
    {
        Ok(content) => (StatusCode::CREATED, Json::<AdminContent>(content)).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_content_get(
    State(state): State<AppState>,
    Path((site_id, co_id)): Path<(String, String)>,
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
        .admin_get_content(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &co_id,
        )
        .await
    {
        Ok(content) => Json::<AdminContent>(content).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_content_update(
    State(state): State<AppState>,
    Path((site_id, co_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(update): Json<AdminContentUpdate>,
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
        .admin_update_content(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &co_id,
            &update,
        )
        .await
    {
        Ok(content) => Json::<AdminContent>(content).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_content_delete(
    State(state): State<AppState>,
    Path((site_id, co_id)): Path<(String, String)>,
    headers: HeaderMap,
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
        .admin_delete_content(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &co_id,
        )
        .await
    {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_faq_master_list(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    Query(query): Query<AdminFaqMasterListQuery>,
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
        .admin_list_faq_masters(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &query,
        )
        .await
    {
        Ok(items) => Json::<AdminFaqMasterList>(items).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_faq_master_create(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    Json(create): Json<AdminFaqMasterCreate>,
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
        .admin_create_faq_master(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &create,
        )
        .await
    {
        Ok(item) => (StatusCode::CREATED, Json::<AdminFaqMasterDetail>(item)).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_faq_master_get(
    State(state): State<AppState>,
    Path((site_id, fm_id)): Path<(String, i64)>,
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
        .admin_get_faq_master(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            fm_id,
        )
        .await
    {
        Ok(item) => Json::<AdminFaqMasterDetail>(item).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_faq_master_update(
    State(state): State<AppState>,
    Path((site_id, fm_id)): Path<(String, i64)>,
    headers: HeaderMap,
    Json(update): Json<AdminFaqMasterUpdate>,
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
        .admin_update_faq_master(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            fm_id,
            &update,
        )
        .await
    {
        Ok(item) => Json::<AdminFaqMasterDetail>(item).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_faq_master_delete(
    State(state): State<AppState>,
    Path((site_id, fm_id)): Path<(String, i64)>,
    headers: HeaderMap,
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
        .admin_delete_faq_master(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            fm_id,
        )
        .await
    {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_faq_master_header_image_upload(
    State(state): State<AppState>,
    Path((site_id, fm_id)): Path<(String, i64)>,
    headers: HeaderMap,
    Json(upload): Json<AdminFaqImageUpload>,
) -> Response {
    admin_faq_master_image_upload(state, headers, site_id, fm_id, "header", upload).await
}

async fn admin_faq_master_footer_image_upload(
    State(state): State<AppState>,
    Path((site_id, fm_id)): Path<(String, i64)>,
    headers: HeaderMap,
    Json(upload): Json<AdminFaqImageUpload>,
) -> Response {
    admin_faq_master_image_upload(state, headers, site_id, fm_id, "footer", upload).await
}

async fn admin_faq_master_image_upload(
    state: AppState,
    headers: HeaderMap,
    site_id: String,
    fm_id: i64,
    kind: &str,
    upload: AdminFaqImageUpload,
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
        .admin_upload_faq_master_image(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            fm_id,
            kind,
            &upload,
        )
        .await
    {
        Ok(image) => Json::<AdminFaqImage>(image).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_faq_master_header_image_delete(
    State(state): State<AppState>,
    Path((site_id, fm_id)): Path<(String, i64)>,
    headers: HeaderMap,
) -> Response {
    admin_faq_master_image_delete(state, headers, site_id, fm_id, "header").await
}

async fn admin_faq_master_footer_image_delete(
    State(state): State<AppState>,
    Path((site_id, fm_id)): Path<(String, i64)>,
    headers: HeaderMap,
) -> Response {
    admin_faq_master_image_delete(state, headers, site_id, fm_id, "footer").await
}

async fn admin_faq_master_image_content(
    State(state): State<AppState>,
    Path((site_id, fm_id, kind)): Path<(String, i64, String)>,
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
    let detail = match state
        .config
        .connector
        .admin_get_faq_master(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            fm_id,
        )
        .await
    {
        Ok(value) => value,
        Err(error) => return connector_error(error),
    };
    let (image, suffix) = match kind.as_str() {
        "header" => (&detail.header_image, "h"),
        "footer" => (&detail.footer_image, "t"),
        _ => return api_error(StatusCode::NOT_FOUND, "route_not_found", "Route not found."),
    };
    if !image.exists {
        return api_error(
            StatusCode::NOT_FOUND,
            "faq_image_not_found",
            "FAQ image not found.",
        );
    }
    if image.relative_path != format!("faq/{fm_id}_{suffix}") {
        return connector_error(ConnectorError::Contract);
    }
    let mime = match image.mime.as_deref() {
        Some(value @ ("image/png" | "image/jpeg" | "image/gif")) => value,
        _ => return connector_error(ConnectorError::Contract),
    };
    let content = match state
        .config
        .connector
        .admin_get_faq_master_image_content(&site.base_url, &context.request_id, fm_id, &kind)
        .await
    {
        Ok(value) => value,
        Err(error) => return connector_error(error),
    };
    if !matches_faq_image_signature(mime, &content.bytes) {
        return connector_error(ConnectorError::Contract);
    }
    let mut response = Response::new(Body::from(content.bytes));
    response.headers_mut().insert(
        CONTENT_TYPE,
        HeaderValue::from_str(mime).expect("fixed image MIME"),
    );
    response
        .headers_mut()
        .insert(CACHE_CONTROL, HeaderValue::from_static("private, no-store"));
    response.headers_mut().insert(
        HeaderName::from_static("x-content-type-options"),
        HeaderValue::from_static("nosniff"),
    );
    response
}

fn matches_faq_image_signature(mime: &str, bytes: &[u8]) -> bool {
    match mime {
        "image/png" => bytes.starts_with(&[0x89, b'P', b'N', b'G', 0x0d, 0x0a, 0x1a, 0x0a]),
        "image/jpeg" => bytes.starts_with(&[0xff, 0xd8, 0xff]),
        "image/gif" => bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a"),
        _ => false,
    }
}

async fn admin_faq_master_image_delete(
    state: AppState,
    headers: HeaderMap,
    site_id: String,
    fm_id: i64,
    kind: &str,
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
        .admin_delete_faq_master_image(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            fm_id,
            kind,
        )
        .await
    {
        Ok(image) => Json::<AdminFaqImage>(image).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_faq_list(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    Query(query): Query<AdminFaqListQuery>,
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
        .admin_list_faqs(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &query,
        )
        .await
    {
        Ok(items) => Json::<AdminFaqList>(items).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_faq_create(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    Json(create): Json<AdminFaqCreate>,
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
        .admin_create_faq(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &create,
        )
        .await
    {
        Ok(item) => (StatusCode::CREATED, Json::<AdminFaqItem>(item)).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_faq_get(
    State(state): State<AppState>,
    Path((site_id, fa_id)): Path<(String, i64)>,
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
        .admin_get_faq(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            fa_id,
        )
        .await
    {
        Ok(item) => Json::<AdminFaqItem>(item).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_faq_update(
    State(state): State<AppState>,
    Path((site_id, fa_id)): Path<(String, i64)>,
    headers: HeaderMap,
    Json(update): Json<AdminFaqUpdate>,
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
        .admin_update_faq(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            fa_id,
            &update,
        )
        .await
    {
        Ok(item) => Json::<AdminFaqItem>(item).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_faq_delete(
    State(state): State<AppState>,
    Path((site_id, fa_id)): Path<(String, i64)>,
    headers: HeaderMap,
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
        .admin_delete_faq(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            fa_id,
        )
        .await
    {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_menu_list(
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
        .admin_list_menus(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
        )
        .await
    {
        Ok(items) => Json::<AdminMenuList>(items).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_menu_create(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    Json(create): Json<AdminMenuCreate>,
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
        .admin_create_menu(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &create,
        )
        .await
    {
        Ok(menu) => (StatusCode::CREATED, Json::<AdminMenu>(menu)).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_menu_get(
    State(state): State<AppState>,
    Path((site_id, me_id)): Path<(String, i64)>,
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
        .admin_get_menu(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            me_id,
        )
        .await
    {
        Ok(menu) => Json::<AdminMenu>(menu).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_menu_update(
    State(state): State<AppState>,
    Path((site_id, me_id)): Path<(String, i64)>,
    headers: HeaderMap,
    Json(update): Json<AdminMenuUpdate>,
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
        .admin_update_menu(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            me_id,
            &update,
        )
        .await
    {
        Ok(menu) => Json::<AdminMenu>(menu).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_menu_delete(
    State(state): State<AppState>,
    Path((site_id, me_id)): Path<(String, i64)>,
    headers: HeaderMap,
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
        .admin_delete_menu(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            me_id,
        )
        .await
    {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_menu_reorder(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    Json(reorder): Json<AdminMenuReorder>,
) -> Response {
    menu_reorder(state, headers, site_id, reorder, false).await
}

async fn admin_menu_reorder_legacy(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    Json(reorder): Json<AdminMenuReorder>,
) -> Response {
    menu_reorder(state, headers, site_id, reorder, true).await
}

async fn menu_reorder(
    state: AppState,
    headers: HeaderMap,
    site_id: String,
    reorder: AdminMenuReorder,
    legacy: bool,
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
    let result = if legacy {
        state
            .config
            .connector
            .admin_reorder_menus_legacy(
                &site.base_url,
                &context.request_id,
                &credentials.access_token,
                &reorder,
            )
            .await
    } else {
        state
            .config
            .connector
            .admin_reorder_menus(
                &site.base_url,
                &context.request_id,
                &credentials.access_token,
                &reorder,
            )
            .await
    };
    match result {
        Ok(value) => Json::<AdminMenuReorderResult>(value).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_layout_list(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    Query(query): Query<AdminLayoutListQuery>,
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
        .admin_list_layouts(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &query,
        )
        .await
    {
        Ok(layouts) => Json::<AdminLayoutList>(layouts).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_layout_get(
    State(state): State<AppState>,
    Path((site_id, page_id)): Path<(String, String)>,
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
        .admin_get_layout(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &page_id,
        )
        .await
    {
        Ok(layout) => Json::<AdminLayoutDetail>(layout).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_layout_save(
    State(state): State<AppState>,
    Path((site_id, page_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(save): Json<AdminLayoutSave>,
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
        .admin_save_layout(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &page_id,
            &save,
        )
        .await
    {
        Ok(layout) => Json::<AdminLayoutDetail>(layout).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_layout_widget_add(
    State(state): State<AppState>,
    Path((site_id, page_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(create): Json<AdminLayoutWidgetCreate>,
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
        .admin_add_layout_widget(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &page_id,
            &create,
        )
        .await
    {
        Ok(layout) => (StatusCode::CREATED, Json::<AdminLayoutDetail>(layout)).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_layout_widget_update(
    State(state): State<AppState>,
    Path((site_id, page_id, widget_id)): Path<(String, String, String)>,
    headers: HeaderMap,
    Json(update): Json<AdminLayoutWidgetUpdate>,
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
        .admin_update_layout_widget(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &page_id,
            &widget_id,
            &update,
        )
        .await
    {
        Ok(layout) => Json::<AdminLayoutDetail>(layout).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_layout_widget_delete(
    State(state): State<AppState>,
    Path((site_id, page_id, widget_id)): Path<(String, String, String)>,
    headers: HeaderMap,
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
        .admin_delete_layout_widget(
            &site.base_url,
            &context.request_id,
            &credentials.access_token,
            &page_id,
            &widget_id,
        )
        .await
    {
        Ok(layout) => Json::<AdminLayoutDetail>(layout).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_layout_widget_reorder(
    State(state): State<AppState>,
    Path((site_id, page_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(reorder): Json<AdminLayoutWidgetReorder>,
) -> Response {
    layout_widget_reorder(state, headers, site_id, page_id, reorder, false).await
}

async fn admin_layout_widget_reorder_legacy(
    State(state): State<AppState>,
    Path((site_id, page_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(reorder): Json<AdminLayoutWidgetReorder>,
) -> Response {
    layout_widget_reorder(state, headers, site_id, page_id, reorder, true).await
}

async fn layout_widget_reorder(
    state: AppState,
    headers: HeaderMap,
    site_id: String,
    page_id: String,
    reorder: AdminLayoutWidgetReorder,
    legacy: bool,
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
    let result = if legacy {
        state
            .config
            .connector
            .admin_reorder_layout_widgets_legacy(
                &site.base_url,
                &context.request_id,
                &credentials.access_token,
                &page_id,
                &reorder,
            )
            .await
    } else {
        state
            .config
            .connector
            .admin_reorder_layout_widgets(
                &site.base_url,
                &context.request_id,
                &credentials.access_token,
                &page_id,
                &reorder,
            )
            .await
    };
    match result {
        Ok(layout) => Json::<AdminLayoutDetail>(layout).into_response(),
        Err(error) => connector_error(error),
    }
}

#[derive(Clone, Copy)]
enum BoardGroupRouteKind {
    Canonical,
    Legacy,
}

async fn admin_board_group_list(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
) -> Response {
    board_group_list(state, headers, site_id, BoardGroupRouteKind::Canonical).await
}

async fn admin_legacy_group_list(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
) -> Response {
    board_group_list(state, headers, site_id, BoardGroupRouteKind::Legacy).await
}

async fn board_group_list(
    state: AppState,
    headers: HeaderMap,
    site_id: String,
    kind: BoardGroupRouteKind,
) -> Response {
    let (context, _, site) = match owned_site_context(&state, &headers, site_id, false).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let credentials = match connector_credentials(&state, &context, &site.site_id).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let result = match kind {
        BoardGroupRouteKind::Canonical => {
            state
                .config
                .connector
                .admin_list_board_groups(
                    &site.base_url,
                    &context.request_id,
                    &credentials.access_token,
                )
                .await
        }
        BoardGroupRouteKind::Legacy => {
            state
                .config
                .connector
                .admin_legacy_list_groups(
                    &site.base_url,
                    &context.request_id,
                    &credentials.access_token,
                )
                .await
        }
    };
    match result {
        Ok(groups) => Json::<AdminBoardGroupList>(groups).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_board_group_create(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    Json(create): Json<AdminBoardGroupCreate>,
) -> Response {
    board_group_create(
        state,
        headers,
        site_id,
        create,
        BoardGroupRouteKind::Canonical,
    )
    .await
}

async fn admin_legacy_group_create(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    Json(create): Json<AdminBoardGroupCreate>,
) -> Response {
    board_group_create(state, headers, site_id, create, BoardGroupRouteKind::Legacy).await
}

async fn board_group_create(
    state: AppState,
    headers: HeaderMap,
    site_id: String,
    create: AdminBoardGroupCreate,
    kind: BoardGroupRouteKind,
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
    let result = match kind {
        BoardGroupRouteKind::Canonical => {
            state
                .config
                .connector
                .admin_create_board_group(
                    &site.base_url,
                    &context.request_id,
                    &credentials.access_token,
                    &create,
                )
                .await
        }
        BoardGroupRouteKind::Legacy => {
            state
                .config
                .connector
                .admin_legacy_create_group(
                    &site.base_url,
                    &context.request_id,
                    &credentials.access_token,
                    &create,
                )
                .await
        }
    };
    match result {
        Ok(group) => (StatusCode::CREATED, Json::<AdminBoardGroup>(group)).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_board_group_get(
    State(state): State<AppState>,
    Path((site_id, gr_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Response {
    board_group_get(
        state,
        headers,
        site_id,
        gr_id,
        BoardGroupRouteKind::Canonical,
    )
    .await
}

async fn admin_legacy_group_get(
    State(state): State<AppState>,
    Path((site_id, gr_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Response {
    board_group_get(state, headers, site_id, gr_id, BoardGroupRouteKind::Legacy).await
}

async fn board_group_get(
    state: AppState,
    headers: HeaderMap,
    site_id: String,
    gr_id: String,
    kind: BoardGroupRouteKind,
) -> Response {
    let (context, _, site) = match owned_site_context(&state, &headers, site_id, false).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let credentials = match connector_credentials(&state, &context, &site.site_id).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let result = match kind {
        BoardGroupRouteKind::Canonical => {
            state
                .config
                .connector
                .admin_get_board_group(
                    &site.base_url,
                    &context.request_id,
                    &credentials.access_token,
                    &gr_id,
                )
                .await
        }
        BoardGroupRouteKind::Legacy => {
            state
                .config
                .connector
                .admin_legacy_get_group(
                    &site.base_url,
                    &context.request_id,
                    &credentials.access_token,
                    &gr_id,
                )
                .await
        }
    };
    match result {
        Ok(group) => Json::<AdminBoardGroup>(group).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_board_group_update(
    State(state): State<AppState>,
    Path((site_id, gr_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(update): Json<AdminBoardGroupUpdate>,
) -> Response {
    board_group_update(
        state,
        headers,
        site_id,
        gr_id,
        update,
        BoardGroupRouteKind::Canonical,
        false,
    )
    .await
}

async fn admin_board_group_patch(
    State(state): State<AppState>,
    Path((site_id, gr_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(update): Json<AdminBoardGroupUpdate>,
) -> Response {
    board_group_update(
        state,
        headers,
        site_id,
        gr_id,
        update,
        BoardGroupRouteKind::Canonical,
        true,
    )
    .await
}

async fn admin_legacy_group_update(
    State(state): State<AppState>,
    Path((site_id, gr_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(update): Json<AdminBoardGroupUpdate>,
) -> Response {
    board_group_update(
        state,
        headers,
        site_id,
        gr_id,
        update,
        BoardGroupRouteKind::Legacy,
        false,
    )
    .await
}

async fn board_group_update(
    state: AppState,
    headers: HeaderMap,
    site_id: String,
    gr_id: String,
    update: AdminBoardGroupUpdate,
    kind: BoardGroupRouteKind,
    patch: bool,
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
    let result = match (kind, patch) {
        (BoardGroupRouteKind::Canonical, true) => {
            state
                .config
                .connector
                .admin_patch_board_group(
                    &site.base_url,
                    &context.request_id,
                    &credentials.access_token,
                    &gr_id,
                    &update,
                )
                .await
        }
        (BoardGroupRouteKind::Canonical, false) => {
            state
                .config
                .connector
                .admin_update_board_group(
                    &site.base_url,
                    &context.request_id,
                    &credentials.access_token,
                    &gr_id,
                    &update,
                )
                .await
        }
        (BoardGroupRouteKind::Legacy, _) => {
            state
                .config
                .connector
                .admin_legacy_update_group(
                    &site.base_url,
                    &context.request_id,
                    &credentials.access_token,
                    &gr_id,
                    &update,
                )
                .await
        }
    };
    match result {
        Ok(group) => Json::<AdminBoardGroup>(group).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_board_group_delete(
    State(state): State<AppState>,
    Path((site_id, gr_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Response {
    board_group_delete(
        state,
        headers,
        site_id,
        gr_id,
        BoardGroupRouteKind::Canonical,
    )
    .await
}

async fn admin_legacy_group_delete(
    State(state): State<AppState>,
    Path((site_id, gr_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Response {
    board_group_delete(state, headers, site_id, gr_id, BoardGroupRouteKind::Legacy).await
}

async fn board_group_delete(
    state: AppState,
    headers: HeaderMap,
    site_id: String,
    gr_id: String,
    kind: BoardGroupRouteKind,
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
    let result = match kind {
        BoardGroupRouteKind::Canonical => {
            state
                .config
                .connector
                .admin_delete_board_group(
                    &site.base_url,
                    &context.request_id,
                    &credentials.access_token,
                    &gr_id,
                )
                .await
        }
        BoardGroupRouteKind::Legacy => {
            state
                .config
                .connector
                .admin_legacy_delete_group(
                    &site.base_url,
                    &context.request_id,
                    &credentials.access_token,
                    &gr_id,
                )
                .await
        }
    };
    match result {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_board_group_member_list(
    State(state): State<AppState>,
    Path((site_id, gr_id)): Path<(String, String)>,
    Query(query): Query<AdminBoardGroupMemberListQuery>,
    headers: HeaderMap,
) -> Response {
    board_group_member_list(
        state,
        headers,
        site_id,
        gr_id,
        query,
        BoardGroupRouteKind::Canonical,
    )
    .await
}

async fn admin_legacy_group_member_list(
    State(state): State<AppState>,
    Path((site_id, gr_id)): Path<(String, String)>,
    Query(query): Query<AdminBoardGroupMemberListQuery>,
    headers: HeaderMap,
) -> Response {
    board_group_member_list(
        state,
        headers,
        site_id,
        gr_id,
        query,
        BoardGroupRouteKind::Legacy,
    )
    .await
}

async fn board_group_member_list(
    state: AppState,
    headers: HeaderMap,
    site_id: String,
    gr_id: String,
    query: AdminBoardGroupMemberListQuery,
    kind: BoardGroupRouteKind,
) -> Response {
    let (context, _, site) = match owned_site_context(&state, &headers, site_id, false).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let credentials = match connector_credentials(&state, &context, &site.site_id).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let result = match kind {
        BoardGroupRouteKind::Canonical => {
            state
                .config
                .connector
                .admin_list_board_group_members(
                    &site.base_url,
                    &context.request_id,
                    &credentials.access_token,
                    &gr_id,
                    &query,
                )
                .await
        }
        BoardGroupRouteKind::Legacy => {
            state
                .config
                .connector
                .admin_legacy_list_group_members(
                    &site.base_url,
                    &context.request_id,
                    &credentials.access_token,
                    &gr_id,
                    &query,
                )
                .await
        }
    };
    match result {
        Ok(members) => Json::<AdminBoardGroupMemberList>(members).into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_board_group_member_add(
    State(state): State<AppState>,
    Path((site_id, gr_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(create): Json<AdminBoardGroupMemberCreate>,
) -> Response {
    board_group_member_add(
        state,
        headers,
        site_id,
        gr_id,
        create,
        BoardGroupRouteKind::Canonical,
    )
    .await
}

async fn admin_legacy_group_member_add(
    State(state): State<AppState>,
    Path((site_id, gr_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(create): Json<AdminBoardGroupMemberCreate>,
) -> Response {
    board_group_member_add(
        state,
        headers,
        site_id,
        gr_id,
        create,
        BoardGroupRouteKind::Legacy,
    )
    .await
}

async fn board_group_member_add(
    state: AppState,
    headers: HeaderMap,
    site_id: String,
    gr_id: String,
    create: AdminBoardGroupMemberCreate,
    kind: BoardGroupRouteKind,
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
    let result = match kind {
        BoardGroupRouteKind::Canonical => {
            state
                .config
                .connector
                .admin_add_board_group_member(
                    &site.base_url,
                    &context.request_id,
                    &credentials.access_token,
                    &gr_id,
                    &create,
                )
                .await
        }
        BoardGroupRouteKind::Legacy => {
            state
                .config
                .connector
                .admin_legacy_add_group_member(
                    &site.base_url,
                    &context.request_id,
                    &credentials.access_token,
                    &gr_id,
                    &create,
                )
                .await
        }
    };
    match result {
        Ok(member) => (
            StatusCode::CREATED,
            Json::<AdminBoardGroupMemberResult>(member),
        )
            .into_response(),
        Err(error) => connector_error(error),
    }
}

async fn admin_board_group_member_delete(
    State(state): State<AppState>,
    Path((site_id, gr_id, mb_id)): Path<(String, String, String)>,
    headers: HeaderMap,
) -> Response {
    board_group_member_delete(
        state,
        headers,
        site_id,
        gr_id,
        mb_id,
        BoardGroupRouteKind::Canonical,
    )
    .await
}

async fn admin_legacy_group_member_delete(
    State(state): State<AppState>,
    Path((site_id, gr_id, mb_id)): Path<(String, String, String)>,
    headers: HeaderMap,
) -> Response {
    board_group_member_delete(
        state,
        headers,
        site_id,
        gr_id,
        mb_id,
        BoardGroupRouteKind::Legacy,
    )
    .await
}

async fn board_group_member_delete(
    state: AppState,
    headers: HeaderMap,
    site_id: String,
    gr_id: String,
    mb_id: String,
    kind: BoardGroupRouteKind,
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
    let result = match kind {
        BoardGroupRouteKind::Canonical => {
            state
                .config
                .connector
                .admin_delete_board_group_member(
                    &site.base_url,
                    &context.request_id,
                    &credentials.access_token,
                    &gr_id,
                    &mb_id,
                )
                .await
        }
        BoardGroupRouteKind::Legacy => {
            state
                .config
                .connector
                .admin_legacy_delete_group_member(
                    &site.base_url,
                    &context.request_id,
                    &credentials.access_token,
                    &gr_id,
                    &mb_id,
                )
                .await
        }
    };
    match result {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(error) => connector_error(error),
    }
}

async fn put_ssh_profile(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    Json(profile): Json<SshProfile>,
) -> Response {
    let (context, principal, site) = match owned_site_context(&state, &headers, site_id, true).await
    {
        Ok(value) => value,
        Err(response) => return response,
    };
    if let Err(error) = state.config.auth.require_recent_step_up(&principal) {
        return auth_error(error);
    }
    if let Err(error) = state.remote.executor.validate_target(&profile).await {
        return remote_error(error);
    }
    let encoded = match serde_json::to_vec(&profile) {
        Ok(value) => value,
        Err(_) => return remote_error(RemoteError::InvalidProfile),
    };
    match state
        .config
        .auth
        .put_secret(
            &context.principal_id,
            &site.site_id,
            SecretPurpose::Ssh,
            &encoded,
        )
        .await
    {
        Ok(()) => Json::<SshProfileSummary>(profile.summary()).into_response(),
        Err(error) => auth_error(error),
    }
}

async fn get_ssh_profile(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
) -> Response {
    let (context, _, site) = match owned_site_context(&state, &headers, site_id, false).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    match load_ssh_profile(&state, &context, &site.site_id).await {
        Ok(profile) => Json::<SshProfileSummary>(profile.summary()).into_response(),
        Err(response) => response,
    }
}

async fn delete_ssh_profile(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
) -> Response {
    let (context, principal, site) = match owned_site_context(&state, &headers, site_id, true).await
    {
        Ok(value) => value,
        Err(response) => return response,
    };
    if let Err(error) = state.config.auth.require_recent_step_up(&principal) {
        return auth_error(error);
    }
    match state
        .config
        .auth
        .delete_secret(&context.principal_id, &site.site_id, SecretPurpose::Ssh)
        .await
    {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(error) => auth_error(error),
    }
}

async fn inspect_ssh_host_key(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    Json(payload): Json<HostKeyInspectRequest>,
) -> Response {
    let (_, principal, _) = match owned_site_context(&state, &headers, site_id, true).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    if let Err(error) = state.config.auth.require_recent_step_up(&principal) {
        return auth_error(error);
    }
    match state
        .remote
        .executor
        .inspect_host_key(&payload.host, payload.port)
        .await
    {
        Ok(inspection) => Json::<HostKeyInspection>(inspection).into_response(),
        Err(error) => remote_error(error),
    }
}

async fn issue_terminal_ticket(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
) -> Response {
    let (context, principal, site) = match owned_site_context(&state, &headers, site_id, true).await
    {
        Ok(value) => value,
        Err(response) => return response,
    };
    if let Err(error) = state.config.auth.require_recent_step_up(&principal) {
        return auth_error(error);
    }
    if let Err(response) = load_ssh_profile(&state, &context, &site.site_id).await {
        return response;
    }
    match state
        .remote
        .tickets
        .issue(&context.principal_id, &site.site_id)
        .await
    {
        Ok(ticket) => Json::<TerminalTicket>(ticket).into_response(),
        Err(error) => remote_error(error),
    }
}

async fn terminal_socket(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    ws: WebSocketUpgrade,
) -> Response {
    let (context, _, site) = match owned_site_context(&state, &headers, site_id, false).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let ticket = match terminal_ticket_protocol(&headers) {
        Some(value) => value,
        None => return remote_error(RemoteError::InvalidTicket),
    };
    if let Err(error) = state
        .remote
        .tickets
        .consume(&ticket, &context.principal_id, &site.site_id)
        .await
    {
        return remote_error(error);
    }
    let profile = match load_ssh_profile(&state, &context, &site.site_id).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let process = match state.remote.executor.spawn_terminal(&profile).await {
        Ok(value) => value,
        Err(error) => return remote_error(error),
    };
    ws.protocols([TERMINAL_PROTOCOL])
        .on_upgrade(move |socket| relay_terminal(socket, process))
}

async fn relay_terminal(socket: WebSocket, mut process: TerminalProcess) {
    let mut stdin = match process.take_stdin() {
        Ok(value) => value,
        Err(_) => return,
    };
    let mut stdout = match process.take_stdout() {
        Ok(value) => value,
        Err(_) => return,
    };
    let mut stderr = match process.take_stderr() {
        Ok(value) => value,
        Err(_) => return,
    };
    let (mut sender, mut receiver) = socket.split();
    let mut stdout_buffer = vec![0_u8; 16 * 1024];
    let mut stderr_buffer = vec![0_u8; 8 * 1024];
    let mut stdout_closed = false;
    let mut stderr_closed = false;
    loop {
        if stdout_closed && stderr_closed {
            break;
        }
        tokio::select! {
            inbound = receiver.next() => {
                match inbound {
                    Some(Ok(Message::Text(value))) if value.len() <= 64 * 1024 => {
                        if stdin.write_all(value.as_str().as_bytes()).await.is_err() {
                            break;
                        }
                    }
                    Some(Ok(Message::Binary(value))) if value.len() <= 64 * 1024 => {
                        if stdin.write_all(&value).await.is_err() {
                            break;
                        }
                    }
                    Some(Ok(Message::Ping(value))) => {
                        if sender.send(Message::Pong(value)).await.is_err() {
                            break;
                        }
                    }
                    Some(Ok(Message::Pong(_))) => {}
                    Some(Ok(Message::Close(_))) | Some(Err(_)) | None => break,
                    _ => break,
                }
            }
            read = stdout.read(&mut stdout_buffer), if !stdout_closed => {
                match read {
                    Ok(0) => stdout_closed = true,
                    Ok(size) => {
                        if sender.send(Message::Binary(Bytes::copy_from_slice(&stdout_buffer[..size]))).await.is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
            read = stderr.read(&mut stderr_buffer), if !stderr_closed => {
                match read {
                    Ok(0) => stderr_closed = true,
                    Ok(size) => {
                        if sender.send(Message::Binary(Bytes::copy_from_slice(&stderr_buffer[..size]))).await.is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
        }
    }
    process.terminate().await;
}

async fn sftp_operation(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    Json(operation): Json<SftpCommand>,
) -> Response {
    let (context, principal, site) = match owned_site_context(&state, &headers, site_id, true).await
    {
        Ok(value) => value,
        Err(response) => return response,
    };
    if !matches!(operation, SftpCommand::List { .. })
        && let Err(error) = state.config.auth.require_recent_step_up(&principal)
    {
        return auth_error(error);
    }
    let profile = match load_ssh_profile(&state, &context, &site.site_id).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state.remote.executor.sftp(&profile, &operation).await {
        Ok(result) => Json::<SftpResult>(result).into_response(),
        Err(error) => remote_error(error),
    }
}

async fn upload_transfer(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    body: Body,
) -> Response {
    let (context, principal, site) = match owned_site_context(&state, &headers, site_id, true).await
    {
        Ok(value) => value,
        Err(response) => return response,
    };
    if let Err(error) = state.config.auth.require_recent_step_up(&principal) {
        return auth_error(error);
    }
    let remote_path = match headers
        .get(REMOTE_PATH_HEADER)
        .and_then(|value| value.to_str().ok())
    {
        Some(value) => value.to_owned(),
        None => return remote_error(RemoteError::InvalidPath),
    };
    let profile = match load_ssh_profile(&state, &context, &site.site_id).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let job = match state
        .remote
        .transfers
        .queue(
            &context.principal_id,
            &site.site_id,
            "sftp_upload",
            &serde_json::json!({"remote_path":remote_path}),
        )
        .await
    {
        Ok(value) => value,
        Err(error) => return remote_error(error),
    };
    let cancellation = match state
        .remote
        .transfers
        .start(&context.principal_id, &job.job_id)
        .await
    {
        Ok(value) => value,
        Err(error) => return remote_error(error),
    };
    let staging = match tempfile::Builder::new()
        .prefix("g5-fleet-upload-")
        .tempdir()
    {
        Ok(value) => value,
        Err(_) => return remote_error(RemoteError::CredentialStaging),
    };
    let local_path = staging.path().join("payload");
    let mut file = match tokio::fs::File::create(&local_path).await {
        Ok(value) => value,
        Err(_) => return remote_error(RemoteError::CredentialStaging),
    };
    let mut stream = body.into_data_stream();
    let mut transferred = 0_u64;
    while let Some(chunk) = stream.next().await {
        let chunk = match chunk {
            Ok(value) => value,
            Err(_) => {
                let _ = state
                    .remote
                    .transfers
                    .fail(&context.principal_id, &job.job_id)
                    .await;
                return remote_error(RemoteError::Process);
            }
        };
        transferred = transferred.saturating_add(chunk.len() as u64);
        if transferred > MAX_TRANSFER_BYTES || file.write_all(&chunk).await.is_err() {
            let _ = state
                .remote
                .transfers
                .fail(&context.principal_id, &job.job_id)
                .await;
            return remote_error(RemoteError::InvalidPath);
        }
    }
    if file.sync_all().await.is_err() {
        let _ = state
            .remote
            .transfers
            .fail(&context.principal_id, &job.job_id)
            .await;
        return remote_error(RemoteError::CredentialStaging);
    }
    drop(file);
    if let Err(error) = state
        .remote
        .executor
        .upload_cancellable(&profile, &local_path, &remote_path, cancellation)
        .await
    {
        if matches!(error, RemoteError::Cancelled) {
            state
                .remote
                .transfers
                .finish_controlled(&context.principal_id, &job.job_id)
                .await;
        } else {
            let _ = state
                .remote
                .transfers
                .fail(&context.principal_id, &job.job_id)
                .await;
        }
        return remote_error(error);
    }
    if let Err(error) = state
        .remote
        .transfers
        .succeed(&context.principal_id, &job.job_id, transferred)
        .await
    {
        return remote_error(error);
    }
    match state
        .remote
        .transfers
        .get(&context.principal_id, &job.job_id)
        .await
    {
        Ok(value) => Json::<JobRecord>(value).into_response(),
        Err(error) => remote_error(error),
    }
}

async fn download_transfer(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    Json(payload): Json<RemotePathRequest>,
) -> Response {
    let (context, principal, site) = match owned_site_context(&state, &headers, site_id, true).await
    {
        Ok(value) => value,
        Err(response) => return response,
    };
    if let Err(error) = state.config.auth.require_recent_step_up(&principal) {
        return auth_error(error);
    }
    let profile = match load_ssh_profile(&state, &context, &site.site_id).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let job = match state
        .remote
        .transfers
        .queue(
            &context.principal_id,
            &site.site_id,
            "sftp_download",
            &serde_json::json!({"remote_path":payload.path}),
        )
        .await
    {
        Ok(value) => value,
        Err(error) => return remote_error(error),
    };
    let cancellation = match state
        .remote
        .transfers
        .start(&context.principal_id, &job.job_id)
        .await
    {
        Ok(value) => value,
        Err(error) => return remote_error(error),
    };
    let staging = match tempfile::Builder::new()
        .prefix("g5-fleet-download-")
        .tempdir()
    {
        Ok(value) => value,
        Err(_) => return remote_error(RemoteError::CredentialStaging),
    };
    let local_path = staging.path().join("payload");
    if let Err(error) = state
        .remote
        .executor
        .download_cancellable(&profile, &payload.path, &local_path, cancellation)
        .await
    {
        if matches!(error, RemoteError::Cancelled) {
            state
                .remote
                .transfers
                .finish_controlled(&context.principal_id, &job.job_id)
                .await;
        } else {
            let _ = state
                .remote
                .transfers
                .fail(&context.principal_id, &job.job_id)
                .await;
        }
        return remote_error(error);
    }
    let size = match tokio::fs::metadata(&local_path).await {
        Ok(value) if value.len() <= MAX_TRANSFER_BYTES => value.len(),
        _ => {
            let _ = state
                .remote
                .transfers
                .fail(&context.principal_id, &job.job_id)
                .await;
            return remote_error(RemoteError::InvalidPath);
        }
    };
    if let Err(error) = state
        .remote
        .transfers
        .succeed(&context.principal_id, &job.job_id, size)
        .await
    {
        return remote_error(error);
    }
    let file = match tokio::fs::File::open(&local_path).await {
        Ok(value) => value,
        Err(_) => return remote_error(RemoteError::Process),
    };
    let body_stream = stream::unfold((file, staging), |(mut file, staging)| async move {
        let mut buffer = vec![0_u8; 32 * 1024];
        match file.read(&mut buffer).await {
            Ok(0) => None,
            Ok(size) => {
                buffer.truncate(size);
                Some((
                    Ok::<Bytes, std::io::Error>(Bytes::from(buffer)),
                    (file, staging),
                ))
            }
            Err(error) => Some((Err(error), (file, staging))),
        }
    });
    let mut response = Response::new(Body::from_stream(body_stream));
    response.headers_mut().insert(
        CONTENT_TYPE,
        HeaderValue::from_static("application/octet-stream"),
    );
    if let Ok(value) = HeaderValue::from_str(&job.job_id) {
        response.headers_mut().insert("x-g5-fleet-job-id", value);
    }
    response
}

async fn get_transfer(
    State(state): State<AppState>,
    Path((site_id, job_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Response {
    let (context, _, site) = match owned_site_context(&state, &headers, site_id, false).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state
        .remote
        .transfers
        .get(&context.principal_id, &job_id)
        .await
    {
        Ok(job) if job.site_id.as_deref() == Some(site.site_id.as_str()) => {
            Json::<JobRecord>(job).into_response()
        }
        Ok(_) => api_error(
            StatusCode::NOT_FOUND,
            "transfer_not_found",
            "Transfer was not found.",
        ),
        Err(error) => remote_error(error),
    }
}

async fn list_transfers(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
) -> Response {
    let (context, _, site) = match owned_site_context(&state, &headers, site_id, false).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state
        .remote
        .transfers
        .snapshot(&context.principal_id, &site.site_id)
        .await
    {
        Ok(snapshot) => Json::<TransferQueueSnapshot>(snapshot).into_response(),
        Err(error) => remote_error(error),
    }
}

async fn set_transfer_concurrency(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    Json(payload): Json<TransferConcurrencyRequest>,
) -> Response {
    let (context, principal, site) = match owned_site_context(&state, &headers, site_id, true).await
    {
        Ok(value) => value,
        Err(response) => return response,
    };
    if let Err(error) = state.config.auth.require_recent_step_up(&principal) {
        return auth_error(error);
    }
    match state
        .remote
        .transfers
        .set_concurrency(
            &context.principal_id,
            &site.site_id,
            payload.concurrency_limit,
        )
        .await
    {
        Ok(snapshot) => Json::<TransferQueueSnapshot>(snapshot).into_response(),
        Err(error) => remote_error(error),
    }
}

async fn cancel_transfer(
    State(state): State<AppState>,
    Path((site_id, job_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Response {
    transfer_transition(&state, &headers, site_id, job_id, TransferAction::Cancel).await
}

async fn retry_transfer(
    State(state): State<AppState>,
    Path((site_id, job_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Response {
    transfer_transition(&state, &headers, site_id, job_id, TransferAction::Retry).await
}

async fn pause_transfer(
    State(state): State<AppState>,
    Path((site_id, job_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Response {
    transfer_transition(&state, &headers, site_id, job_id, TransferAction::Pause).await
}

async fn enqueue_notification(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
    headers: HeaderMap,
    Json(payload): Json<EnqueueNotificationRequest>,
) -> Response {
    let (context, principal, site) = match owned_site_context(&state, &headers, site_id, true).await
    {
        Ok(value) => value,
        Err(response) => return response,
    };
    if let Err(error) = state.config.auth.require_recent_step_up(&principal) {
        return auth_error(error);
    }
    match state
        .notifications
        .enqueue(
            &context.principal_id,
            &site.site_id,
            &payload.event_id,
            payload.channel,
            payload.payload,
        )
        .await
    {
        Ok(result) => (
            if result.inserted {
                StatusCode::CREATED
            } else {
                StatusCode::OK
            },
            Json(result),
        )
            .into_response(),
        Err(error) => notify_error(error),
    }
}

async fn get_notification(
    State(state): State<AppState>,
    Path((site_id, outbox_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Response {
    let (context, _, site) = match owned_site_context(&state, &headers, site_id, false).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state
        .notifications
        .get(&context.principal_id, &site.site_id, &outbox_id)
        .await
    {
        Ok(Some(notification)) => Json(notification).into_response(),
        Ok(None) => api_error(
            StatusCode::NOT_FOUND,
            "notification_not_found",
            "Notification was not found.",
        ),
        Err(error) => notify_error(error),
    }
}

async fn transfer_transition(
    state: &AppState,
    headers: &HeaderMap,
    site_id: String,
    job_id: String,
    action: TransferAction,
) -> Response {
    let (context, principal, site) = match owned_site_context(state, headers, site_id, true).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    if let Err(error) = state.config.auth.require_recent_step_up(&principal) {
        return auth_error(error);
    }
    let job = match state
        .remote
        .transfers
        .get(&context.principal_id, &job_id)
        .await
    {
        Ok(value) if value.site_id.as_deref() == Some(site.site_id.as_str()) => value,
        _ => {
            return api_error(
                StatusCode::NOT_FOUND,
                "transfer_not_found",
                "Transfer was not found.",
            );
        }
    };
    let result = match action {
        TransferAction::Cancel => {
            state
                .remote
                .transfers
                .cancel(&context.principal_id, &job.job_id)
                .await
        }
        TransferAction::Pause => {
            state
                .remote
                .transfers
                .pause(&context.principal_id, &job.job_id)
                .await
        }
        TransferAction::Retry => {
            state
                .remote
                .transfers
                .retry(&context.principal_id, &job.job_id)
                .await
        }
    };
    match result {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(error) => remote_error(error),
    }
}

async fn load_ssh_profile(
    state: &AppState,
    context: &RequestContext,
    site_id: &str,
) -> Result<SshProfile, Response> {
    let encrypted = state
        .config
        .auth
        .decrypt_secret_for_connector(&context.principal_id, site_id, SecretPurpose::Ssh)
        .await
        .map_err(auth_error)?;
    let profile: SshProfile = serde_json::from_slice(&encrypted)
        .map_err(|_| remote_error(RemoteError::InvalidProfile))?;
    profile.validate().map_err(remote_error).map(|()| profile)
}

fn terminal_ticket_protocol(headers: &HeaderMap) -> Option<String> {
    headers
        .get("sec-websocket-protocol")?
        .to_str()
        .ok()?
        .split(',')
        .map(str::trim)
        .find_map(|protocol| {
            protocol
                .strip_prefix(TERMINAL_TICKET_PROTOCOL_PREFIX)
                .filter(|value| !value.is_empty() && value.len() <= 128)
                .map(str::to_owned)
        })
}

pub(crate) async fn audit_mutation_request(
    State(state): State<AppState>,
    request: Request<Body>,
    next: Next,
) -> Response {
    if request.method() == Method::GET {
        return next.run(request).await;
    }
    let method = request.method().clone();
    let path = request.uri().path().to_owned();
    let audit_request_id = request_id(request.headers());
    let site_id = site_id_from_path(&path);
    let principal_id = if let Some(token) = cookie_value(request.headers(), SESSION_COOKIE) {
        state
            .config
            .auth
            .authenticate(token)
            .await
            .ok()
            .map(|principal| principal.principal_id)
    } else {
        None
    };
    let response = next.run(request).await;
    let outcome = if response.status().is_success() {
        "success"
    } else if matches!(
        response.status(),
        StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN | StatusCode::TOO_MANY_REQUESTS
    ) {
        "denied"
    } else {
        "failed"
    };
    let details = serde_json::json!({
        "method": method.as_str(),
        "path": path,
        "status": response.status().as_u16()
    });
    if state
        .config
        .auth
        .store()
        .append_audit(
            Some(&audit_request_id),
            principal_id.as_deref(),
            site_id.as_deref(),
            &format!("http.{}", method.as_str().to_ascii_lowercase()),
            outcome,
            &details,
        )
        .await
        .is_err()
    {
        return api_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "audit_write_failed",
            "Mutation audit record could not be persisted.",
        );
    }
    response
}

fn site_id_from_path(path: &str) -> Option<String> {
    let mut segments = path.split('/').filter(|segment| !segment.is_empty());
    while let Some(segment) = segments.next() {
        if segment == "sites" {
            return segments
                .next()
                .filter(|value| !value.is_empty())
                .map(str::to_owned);
        }
    }
    None
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
        AuthError::SecondFactorRequired => api_error(
            StatusCode::UNAUTHORIZED,
            "second_factor_required",
            "TOTP or a recovery code is required.",
        ),
        AuthError::InvalidSecondFactor => api_error(
            StatusCode::UNAUTHORIZED,
            "invalid_second_factor",
            "TOTP or recovery code verification failed.",
        ),
        AuthError::InstallIncomplete => api_error(
            StatusCode::CONFLICT,
            "installation_incomplete",
            "Fleet installation setup is incomplete.",
        ),
        AuthError::RateLimited { .. } => api_error(
            StatusCode::TOO_MANY_REQUESTS,
            "authentication_locked",
            "Authentication is temporarily locked.",
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
        AuthError::IdleTimeoutPolicy => api_error(
            StatusCode::BAD_REQUEST,
            "idle_timeout_policy",
            "Idle timeout must be between 5 and 1440 minutes.",
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
        StoreError::PortableBackup(_) => api_error(
            StatusCode::BAD_REQUEST,
            "portable_backup_rejected",
            "Backup password, format, or contents were rejected.",
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
        ConnectorError::UnknownOperation => (
            StatusCode::NOT_FOUND,
            "core_operation_not_found",
            "Core operation was not found.",
        ),
        ConnectorError::SpecializedOperation => (
            StatusCode::CONFLICT,
            "core_operation_specialized",
            "Use the specialized Fleet endpoint for this operation.",
        ),
        ConnectorError::ExternalEffectBlocked => (
            StatusCode::CONFLICT,
            "external_effect_blocked",
            "Routine Core execution blocks external delivery operations.",
        ),
        ConnectorError::InvalidCoreRequest => (
            StatusCode::BAD_REQUEST,
            "core_request_invalid",
            "Core operation request does not match the canonical contract.",
        ),
        ConnectorError::ResponseTooLarge => (
            StatusCode::BAD_GATEWAY,
            "core_response_too_large",
            "Connector response exceeded the Fleet response limit.",
        ),
        _ => (
            StatusCode::BAD_GATEWAY,
            "connector_failed",
            "Connector request failed.",
        ),
    };
    api_error(status, code, message)
}

fn remote_error(error: RemoteError) -> Response {
    let (status, code, message) = match error {
        RemoteError::InvalidProfile => (
            StatusCode::BAD_REQUEST,
            "ssh_profile_invalid",
            "SSH profile is invalid.",
        ),
        RemoteError::InvalidPath => (
            StatusCode::BAD_REQUEST,
            "remote_path_invalid",
            "Remote path or transfer size is invalid.",
        ),
        RemoteError::AddressForbidden => (
            StatusCode::BAD_REQUEST,
            "ssh_address_forbidden",
            "SSH address is invalid, loopback, link-local, or otherwise forbidden.",
        ),
        RemoteError::InvalidTicket => (
            StatusCode::UNAUTHORIZED,
            "terminal_ticket_invalid",
            "Terminal ticket is invalid or expired.",
        ),
        RemoteError::TicketCapacity => (
            StatusCode::TOO_MANY_REQUESTS,
            "terminal_ticket_capacity",
            "Terminal ticket capacity is exhausted.",
        ),
        RemoteError::Job => (
            StatusCode::CONFLICT,
            "transfer_state_conflict",
            "Transfer state changed or is not owned.",
        ),
        RemoteError::Timeout => (
            StatusCode::GATEWAY_TIMEOUT,
            "remote_timeout",
            "Remote operation timed out.",
        ),
        RemoteError::Cancelled => (
            StatusCode::CONFLICT,
            "remote_cancelled",
            "Remote operation was cancelled.",
        ),
        _ => (
            StatusCode::BAD_GATEWAY,
            "remote_operation_failed",
            "Remote operation failed.",
        ),
    };
    api_error(status, code, message)
}

fn notify_error(error: NotifyError) -> Response {
    match error {
        NotifyError::InvalidInput => api_error(
            StatusCode::BAD_REQUEST,
            "notification_invalid",
            "Notification input is invalid.",
        ),
        NotifyError::Store => api_error(
            StatusCode::SERVICE_UNAVAILABLE,
            "notification_store_failed",
            "Notification state is unavailable.",
        ),
        NotifyError::Permanent(_) | NotifyError::Transient(_) => api_error(
            StatusCode::BAD_GATEWAY,
            "notification_delivery_failed",
            "Notification delivery failed.",
        ),
    }
}
