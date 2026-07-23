use crate::app_state::AppState;
use crate::commands::board::shared::{
    board_delete_response, board_detail_response, board_new_post_delete_response,
    normalize_board_copy_input, normalize_board_create_input,
    normalize_board_new_post_delete_input, normalize_board_update_input, BOARD_COMPONENT,
};
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::board::{
    AdminBoardCopyInput, AdminBoardCreateInput, AdminBoardDeleteInput, AdminBoardDetailResponse,
    AdminBoardNewPostDeleteInput, AdminBoardNewPostDeleteResponse, AdminBoardUpdateInput,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_board_create(
    state: State<'_, AppState>,
    input: AdminBoardCreateInput,
) -> CommandResult<AdminBoardDetailResponse> {
    let input = normalize_board_create_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        BOARD_COMPONENT,
        "cmd_admin_board_create",
        "/admin/boards",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .create_admin_board(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(board_detail_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_board_update(
    state: State<'_, AppState>,
    input: AdminBoardUpdateInput,
) -> CommandResult<AdminBoardDetailResponse> {
    let input = normalize_board_update_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        BOARD_COMPONENT,
        "cmd_admin_board_update",
        "/admin/boards/{bo_table}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .update_admin_board(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(board_detail_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_board_delete(
    state: State<'_, AppState>,
    input: AdminBoardDeleteInput,
) -> CommandResult<CommandMessage> {
    let (request_id, app_state) = command_context(&state);
    let trace = execute_with_access_token(
        &app_state,
        BOARD_COMPONENT,
        "cmd_admin_board_delete",
        "/admin/boards/{bo_table}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .delete_admin_board(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(board_delete_response(trace))
}

#[tauri::command]
pub async fn cmd_admin_board_copy(
    state: State<'_, AppState>,
    input: AdminBoardCopyInput,
) -> CommandResult<AdminBoardDetailResponse> {
    let input = normalize_board_copy_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        BOARD_COMPONENT,
        "cmd_admin_board_copy",
        "/admin/boards/{bo_table}/copy",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .copy_admin_board(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(board_detail_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_board_new_posts_delete(
    state: State<'_, AppState>,
    input: AdminBoardNewPostDeleteInput,
) -> CommandResult<AdminBoardNewPostDeleteResponse> {
    let input = normalize_board_new_post_delete_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        BOARD_COMPONENT,
        "cmd_admin_board_new_posts_delete",
        "/admin/boards/new-posts",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .delete_admin_board_new_posts(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(board_new_post_delete_response(value, trace))
}
