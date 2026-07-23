use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::system_tools::{
    AdminBrowscapConvertInput, AdminBrowscapConvertResponse, AdminBrowscapStatusResponse,
    AdminPhpInfoResponse,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

const SYSTEM_TOOLS_COMPONENT: &str = "g5_admin::commands::system_tools";

#[tauri::command]
pub async fn cmd_admin_phpinfo_get(
    state: State<'_, AppState>,
) -> CommandResult<AdminPhpInfoResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        SYSTEM_TOOLS_COMPONENT,
        "cmd_admin_phpinfo_get",
        "/admin/system/phpinfo",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_phpinfo(&request_id, &access_token)
                .await
        },
    )
    .await?;

    Ok(AdminPhpInfoResponse {
        info: value,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_browscap_status_get(
    state: State<'_, AppState>,
) -> CommandResult<AdminBrowscapStatusResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        SYSTEM_TOOLS_COMPONENT,
        "cmd_admin_browscap_status_get",
        "/admin/system/browscap",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_browscap_status(&request_id, &access_token)
                .await
        },
    )
    .await?;

    Ok(AdminBrowscapStatusResponse {
        status: value,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_browscap_update(
    state: State<'_, AppState>,
) -> CommandResult<AdminBrowscapStatusResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        SYSTEM_TOOLS_COMPONENT,
        "cmd_admin_browscap_update",
        "/admin/system/browscap/update",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .update_admin_browscap(&request_id, &access_token)
                .await
        },
    )
    .await?;

    Ok(AdminBrowscapStatusResponse {
        status: value,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_browscap_convert(
    state: State<'_, AppState>,
    input: Option<AdminBrowscapConvertInput>,
) -> CommandResult<AdminBrowscapConvertResponse> {
    let input =
        normalize_browscap_convert_input(input.unwrap_or(AdminBrowscapConvertInput { rows: None }));
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        SYSTEM_TOOLS_COMPONENT,
        "cmd_admin_browscap_convert",
        "/admin/system/browscap/convert",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .convert_admin_browscap(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminBrowscapConvertResponse {
        result: value,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

fn normalize_browscap_convert_input(
    mut input: AdminBrowscapConvertInput,
) -> AdminBrowscapConvertInput {
    input.rows = input.rows.map(|rows| rows.max(1));
    input
}
