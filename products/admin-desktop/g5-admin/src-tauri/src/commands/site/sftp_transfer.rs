use super::shared::site_command_error;
use crate::app_state::AppState;
use crate::error::CommandResult;
use g5_admin_models::models::sftp_transfer::{
    SftpTransferConcurrencyInput, SftpTransferEnqueueInput, SftpTransferItemControlInput,
    SftpTransferQueueSnapshot, SftpTransferSnapshotInput,
};
use tauri::State;

#[tauri::command]
pub async fn cmd_sftp_transfer_snapshot(
    state: State<'_, AppState>,
    input: SftpTransferSnapshotInput,
) -> CommandResult<SftpTransferQueueSnapshot> {
    state
        .sftp_transfer_service()
        .snapshot(input)
        .await
        .map_err(|error| {
            site_command_error(
                "cmd_sftp_transfer_snapshot",
                "local-sftp",
                "snapshot",
                error,
            )
        })
}

#[tauri::command]
pub async fn cmd_sftp_transfer_enqueue(
    state: State<'_, AppState>,
    input: SftpTransferEnqueueInput,
) -> CommandResult<SftpTransferQueueSnapshot> {
    state
        .sftp_transfer_service()
        .enqueue(input)
        .await
        .map_err(|error| {
            site_command_error("cmd_sftp_transfer_enqueue", "local-sftp", "enqueue", error)
        })
}

#[tauri::command]
pub async fn cmd_sftp_transfer_pause(
    state: State<'_, AppState>,
    input: SftpTransferItemControlInput,
) -> CommandResult<SftpTransferQueueSnapshot> {
    state
        .sftp_transfer_service()
        .pause(input)
        .await
        .map_err(|error| {
            site_command_error("cmd_sftp_transfer_pause", "local-sftp", "pause", error)
        })
}

#[tauri::command]
pub async fn cmd_sftp_transfer_retry(
    state: State<'_, AppState>,
    input: SftpTransferItemControlInput,
) -> CommandResult<SftpTransferQueueSnapshot> {
    state
        .sftp_transfer_service()
        .retry(input)
        .await
        .map_err(|error| {
            site_command_error("cmd_sftp_transfer_retry", "local-sftp", "retry", error)
        })
}

#[tauri::command]
pub async fn cmd_sftp_transfer_cancel(
    state: State<'_, AppState>,
    input: SftpTransferItemControlInput,
) -> CommandResult<SftpTransferQueueSnapshot> {
    state
        .sftp_transfer_service()
        .cancel(input)
        .await
        .map_err(|error| {
            site_command_error("cmd_sftp_transfer_cancel", "local-sftp", "cancel", error)
        })
}

#[tauri::command]
pub async fn cmd_sftp_transfer_set_concurrency(
    state: State<'_, AppState>,
    input: SftpTransferConcurrencyInput,
) -> CommandResult<SftpTransferQueueSnapshot> {
    state
        .sftp_transfer_service()
        .set_concurrency_limit(input)
        .await
        .map_err(|error| {
            site_command_error(
                "cmd_sftp_transfer_set_concurrency",
                "local-sftp",
                "set-concurrency",
                error,
            )
        })
}
