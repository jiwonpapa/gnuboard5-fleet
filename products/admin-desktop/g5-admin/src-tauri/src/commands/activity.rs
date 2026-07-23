use crate::app_state::AppState;
use crate::commands::common::command_error_payload;
use crate::error::CommandResult;
use crate::request_id::next_request_id;
use g5_admin_models::models::site::SiteActivityListResponse;
use tauri::State;

const ACTIVITY_COMPONENT: &str = "g5_admin::commands::activity";

#[tauri::command]
pub async fn cmd_site_activity_list(
    state: State<'_, AppState>,
    site_id: Option<String>,
    limit: Option<usize>,
) -> CommandResult<SiteActivityListResponse> {
    let request_id = next_request_id();
    state
        .site_catalog_service()
        .activity_list(&request_id, site_id, limit.unwrap_or(40).clamp(1, 200))
        .await
        .map_err(|error| {
            command_error_payload(
                ACTIVITY_COMPONENT,
                "cmd_site_activity_list",
                "local-site-db",
                &request_id,
                error,
            )
        })
}
