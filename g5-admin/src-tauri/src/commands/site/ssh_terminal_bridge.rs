use super::shared::site_command_error;
use crate::app_state::AppState;
use crate::error::CommandResult;
use crate::request_id::next_request_id;
use g5_admin_models::models::ssh::{
    SshTerminalBridgeConnectInput, SshTerminalBridgeConnectionResponse,
};
use tauri::State;

#[tauri::command]
pub async fn cmd_ssh_terminal_bridge_connect(
    state: State<'_, AppState>,
    input: SshTerminalBridgeConnectInput,
) -> CommandResult<SshTerminalBridgeConnectionResponse> {
    let request_id = next_request_id();
    state
        .ssh_terminal_bridge_service()
        .connect(&request_id, input)
        .await
        .map_err(|error| {
            site_command_error(
                "cmd_ssh_terminal_bridge_connect",
                "local-ssh-shell",
                &request_id,
                error,
            )
        })
}
