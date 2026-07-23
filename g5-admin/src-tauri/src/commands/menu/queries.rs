use super::MENU_COMPONENT;
use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::menu::{AdminMenuDetailResponse, AdminMenuListResponse};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_menu_get_list(
    state: State<'_, AppState>,
) -> CommandResult<AdminMenuListResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: (menus, pagination),
        trace,
    } = execute_with_access_token(
        &app_state,
        MENU_COMPONENT,
        "cmd_admin_menu_get_list",
        "/admin/menus",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_menus(&request_id, &access_token)
                .await
        },
    )
    .await?;

    Ok(AdminMenuListResponse {
        menus,
        pagination,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_menu_get(
    state: State<'_, AppState>,
    me_id: i32,
) -> CommandResult<AdminMenuDetailResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced { value: menu, trace } = execute_with_access_token(
        &app_state,
        MENU_COMPONENT,
        "cmd_admin_menu_get",
        "/admin/menus/{me_id}",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_menu(&request_id, &access_token, me_id)
                .await
        },
    )
    .await?;

    Ok(AdminMenuDetailResponse {
        menu,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}
