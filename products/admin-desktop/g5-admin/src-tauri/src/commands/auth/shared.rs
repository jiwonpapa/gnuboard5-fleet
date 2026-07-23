use crate::app_state::AppState;
use crate::commands::common::command_error_payload;
use crate::core::api_records::{model_member_profile_from_record, model_token_pair_from_record};
use crate::core::store_records::session_record_from_model;
use crate::error::AppErrorPayload;
use g5_admin_models::models::auth::{AuthSessionState, StoredSession};
use g5_admin_models::models::trace::ResponseTrace;

pub(super) const AUTH_COMPONENT: &str = "g5_admin::commands::auth";

pub(super) fn unauthenticated_local_state(request_id: impl Into<String>) -> AuthSessionState {
    AuthSessionState::unauthenticated(ResponseTrace::local(request_id))
}

pub(super) async fn load_stored_session(
    state: &AppState,
    operation: &'static str,
    request_id: &str,
) -> Result<Option<StoredSession>, AppErrorPayload> {
    state
        .session_service()
        .load_active_site_session()
        .await
        .map_err(|error| {
            command_error_payload(AUTH_COMPONENT, operation, "keyring", request_id, error)
        })
}

pub(super) async fn set_session_hint(
    state: &AppState,
    has_session: bool,
    operation: &'static str,
    request_id: &str,
) -> Result<(), AppErrorPayload> {
    state
        .session_service()
        .set_active_site_session_hint(has_session)
        .await
        .map_err(|error| {
            command_error_payload(
                AUTH_COMPONENT,
                operation,
                "local-site-db",
                request_id,
                error,
            )
        })
}

pub(super) async fn clear_local_session(
    state: &AppState,
    operation: &'static str,
    request_id: &str,
) -> Result<(), AppErrorPayload> {
    state
        .session_service()
        .clear_active_site_session()
        .await
        .map_err(|error| {
            command_error_payload(AUTH_COMPONENT, operation, "keyring", request_id, error)
        })
}

pub(super) fn warn_remote_logout_failure(payload: AppErrorPayload) {
    tracing::warn!(
        component = AUTH_COMPONENT,
        operation = "cmd_auth_logout",
        target = "/auth/logout",
        request_id = %payload.request_id,
        correlation_id = %payload.correlation_id,
        server_request_id = payload.server_request_id.as_deref().unwrap_or("-"),
        code = %payload.code,
        owner = %payload.owner,
        fault_domain = %payload.fault_domain,
        status = payload.status.unwrap_or_default(),
        "remote logout failed, clearing local session anyway"
    );
}

pub(super) async fn refresh_session(
    state: &AppState,
    request_id: &str,
    session: StoredSession,
) -> Result<AuthSessionState, AppErrorPayload> {
    let session_record = session_record_from_model(session.clone());
    let refreshed = match state.admin_api().refresh(request_id, &session_record).await {
        Ok(refreshed) => refreshed.map(model_token_pair_from_record),
        Err(error) if matches!(error.status_code(), Some(401 | 403)) => {
            let payload = error.into_payload(request_id.to_string());
            tracing::warn!(
                component = AUTH_COMPONENT,
                operation = "cmd_auth_refresh",
                target = "/auth/refresh",
                request_id = %payload.request_id,
                correlation_id = %payload.correlation_id,
                server_request_id = payload.server_request_id.as_deref().unwrap_or("-"),
                code = %payload.code,
                owner = %payload.owner,
                fault_domain = %payload.fault_domain,
                status = payload.status.unwrap_or_default(),
                "refresh session rejected, clearing local session"
            );
            clear_local_session(state, "cmd_auth_refresh", request_id).await?;
            return Ok(AuthSessionState::unauthenticated(payload.trace()));
        }
        Err(error) => {
            return Err(command_error_payload(
                AUTH_COMPONENT,
                "cmd_auth_refresh",
                "/auth/refresh",
                request_id,
                error,
            ));
        }
    };

    let (tokens, _) = refreshed.into_parts();
    let updated_session = session.with_tokens(tokens);
    state
        .session_service()
        .save_active_site_session(&updated_session)
        .await
        .map_err(|error| {
            command_error_payload(
                AUTH_COMPONENT,
                "cmd_auth_refresh",
                "keyring",
                request_id,
                error,
            )
        })?;

    let profile = match state
        .admin_api()
        .get_my_profile(request_id, &updated_session.access_token)
        .await
    {
        Ok(profile) => profile.map(model_member_profile_from_record),
        Err(error) if error.status_code() == Some(401) => {
            let payload = error.into_payload(request_id.to_string());
            clear_local_session(state, "cmd_auth_refresh", request_id).await?;
            return Ok(AuthSessionState::unauthenticated(payload.trace()));
        }
        Err(error) => {
            return Err(command_error_payload(
                AUTH_COMPONENT,
                "cmd_auth_refresh",
                "/members/me",
                request_id,
                error,
            ));
        }
    };

    let (profile, trace) = profile.into_parts();
    Ok(AuthSessionState::authenticated(trace, profile))
}
