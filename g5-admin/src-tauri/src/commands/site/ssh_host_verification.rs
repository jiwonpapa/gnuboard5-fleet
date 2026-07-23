use super::shared::site_command_error;
use crate::app_state::AppState;
use crate::error::CommandResult;
use crate::request_id::next_request_id;
use g5_admin_models::models::ssh::{
    SshHostTrustInput, SshHostVerificationInput, SshHostVerificationResponse,
};
use tauri::State;

#[tauri::command]
pub async fn cmd_ssh_host_verification_status(
    state: State<'_, AppState>,
    input: SshHostVerificationInput,
) -> CommandResult<SshHostVerificationResponse> {
    let request_id = next_request_id();
    state
        .ssh_host_verification_service()
        .inspect(&request_id, input)
        .await
        .map_err(|error| {
            site_command_error(
                "cmd_ssh_host_verification_status",
                "local-ssh-host-verification",
                &request_id,
                error,
            )
        })
}

#[tauri::command]
pub async fn cmd_ssh_host_verification_trust(
    state: State<'_, AppState>,
    input: SshHostTrustInput,
) -> CommandResult<SshHostVerificationResponse> {
    let request_id = next_request_id();
    state
        .ssh_host_verification_service()
        .trust(&request_id, input)
        .await
        .map_err(|error| {
            site_command_error(
                "cmd_ssh_host_verification_trust",
                "local-ssh-host-verification",
                &request_id,
                error,
            )
        })
}
