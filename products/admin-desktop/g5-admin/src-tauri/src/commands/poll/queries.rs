use crate::app_state::AppState;
use crate::commands::poll::shared::{
    normalize_poll_list_query, poll_detail_response, poll_list_response, POLL_COMPONENT,
};
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::poll::{
    AdminPollDetailResponse, AdminPollListQuery, AdminPollListResponse,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_poll_get_list(
    state: State<'_, AppState>,
    query: Option<AdminPollListQuery>,
) -> CommandResult<AdminPollListResponse> {
    let query = normalize_poll_list_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        POLL_COMPONENT,
        "cmd_admin_poll_get_list",
        "/admin/system/polls",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_polls(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(poll_list_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_poll_get(
    state: State<'_, AppState>,
    po_id: i32,
) -> CommandResult<AdminPollDetailResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        POLL_COMPONENT,
        "cmd_admin_poll_get",
        "/admin/system/polls/{po_id}",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_poll(&request_id, &access_token, po_id)
                .await
        },
    )
    .await?;

    Ok(poll_detail_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_poll_legacy_get_list(
    state: State<'_, AppState>,
    query: Option<AdminPollListQuery>,
) -> CommandResult<AdminPollListResponse> {
    let query = normalize_poll_list_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        POLL_COMPONENT,
        "cmd_admin_poll_legacy_get_list",
        "/admin/polls",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_polls_legacy(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(poll_list_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_poll_legacy_get(
    state: State<'_, AppState>,
    po_id: i32,
) -> CommandResult<AdminPollDetailResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        POLL_COMPONENT,
        "cmd_admin_poll_legacy_get",
        "/admin/polls/{po_id}",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_poll_legacy(&request_id, &access_token, po_id)
                .await
        },
    )
    .await?;

    Ok(poll_detail_response(value, trace))
}
