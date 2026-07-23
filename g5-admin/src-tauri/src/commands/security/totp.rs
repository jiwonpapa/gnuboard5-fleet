use super::shared::security_command_error;
use crate::app_state::AppState;
use crate::error::CommandResult;
use crate::request_id::next_request_id;
use g5_admin_models::models::security::{
    SecuritySettings, TotpDisableInput, TotpEnrollmentChallenge, TotpSetupStartInput,
    TotpVerifyEnableInput,
};
use tauri::State;

#[tauri::command]
pub async fn cmd_security_start_totp_enrollment(
    state: State<'_, AppState>,
    input: TotpSetupStartInput,
) -> CommandResult<TotpEnrollmentChallenge> {
    let request_id = next_request_id();
    state
        .security_settings_service()
        .start_totp_enrollment(&request_id, input)
        .await
        .map_err(|error| {
            security_command_error(
                "cmd_security_start_totp_enrollment",
                "local-security-totp",
                &request_id,
                error,
            )
        })
}

#[tauri::command]
pub async fn cmd_security_enable_totp(
    state: State<'_, AppState>,
    input: TotpVerifyEnableInput,
) -> CommandResult<SecuritySettings> {
    let request_id = next_request_id();
    state
        .security_settings_service()
        .verify_enable_totp(&request_id, input)
        .await
        .map_err(|error| {
            security_command_error(
                "cmd_security_enable_totp",
                "local-security-totp",
                &request_id,
                error,
            )
        })
}

#[tauri::command]
pub async fn cmd_security_disable_totp(
    state: State<'_, AppState>,
    input: TotpDisableInput,
) -> CommandResult<SecuritySettings> {
    let request_id = next_request_id();
    state
        .security_settings_service()
        .disable_totp(&request_id, input)
        .await
        .map_err(|error| {
            security_command_error(
                "cmd_security_disable_totp",
                "local-security-totp",
                &request_id,
                error,
            )
        })
}
