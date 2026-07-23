use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::sms::{
    AdminSmsConfigResponse, AdminSmsConfigUpdateInput, AdminSmsMemberSyncResponse,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

const SMS_COMPONENT: &str = "g5_admin::commands::sms";

#[tauri::command]
pub async fn cmd_admin_sms_config_get(
    state: State<'_, AppState>,
) -> CommandResult<AdminSmsConfigResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: config,
        trace,
    } = execute_with_access_token(
        &app_state,
        SMS_COMPONENT,
        "cmd_admin_sms_config_get",
        "/admin/sms/config",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_sms_config(&request_id, &access_token)
                .await
        },
    )
    .await?;

    Ok(AdminSmsConfigResponse {
        config,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_sms_config_update(
    state: State<'_, AppState>,
    input: AdminSmsConfigUpdateInput,
) -> CommandResult<AdminSmsConfigResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: config,
        trace,
    } = execute_with_access_token(
        &app_state,
        SMS_COMPONENT,
        "cmd_admin_sms_config_update",
        "/admin/sms/config",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .update_admin_sms_config(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminSmsConfigResponse {
        config,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_sms_member_sync(
    state: State<'_, AppState>,
) -> CommandResult<AdminSmsMemberSyncResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: result,
        trace,
    } = execute_with_access_token(
        &app_state,
        SMS_COMPONENT,
        "cmd_admin_sms_member_sync",
        "/admin/sms/member-sync",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .sync_admin_sms_members(&request_id, &access_token)
                .await
        },
    )
    .await?;

    Ok(AdminSmsMemberSyncResponse {
        result,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}
