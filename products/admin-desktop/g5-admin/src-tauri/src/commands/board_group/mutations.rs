use super::shared::{
    board_group_detail_response, board_group_member_response, deleted_message,
    normalize_group_create_input, normalize_group_delete_input, normalize_group_member_add_input,
    normalize_group_member_delete_input, normalize_group_update_input, BOARD_GROUP_COMPONENT,
};
use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::board_group::{
    AdminBoardGroupCreateInput, AdminBoardGroupDeleteInput, AdminBoardGroupDetailResponse,
    AdminBoardGroupMemberAddInput, AdminBoardGroupMemberDeleteInput, AdminBoardGroupMemberResponse,
    AdminBoardGroupUpdateInput,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_board_group_create(
    state: State<'_, AppState>,
    input: AdminBoardGroupCreateInput,
) -> CommandResult<AdminBoardGroupDetailResponse> {
    let input = normalize_group_create_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        BOARD_GROUP_COMPONENT,
        "cmd_admin_board_group_create",
        "/admin/board-groups",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .create_admin_board_group(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(board_group_detail_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_board_group_update(
    state: State<'_, AppState>,
    input: AdminBoardGroupUpdateInput,
) -> CommandResult<AdminBoardGroupDetailResponse> {
    let input = normalize_group_update_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        BOARD_GROUP_COMPONENT,
        "cmd_admin_board_group_update",
        "/admin/board-groups/{gr_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .update_admin_board_group(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(board_group_detail_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_board_group_patch(
    state: State<'_, AppState>,
    input: AdminBoardGroupUpdateInput,
) -> CommandResult<AdminBoardGroupDetailResponse> {
    let input = normalize_group_update_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        BOARD_GROUP_COMPONENT,
        "cmd_admin_board_group_patch",
        "/admin/board-groups/{gr_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .patch_admin_board_group(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(board_group_detail_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_board_group_delete(
    state: State<'_, AppState>,
    input: AdminBoardGroupDeleteInput,
) -> CommandResult<CommandMessage> {
    let input = normalize_group_delete_input(input);
    let (request_id, app_state) = command_context(&state);
    let trace = execute_with_access_token(
        &app_state,
        BOARD_GROUP_COMPONENT,
        "cmd_admin_board_group_delete",
        "/admin/board-groups/{gr_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .delete_admin_board_group(&request_id, &access_token, &input.gr_id)
                    .await
            }
        },
    )
    .await?;

    Ok(deleted_message(trace))
}

#[tauri::command]
pub async fn cmd_admin_board_group_member_add(
    state: State<'_, AppState>,
    input: AdminBoardGroupMemberAddInput,
) -> CommandResult<AdminBoardGroupMemberResponse> {
    let input = normalize_group_member_add_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        BOARD_GROUP_COMPONENT,
        "cmd_admin_board_group_member_add",
        "/admin/board-groups/{gr_id}/members",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .add_admin_board_group_member(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(board_group_member_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_board_group_member_delete(
    state: State<'_, AppState>,
    input: AdminBoardGroupMemberDeleteInput,
) -> CommandResult<CommandMessage> {
    let input = normalize_group_member_delete_input(input);
    let (request_id, app_state) = command_context(&state);
    let trace = execute_with_access_token(
        &app_state,
        BOARD_GROUP_COMPONENT,
        "cmd_admin_board_group_member_delete",
        "/admin/board-groups/{gr_id}/members/{mb_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .delete_admin_board_group_member(
                        &request_id,
                        &access_token,
                        &input.gr_id,
                        &input.mb_id,
                    )
                    .await
            }
        },
    )
    .await?;

    Ok(deleted_message(trace))
}
