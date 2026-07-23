use super::shared::site_command_error;
use crate::app_state::AppState;
use crate::error::CommandResult;
use crate::request_id::next_request_id;
use g5_admin_models::models::ssh::{
    SshProfileAddInput, SshProfileDeleteInput, SshProfileListInput, SshProfileListResponse,
    SshProfileUpdateInput,
};
use tauri::State;

#[tauri::command]
pub async fn cmd_ssh_profile_list(
    state: State<'_, AppState>,
    input: SshProfileListInput,
) -> CommandResult<SshProfileListResponse> {
    let request_id = next_request_id();
    state
        .ssh_profile_service()
        .list(&request_id, &input.site_id)
        .await
        .map_err(|error| {
            site_command_error(
                "cmd_ssh_profile_list",
                "local-ssh-profile-db",
                &request_id,
                error,
            )
        })
}

#[tauri::command]
pub async fn cmd_ssh_profile_add(
    state: State<'_, AppState>,
    input: SshProfileAddInput,
) -> CommandResult<SshProfileListResponse> {
    let request_id = next_request_id();
    let site_id = input.site_id.clone();
    state
        .ssh_profile_service()
        .add(input)
        .await
        .map_err(|error| {
            site_command_error(
                "cmd_ssh_profile_add",
                "local-ssh-profile-db",
                &request_id,
                error,
            )
        })?;
    state
        .ssh_profile_service()
        .list(&request_id, &site_id)
        .await
        .map_err(|error| {
            site_command_error(
                "cmd_ssh_profile_add",
                "local-ssh-profile-db",
                &request_id,
                error,
            )
        })
}

#[tauri::command]
pub async fn cmd_ssh_profile_update(
    state: State<'_, AppState>,
    input: SshProfileUpdateInput,
) -> CommandResult<SshProfileListResponse> {
    let request_id = next_request_id();
    let site_id = input.site_id.clone();
    state
        .ssh_profile_service()
        .update(input)
        .await
        .map_err(|error| {
            site_command_error(
                "cmd_ssh_profile_update",
                "local-ssh-profile-db",
                &request_id,
                error,
            )
        })?;
    state
        .ssh_profile_service()
        .list(&request_id, &site_id)
        .await
        .map_err(|error| {
            site_command_error(
                "cmd_ssh_profile_update",
                "local-ssh-profile-db",
                &request_id,
                error,
            )
        })
}

#[tauri::command]
pub async fn cmd_ssh_profile_delete(
    state: State<'_, AppState>,
    input: SshProfileDeleteInput,
) -> CommandResult<SshProfileListResponse> {
    let request_id = next_request_id();
    let site_id = input.site_id.clone();
    state
        .ssh_profile_service()
        .delete(input)
        .await
        .map_err(|error| {
            site_command_error(
                "cmd_ssh_profile_delete",
                "local-ssh-profile-db",
                &request_id,
                error,
            )
        })?;
    state
        .ssh_profile_service()
        .list(&request_id, &site_id)
        .await
        .map_err(|error| {
            site_command_error(
                "cmd_ssh_profile_delete",
                "local-ssh-profile-db",
                &request_id,
                error,
            )
        })
}
