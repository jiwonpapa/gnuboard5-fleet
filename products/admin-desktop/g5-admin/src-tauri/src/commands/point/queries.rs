use super::shared::{
    normalize_point_list_query, point_list_response, point_summary_response, POINT_COMPONENT,
};
use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::point::{
    AdminPointListQuery, AdminPointListResponse, AdminPointSummaryResponse,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_point_get_list(
    state: State<'_, AppState>,
    query: Option<AdminPointListQuery>,
) -> CommandResult<AdminPointListResponse> {
    let query = normalize_point_list_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        POINT_COMPONENT,
        "cmd_admin_point_get_list",
        "/admin/points",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_points(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(point_list_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_point_summary_get(
    state: State<'_, AppState>,
    mb_id: Option<String>,
) -> CommandResult<AdminPointSummaryResponse> {
    let mb_id = mb_id
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: summary,
        trace,
    } = execute_with_access_token(
        &app_state,
        POINT_COMPONENT,
        "cmd_admin_point_summary_get",
        "/admin/points/summary",
        &request_id,
        |access_token, app_state, request_id| {
            let mb_id = mb_id.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_point_summary(&request_id, &access_token, mb_id.as_deref())
                    .await
            }
        },
    )
    .await?;

    Ok(point_summary_response(summary, trace))
}
