use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::config::{AdminConfigResponse, AdminConfigUpdateInput};
use g5_admin_models::models::trace::Traced;
use tauri::State;

const CONFIG_COMPONENT: &str = "g5_admin::commands::config";

#[tauri::command]
pub async fn cmd_admin_config_get(
    state: State<'_, AppState>,
) -> CommandResult<AdminConfigResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: config,
        trace,
    } = execute_with_access_token(
        &app_state,
        CONFIG_COMPONENT,
        "cmd_admin_config_get",
        "/admin/config",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_config(&request_id, &access_token)
                .await
        },
    )
    .await?;

    Ok(AdminConfigResponse {
        config,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_config_update(
    state: State<'_, AppState>,
    input: AdminConfigUpdateInput,
) -> CommandResult<AdminConfigResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: config,
        trace,
    } = execute_with_access_token(
        &app_state,
        CONFIG_COMPONENT,
        "cmd_admin_config_update",
        "/admin/config",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .update_admin_config(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminConfigResponse {
        config,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}
