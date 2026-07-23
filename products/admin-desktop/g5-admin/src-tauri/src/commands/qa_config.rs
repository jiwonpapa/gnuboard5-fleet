use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::qa_config::{AdminQaConfigResponse, AdminQaConfigUpdateInput};
use g5_admin_models::models::trace::Traced;
use tauri::State;

const QA_CONFIG_COMPONENT: &str = "g5_admin::commands::qa_config";

#[tauri::command]
pub async fn cmd_admin_qa_config_get(
    state: State<'_, AppState>,
) -> CommandResult<AdminQaConfigResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: config,
        trace,
    } = execute_with_access_token(
        &app_state,
        QA_CONFIG_COMPONENT,
        "cmd_admin_qa_config_get",
        "/admin/system/qa-config",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_qa_config(&request_id, &access_token)
                .await
        },
    )
    .await?;

    Ok(AdminQaConfigResponse {
        config,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_qa_config_update(
    state: State<'_, AppState>,
    input: AdminQaConfigUpdateInput,
) -> CommandResult<AdminQaConfigResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: config,
        trace,
    } = execute_with_access_token(
        &app_state,
        QA_CONFIG_COMPONENT,
        "cmd_admin_qa_config_update",
        "/admin/system/qa-config",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .update_admin_qa_config(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminQaConfigResponse {
        config,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}
