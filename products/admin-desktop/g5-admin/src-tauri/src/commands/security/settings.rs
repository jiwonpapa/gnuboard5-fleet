use super::shared::security_command_error;
use crate::app_state::AppState;
use crate::error::CommandResult;
use crate::request_id::next_request_id;
use g5_admin_models::models::security::{
    MasterPasswordChangeInput, SecurityIdleTimeoutUpdateInput, SecuritySettings,
};
use tauri::State;

#[tauri::command]
pub async fn cmd_security_settings_get(
    state: State<'_, AppState>,
) -> CommandResult<SecuritySettings> {
    let request_id = next_request_id();
    state
        .security_settings_service()
        .security_settings(&request_id)
        .await
        .map_err(|error| {
            security_command_error(
                "cmd_security_settings_get",
                "local-security-settings",
                &request_id,
                error,
            )
        })
}

#[tauri::command]
pub async fn cmd_security_change_master_password(
    state: State<'_, AppState>,
    input: MasterPasswordChangeInput,
) -> CommandResult<SecuritySettings> {
    let request_id = next_request_id();
    state
        .security_settings_service()
        .change_master_password(&request_id, input)
        .await
        .map_err(|error| {
            security_command_error(
                "cmd_security_change_master_password",
                "local-master-password",
                &request_id,
                error,
            )
        })
}

#[tauri::command]
pub async fn cmd_security_update_idle_timeout(
    state: State<'_, AppState>,
    input: SecurityIdleTimeoutUpdateInput,
) -> CommandResult<SecuritySettings> {
    let request_id = next_request_id();
    state
        .security_settings_service()
        .update_idle_timeout(&request_id, input)
        .await
        .map_err(|error| {
            security_command_error(
                "cmd_security_update_idle_timeout",
                "local-security-settings",
                &request_id,
                error,
            )
        })
}
