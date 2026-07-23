use crate::app_state::AppState;
use crate::commands::popup::shared::{
    normalize_popup_list_query, popup_detail_response, popup_list_response, POPUP_COMPONENT,
};
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::popup::{
    AdminPopupDetailResponse, AdminPopupListQuery, AdminPopupListResponse,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_popup_get_list(
    state: State<'_, AppState>,
    query: Option<AdminPopupListQuery>,
) -> CommandResult<AdminPopupListResponse> {
    let query = normalize_popup_list_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        POPUP_COMPONENT,
        "cmd_admin_popup_get_list",
        "/admin/system/popups",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_popups(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(popup_list_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_popup_get(
    state: State<'_, AppState>,
    nw_id: i32,
) -> CommandResult<AdminPopupDetailResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        POPUP_COMPONENT,
        "cmd_admin_popup_get",
        "/admin/system/popups/{nw_id}",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_popup(&request_id, &access_token, nw_id)
                .await
        },
    )
    .await?;

    Ok(popup_detail_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_popup_legacy_get_list(
    state: State<'_, AppState>,
    query: Option<AdminPopupListQuery>,
) -> CommandResult<AdminPopupListResponse> {
    let query = normalize_popup_list_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        POPUP_COMPONENT,
        "cmd_admin_popup_legacy_get_list",
        "/admin/popups",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_popups_legacy(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(popup_list_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_popup_legacy_get(
    state: State<'_, AppState>,
    nw_id: i32,
) -> CommandResult<AdminPopupDetailResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        POPUP_COMPONENT,
        "cmd_admin_popup_legacy_get",
        "/admin/popups/{nw_id}",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_popup_legacy(&request_id, &access_token, nw_id)
                .await
        },
    )
    .await?;

    Ok(popup_detail_response(value, trace))
}
