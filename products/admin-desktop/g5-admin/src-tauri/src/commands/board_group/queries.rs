use super::shared::{
    board_group_detail_response, board_group_list_response, board_group_member_list_response,
    normalize_group_id, normalize_group_member_list_query, BOARD_GROUP_COMPONENT,
};
use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::board_group::{
    AdminBoardGroupDetailResponse, AdminBoardGroupListResponse, AdminBoardGroupMemberListQuery,
    AdminBoardGroupMemberListResponse,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_board_group_get_list(
    state: State<'_, AppState>,
) -> CommandResult<AdminBoardGroupListResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        BOARD_GROUP_COMPONENT,
        "cmd_admin_board_group_get_list",
        "/admin/board-groups",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_board_groups(&request_id, &access_token)
                .await
        },
    )
    .await?;

    Ok(board_group_list_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_board_group_get(
    state: State<'_, AppState>,
    gr_id: String,
) -> CommandResult<AdminBoardGroupDetailResponse> {
    let gr_id = normalize_group_id(gr_id);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        BOARD_GROUP_COMPONENT,
        "cmd_admin_board_group_get",
        "/admin/board-groups/{gr_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let gr_id = gr_id.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_board_group(&request_id, &access_token, &gr_id)
                    .await
            }
        },
    )
    .await?;

    Ok(board_group_detail_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_board_group_members_get(
    state: State<'_, AppState>,
    query: Option<AdminBoardGroupMemberListQuery>,
) -> CommandResult<AdminBoardGroupMemberListResponse> {
    let query = normalize_group_member_list_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        BOARD_GROUP_COMPONENT,
        "cmd_admin_board_group_members_get",
        "/admin/board-groups/{gr_id}/members",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_board_group_members(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(board_group_member_list_response(value, trace))
}
