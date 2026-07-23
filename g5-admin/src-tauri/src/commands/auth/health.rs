use crate::app_state::AppState;
use crate::commands::common::{command_context, command_error_payload};
use crate::error::CommandResult;
use g5_admin_models::models::health::HealthResponse;
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_system_health(state: State<'_, AppState>) -> CommandResult<HealthResponse> {
    let (request_id, app_state) = command_context(&state);
    let _request_context = app_state
        .acquire_active_request_context()
        .await
        .map_err(|error| {
            command_error_payload(
                "g5_admin::commands::auth::health",
                "cmd_system_health",
                "/health",
                &request_id,
                error,
            )
        })?;
    let Traced { value, .. } =
        app_state
            .api_client
            .get_health(&request_id)
            .await
            .map_err(|error| {
                command_error_payload(
                    "g5_admin::commands::auth::health",
                    "cmd_system_health",
                    "/health",
                    &request_id,
                    error.into(),
                )
            })?;

    Ok(value)
}
