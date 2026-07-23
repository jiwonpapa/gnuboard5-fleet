use crate::app_state::AppState;
use crate::core::api_records::model_token_pair_from_record;
use crate::core::store_records::session_record_from_model;
use crate::error::{AppError, AppErrorPayload};
use crate::request_id::next_request_id;
use g5_admin_models::models::auth::StoredSession;
use tauri::State;

pub(crate) fn command_context(state: &State<'_, AppState>) -> (String, AppState) {
    (next_request_id(), state.inner().clone())
}

pub(crate) async fn load_required_session(
    state: &AppState,
    component: &'static str,
    operation: &'static str,
    request_id: &str,
) -> Result<StoredSession, AppErrorPayload> {
    let Some(session) = state
        .session_service()
        .load_active_site_session()
        .await
        .map_err(|error| {
            command_error_payload(component, operation, "keyring", request_id, error)
        })?
    else {
        state
            .session_service()
            .set_active_site_session_hint(false)
            .await
            .map_err(|error| {
                command_error_payload(component, operation, "local-site-db", request_id, error)
            })?;
        return Err(AppError::Auth {
            message: "No authenticated session".to_string(),
        }
        .into_payload(request_id.to_string()));
    };

    Ok(session)
}

pub(crate) async fn refresh_stored_session(
    state: &AppState,
    component: &'static str,
    operation: &'static str,
    request_id: &str,
    session: StoredSession,
) -> Result<Option<StoredSession>, AppErrorPayload> {
    let session_record = session_record_from_model(session.clone());
    let refreshed = match state.admin_api().refresh(request_id, &session_record).await {
        Ok(refreshed) => refreshed.map(model_token_pair_from_record),
        Err(error) if matches!(error.status_code(), Some(401 | 403)) => {
            let payload = error.into_payload(request_id.to_string());
            tracing::warn!(
                component = component,
                operation,
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
            state
                .session_service()
                .clear_active_site_session()
                .await
                .map_err(|clear_error| {
                    command_error_payload(component, operation, "keyring", request_id, clear_error)
                })?;
            return Ok(None);
        }
        Err(error) => {
            return Err(command_error_payload(
                component,
                operation,
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
            command_error_payload(component, operation, "keyring", request_id, error)
        })?;

    Ok(Some(updated_session))
}

pub(crate) fn command_error_payload(
    component: &'static str,
    operation: &'static str,
    target: &'static str,
    request_id: &str,
    error: AppError,
) -> AppErrorPayload {
    let payload = error.into_payload(request_id.to_string());
    tracing::error!(
        component = component,
        operation,
        target,
        request_id = %payload.request_id,
        correlation_id = %payload.correlation_id,
        server_request_id = payload.server_request_id.as_deref().unwrap_or("-"),
        code = %payload.code,
        owner = %payload.owner,
        fault_domain = %payload.fault_domain,
        error_category = %payload.error_category,
        retryable = payload.retryable,
        user_actionable = payload.user_actionable,
        status = payload.status.unwrap_or_default(),
        detail = payload.detail.as_deref().unwrap_or("-"),
        message = %payload.message,
        "command failed"
    );

    payload
}
