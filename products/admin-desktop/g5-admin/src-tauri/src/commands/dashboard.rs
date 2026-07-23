use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::dashboard::AdminDashboardResponse;
use g5_admin_models::models::trace::Traced;
use tauri::State;

const DASHBOARD_COMPONENT: &str = "g5_admin::commands::dashboard";

#[tauri::command]
pub async fn cmd_admin_dashboard_get(
    state: State<'_, AppState>,
) -> CommandResult<AdminDashboardResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced { value, .. } = execute_with_access_token(
        &app_state,
        DASHBOARD_COMPONENT,
        "cmd_admin_dashboard_get",
        "/admin/dashboard",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_dashboard(&request_id, &access_token)
                .await
        },
    )
    .await?;

    Ok(value)
}
