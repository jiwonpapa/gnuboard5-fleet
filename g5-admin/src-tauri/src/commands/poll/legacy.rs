use crate::app_state::AppState;
use crate::commands::poll::shared::{
    normalize_poll_create_input, normalize_poll_delete_input, normalize_poll_update_input,
    poll_delete_response, poll_detail_response, POLL_COMPONENT,
};
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::poll::{
    AdminPollCreateInput, AdminPollDeleteInput, AdminPollDetailResponse, AdminPollUpdateInput,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_poll_legacy_create(
    state: State<'_, AppState>,
    input: AdminPollCreateInput,
) -> CommandResult<AdminPollDetailResponse> {
    let input = normalize_poll_create_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        POLL_COMPONENT,
        "cmd_admin_poll_legacy_create",
        "/admin/polls",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .create_admin_poll_legacy(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(poll_detail_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_poll_legacy_update(
    state: State<'_, AppState>,
    input: AdminPollUpdateInput,
) -> CommandResult<AdminPollDetailResponse> {
    let input = normalize_poll_update_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        POLL_COMPONENT,
        "cmd_admin_poll_legacy_update",
        "/admin/polls/{po_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .update_admin_poll_legacy(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(poll_detail_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_poll_legacy_delete(
    state: State<'_, AppState>,
    input: AdminPollDeleteInput,
) -> CommandResult<CommandMessage> {
    let input = normalize_poll_delete_input(input);
    let (request_id, app_state) = command_context(&state);
    let trace = execute_with_access_token(
        &app_state,
        POLL_COMPONENT,
        "cmd_admin_poll_legacy_delete",
        "/admin/polls/{po_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .delete_admin_poll_legacy(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(poll_delete_response(trace))
}
