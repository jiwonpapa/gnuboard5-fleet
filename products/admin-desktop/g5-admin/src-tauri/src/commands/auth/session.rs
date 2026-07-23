use crate::app_state::AppState;
use crate::commands::common::command_error_payload;
use crate::core::api_records::{
    login_record_from_model, model_member_profile_from_record, model_token_pair_from_record,
};
use crate::core::store_records::session_record_from_model;
use crate::error::{AppError, CommandResult};
use crate::request_id::next_request_id;
use g5_admin_models::models::auth::{AuthLoginInput, AuthSessionState, StoredSession};
use g5_admin_models::models::trace::Traced;
use tauri::State;

use super::shared::{
    clear_local_session, load_stored_session, refresh_session, set_session_hint,
    unauthenticated_local_state, warn_remote_logout_failure, AUTH_COMPONENT,
};

#[tauri::command]
pub async fn cmd_auth_login(
    state: State<'_, AppState>,
    input: AuthLoginInput,
) -> CommandResult<AuthSessionState> {
    let request_id = next_request_id();
    let _request_context = state
        .acquire_active_request_context()
        .await
        .map_err(|error| {
            command_error_payload(
                AUTH_COMPONENT,
                "cmd_auth_login",
                "/auth/login",
                &request_id,
                error,
            )
        })?;

    tracing::info!(
        component = AUTH_COMPONENT,
        operation = "cmd_auth_login",
        target = "/auth/login",
        request_id = %request_id,
        mb_id = %input.mb_id,
        "auth login requested"
    );

    let result = async {
        let Traced { value: tokens, .. } = state
            .admin_api()
            .login(&request_id, &login_record_from_model(&input))
            .await?
            .map(model_token_pair_from_record);
        let Traced {
            value: profile,
            trace,
        } = state
            .admin_api()
            .get_my_profile(&request_id, &tokens.access_token)
            .await?
            .map(model_member_profile_from_record);

        let session = StoredSession::new(profile.mb_id.clone(), tokens);
        state
            .session_service()
            .save_active_site_session(&session)
            .await?;

        Ok(AuthSessionState::authenticated(trace, profile))
    }
    .await;

    result.map_err(|error: AppError| {
        command_error_payload(
            AUTH_COMPONENT,
            "cmd_auth_login",
            "/auth/login",
            &request_id,
            error,
        )
    })
}

#[tauri::command]
pub async fn cmd_auth_refresh(state: State<'_, AppState>) -> CommandResult<AuthSessionState> {
    let request_id = next_request_id();
    let _request_context = state
        .acquire_active_request_context()
        .await
        .map_err(|error| {
            command_error_payload(
                AUTH_COMPONENT,
                "cmd_auth_refresh",
                "/auth/refresh",
                &request_id,
                error,
            )
        })?;

    let Some(session) = load_stored_session(state.inner(), "cmd_auth_refresh", &request_id).await?
    else {
        set_session_hint(state.inner(), false, "cmd_auth_refresh", &request_id).await?;
        return Ok(unauthenticated_local_state(request_id));
    };

    refresh_session(state.inner(), &request_id, session).await
}

#[tauri::command]
pub async fn cmd_auth_status(state: State<'_, AppState>) -> CommandResult<AuthSessionState> {
    let request_id = next_request_id();
    let _request_context = state
        .acquire_active_request_context()
        .await
        .map_err(|error| {
            command_error_payload(
                AUTH_COMPONENT,
                "cmd_auth_status",
                "/members/me",
                &request_id,
                error,
            )
        })?;

    let Some(session) = load_stored_session(state.inner(), "cmd_auth_status", &request_id).await?
    else {
        set_session_hint(state.inner(), false, "cmd_auth_status", &request_id).await?;
        return Ok(unauthenticated_local_state(request_id));
    };

    match state
        .admin_api()
        .get_my_profile(&request_id, &session.access_token)
        .await
    {
        Ok(Traced {
            value: profile,
            trace,
        }) => Ok(AuthSessionState::authenticated(
            trace,
            model_member_profile_from_record(profile),
        )),
        Err(error) if error.status_code() == Some(401) => {
            refresh_session(state.inner(), &request_id, session).await
        }
        Err(error) => Err(command_error_payload(
            AUTH_COMPONENT,
            "cmd_auth_status",
            "/members/me",
            &request_id,
            error,
        )),
    }
}

#[tauri::command]
pub async fn cmd_auth_logout(state: State<'_, AppState>) -> CommandResult<AuthSessionState> {
    let request_id = next_request_id();
    let _request_context = state
        .acquire_active_request_context()
        .await
        .map_err(|error| {
            command_error_payload(
                AUTH_COMPONENT,
                "cmd_auth_logout",
                "/auth/logout",
                &request_id,
                error,
            )
        })?;
    let stored_session = load_stored_session(state.inner(), "cmd_auth_logout", &request_id).await?;
    let mut trace = g5_admin_models::models::trace::ResponseTrace::local(request_id.clone());

    if let Some(session) = stored_session {
        let session_record = session_record_from_model(session);
        match state.admin_api().logout(&request_id, &session_record).await {
            Ok(api_trace) => trace = api_trace,
            Err(error) => warn_remote_logout_failure(error.into_payload(request_id.clone())),
        }
    }

    clear_local_session(state.inner(), "cmd_auth_logout", &request_id).await?;

    Ok(AuthSessionState::unauthenticated(trace))
}
