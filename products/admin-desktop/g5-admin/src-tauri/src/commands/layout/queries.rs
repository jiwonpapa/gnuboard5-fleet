use super::shared::{
    layout_detail_response, layout_list_response, normalize_list_query, LAYOUT_COMPONENT,
};
use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::layout::{
    AdminLayoutDetailResponse, AdminLayoutListQuery, AdminLayoutListResponse,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_layout_get_list(
    state: State<'_, AppState>,
    query: Option<AdminLayoutListQuery>,
) -> CommandResult<AdminLayoutListResponse> {
    let query = normalize_list_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        LAYOUT_COMPONENT,
        "cmd_admin_layout_get_list",
        "/admin/layouts",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_layouts(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(layout_list_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_layout_get(
    state: State<'_, AppState>,
    page_id: String,
) -> CommandResult<AdminLayoutDetailResponse> {
    let page_id = page_id.trim().to_string();
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: layout,
        trace,
    } = execute_with_access_token(
        &app_state,
        LAYOUT_COMPONENT,
        "cmd_admin_layout_get",
        "/admin/layouts/{page_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let page_id = page_id.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_layout(&request_id, &access_token, &page_id)
                    .await
            }
        },
    )
    .await?;

    Ok(layout_detail_response(layout, trace))
}
