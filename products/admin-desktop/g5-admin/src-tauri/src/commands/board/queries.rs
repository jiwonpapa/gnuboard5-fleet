use crate::app_state::AppState;
use crate::commands::board::shared::{
    board_detail_response, board_list_response, normalize_board_list_query, normalize_board_table,
    BOARD_COMPONENT,
};
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::board::{
    AdminBoardDetailResponse, AdminBoardListQuery, AdminBoardListResponse,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_board_get_list(
    state: State<'_, AppState>,
    query: Option<AdminBoardListQuery>,
) -> CommandResult<AdminBoardListResponse> {
    let query = normalize_board_list_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        BOARD_COMPONENT,
        "cmd_admin_board_get_list",
        "/admin/boards",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_boards(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(board_list_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_board_get(
    state: State<'_, AppState>,
    bo_table: String,
) -> CommandResult<AdminBoardDetailResponse> {
    let bo_table = normalize_board_table(bo_table);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        BOARD_COMPONENT,
        "cmd_admin_board_get",
        "/admin/boards/{bo_table}",
        &request_id,
        |access_token, app_state, request_id| {
            let bo_table = bo_table.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_board(&request_id, &access_token, &bo_table)
                    .await
            }
        },
    )
    .await?;

    Ok(board_detail_response(value, trace))
}
