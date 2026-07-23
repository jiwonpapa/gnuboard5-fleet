use super::shared::site_command_error;
use crate::app_state::AppState;
use crate::error::CommandResult;
use crate::request_id::next_request_id;
use g5_admin_models::models::ssh::{
    SshConnectInput, SshDisconnectInput, SshSessionStatusResponse, SshShellCloseInput,
    SshShellOpenInput, SshShellReadInput, SshShellReadResponse, SshShellResizeInput,
    SshShellWriteInput,
};
use tauri::State;

#[tauri::command]
pub async fn cmd_ssh_status(
    state: State<'_, AppState>,
    site_id: String,
) -> CommandResult<SshSessionStatusResponse> {
    let request_id = next_request_id();
    state
        .ssh_session_service()
        .status(&request_id, &site_id)
        .await
        .map_err(|error| {
            site_command_error("cmd_ssh_status", "local-ssh-session", &request_id, error)
        })
}

#[tauri::command]
pub async fn cmd_ssh_connect(
    state: State<'_, AppState>,
    input: SshConnectInput,
) -> CommandResult<SshSessionStatusResponse> {
    let request_id = next_request_id();
    state
        .ssh_session_service()
        .connect(&request_id, input)
        .await
        .map_err(|error| {
            site_command_error("cmd_ssh_connect", "local-ssh-session", &request_id, error)
        })
}

#[tauri::command]
pub async fn cmd_ssh_disconnect(
    state: State<'_, AppState>,
    input: SshDisconnectInput,
) -> CommandResult<SshSessionStatusResponse> {
    let request_id = next_request_id();
    state
        .ssh_session_service()
        .disconnect(&request_id, input)
        .await
        .map_err(|error| {
            site_command_error(
                "cmd_ssh_disconnect",
                "local-ssh-session",
                &request_id,
                error,
            )
        })
}

#[tauri::command]
pub async fn cmd_ssh_shell_open(
    state: State<'_, AppState>,
    input: SshShellOpenInput,
) -> CommandResult<SshSessionStatusResponse> {
    let request_id = next_request_id();
    state
        .ssh_session_service()
        .open_shell(&request_id, input)
        .await
        .map_err(|error| {
            site_command_error("cmd_ssh_shell_open", "local-ssh-shell", &request_id, error)
        })
}

#[tauri::command]
pub async fn cmd_ssh_shell_write(
    state: State<'_, AppState>,
    input: SshShellWriteInput,
) -> CommandResult<()> {
    let request_id = next_request_id();
    state
        .ssh_session_service()
        .write_shell(input)
        .await
        .map_err(|error| {
            site_command_error("cmd_ssh_shell_write", "local-ssh-shell", &request_id, error)
        })
}

#[tauri::command]
pub async fn cmd_ssh_shell_read(
    state: State<'_, AppState>,
    input: SshShellReadInput,
) -> CommandResult<SshShellReadResponse> {
    let request_id = next_request_id();
    state
        .ssh_session_service()
        .read_shell(&request_id, input)
        .await
        .map_err(|error| {
            site_command_error("cmd_ssh_shell_read", "local-ssh-shell", &request_id, error)
        })
}

#[tauri::command]
pub async fn cmd_ssh_shell_close(
    state: State<'_, AppState>,
    input: SshShellCloseInput,
) -> CommandResult<SshSessionStatusResponse> {
    let request_id = next_request_id();
    state
        .ssh_session_service()
        .close_shell(&request_id, input)
        .await
        .map_err(|error| {
            site_command_error("cmd_ssh_shell_close", "local-ssh-shell", &request_id, error)
        })
}

#[tauri::command]
pub async fn cmd_ssh_shell_resize(
    state: State<'_, AppState>,
    input: SshShellResizeInput,
) -> CommandResult<()> {
    let request_id = next_request_id();
    state
        .ssh_session_service()
        .resize_shell(input)
        .await
        .map_err(|error| {
            site_command_error(
                "cmd_ssh_shell_resize",
                "local-ssh-shell",
                &request_id,
                error,
            )
        })
}
