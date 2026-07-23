use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::maintenance::AdminMaintenanceResponse;
use g5_admin_models::models::trace::Traced;
use tauri::State;

const MAINTENANCE_COMPONENT: &str = "g5_admin::commands::maintenance";

#[derive(Clone, Copy)]
enum MaintenanceTask {
    Cache,
    Captcha,
    MemberList,
    Session,
    Thumbnail,
}

#[tauri::command]
pub async fn cmd_admin_maintenance_purge_session_files(
    state: State<'_, AppState>,
) -> CommandResult<AdminMaintenanceResponse> {
    execute_maintenance(
        state,
        "cmd_admin_maintenance_purge_session_files",
        "/admin/system/maintenance/session-files/purge",
        MaintenanceTask::Session,
    )
    .await
}

#[tauri::command]
pub async fn cmd_admin_maintenance_purge_cache_files(
    state: State<'_, AppState>,
) -> CommandResult<AdminMaintenanceResponse> {
    execute_maintenance(
        state,
        "cmd_admin_maintenance_purge_cache_files",
        "/admin/system/maintenance/cache-files/purge",
        MaintenanceTask::Cache,
    )
    .await
}

#[tauri::command]
pub async fn cmd_admin_maintenance_purge_captcha_files(
    state: State<'_, AppState>,
) -> CommandResult<AdminMaintenanceResponse> {
    execute_maintenance(
        state,
        "cmd_admin_maintenance_purge_captcha_files",
        "/admin/system/maintenance/captcha-files/purge",
        MaintenanceTask::Captcha,
    )
    .await
}

#[tauri::command]
pub async fn cmd_admin_maintenance_purge_thumbnail_files(
    state: State<'_, AppState>,
) -> CommandResult<AdminMaintenanceResponse> {
    execute_maintenance(
        state,
        "cmd_admin_maintenance_purge_thumbnail_files",
        "/admin/system/maintenance/thumbnail-files/purge",
        MaintenanceTask::Thumbnail,
    )
    .await
}

#[tauri::command]
pub async fn cmd_admin_maintenance_purge_member_list_files(
    state: State<'_, AppState>,
) -> CommandResult<AdminMaintenanceResponse> {
    execute_maintenance(
        state,
        "cmd_admin_maintenance_purge_member_list_files",
        "/admin/system/maintenance/member-list-files/purge",
        MaintenanceTask::MemberList,
    )
    .await
}

async fn execute_maintenance(
    state: State<'_, AppState>,
    command_name: &'static str,
    target: &'static str,
    task: MaintenanceTask,
) -> CommandResult<AdminMaintenanceResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        MAINTENANCE_COMPONENT,
        command_name,
        target,
        &request_id,
        |access_token, app_state, request_id| async move {
            match task {
                MaintenanceTask::Session => {
                    app_state
                        .api_client
                        .purge_admin_session_files(&request_id, &access_token)
                        .await
                }
                MaintenanceTask::Cache => {
                    app_state
                        .api_client
                        .purge_admin_cache_files(&request_id, &access_token)
                        .await
                }
                MaintenanceTask::Captcha => {
                    app_state
                        .api_client
                        .purge_admin_captcha_files(&request_id, &access_token)
                        .await
                }
                MaintenanceTask::Thumbnail => {
                    app_state
                        .api_client
                        .purge_admin_thumbnail_files(&request_id, &access_token)
                        .await
                }
                MaintenanceTask::MemberList => {
                    app_state
                        .api_client
                        .purge_admin_member_list_files(&request_id, &access_token)
                        .await
                }
            }
        },
    )
    .await?;

    Ok(AdminMaintenanceResponse {
        result: value,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}
