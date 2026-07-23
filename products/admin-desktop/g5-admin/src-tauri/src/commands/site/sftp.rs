use super::shared::site_command_error;
use crate::app_state::AppState;
use crate::error::CommandResult;
use crate::request_id::next_request_id;
use g5_admin_models::models::ssh::{
    SftpChmodInput, SftpChmodResponse, SftpCopyInput, SftpCopyResponse, SftpDeleteInput,
    SftpDeleteResponse, SftpDirectoryListResponse, SftpDownloadInput, SftpDownloadResponse,
    SftpListDirInput, SftpMkdirInput, SftpMkdirResponse, SftpMoveInput, SftpMoveResponse,
    SftpReadFileInput, SftpReadFileResponse, SftpStatInput, SftpStatResponse, SftpUploadInput,
    SftpUploadResponse, SftpWriteFileInput, SftpWriteFileResponse,
};
use tauri::State;

#[tauri::command]
pub async fn cmd_sftp_list_dir(
    state: State<'_, AppState>,
    input: SftpListDirInput,
) -> CommandResult<SftpDirectoryListResponse> {
    let request_id = next_request_id();
    state
        .sftp_service()
        .list_dir(&request_id, input)
        .await
        .map_err(|error| site_command_error("cmd_sftp_list_dir", "local-sftp", &request_id, error))
}

#[tauri::command]
pub async fn cmd_sftp_stat(
    state: State<'_, AppState>,
    input: SftpStatInput,
) -> CommandResult<SftpStatResponse> {
    let request_id = next_request_id();
    state
        .sftp_service()
        .stat(&request_id, input)
        .await
        .map_err(|error| site_command_error("cmd_sftp_stat", "local-sftp", &request_id, error))
}

#[tauri::command]
pub async fn cmd_sftp_read_file(
    state: State<'_, AppState>,
    input: SftpReadFileInput,
) -> CommandResult<SftpReadFileResponse> {
    let request_id = next_request_id();
    state
        .sftp_service()
        .read_file(&request_id, input)
        .await
        .map_err(|error| site_command_error("cmd_sftp_read_file", "local-sftp", &request_id, error))
}

#[tauri::command]
pub async fn cmd_sftp_download(
    state: State<'_, AppState>,
    input: SftpDownloadInput,
) -> CommandResult<SftpDownloadResponse> {
    let request_id = next_request_id();
    state
        .sftp_download_service()
        .download_file(&request_id, input)
        .await
        .map_err(|error| site_command_error("cmd_sftp_download", "local-sftp", &request_id, error))
}

#[tauri::command]
pub async fn cmd_sftp_upload(
    state: State<'_, AppState>,
    input: SftpUploadInput,
) -> CommandResult<SftpUploadResponse> {
    let request_id = next_request_id();
    state
        .sftp_upload_service()
        .upload_file(&request_id, input)
        .await
        .map_err(|error| site_command_error("cmd_sftp_upload", "local-sftp", &request_id, error))
}

#[tauri::command]
pub async fn cmd_sftp_copy(
    state: State<'_, AppState>,
    input: SftpCopyInput,
) -> CommandResult<SftpCopyResponse> {
    let request_id = next_request_id();
    state
        .sftp_copy_service()
        .copy(&request_id, input)
        .await
        .map_err(|error| site_command_error("cmd_sftp_copy", "local-sftp", &request_id, error))
}

#[tauri::command]
pub async fn cmd_sftp_move(
    state: State<'_, AppState>,
    input: SftpMoveInput,
) -> CommandResult<SftpMoveResponse> {
    let request_id = next_request_id();
    state
        .sftp_move_service()
        .move_path(&request_id, input)
        .await
        .map_err(|error| site_command_error("cmd_sftp_move", "local-sftp", &request_id, error))
}

#[tauri::command]
pub async fn cmd_sftp_chmod(
    state: State<'_, AppState>,
    input: SftpChmodInput,
) -> CommandResult<SftpChmodResponse> {
    let request_id = next_request_id();
    state
        .sftp_chmod_service()
        .chmod(&request_id, input)
        .await
        .map_err(|error| site_command_error("cmd_sftp_chmod", "local-sftp", &request_id, error))
}

#[tauri::command]
pub async fn cmd_sftp_delete(
    state: State<'_, AppState>,
    input: SftpDeleteInput,
) -> CommandResult<SftpDeleteResponse> {
    let request_id = next_request_id();
    state
        .sftp_delete_service()
        .delete(&request_id, input)
        .await
        .map_err(|error| site_command_error("cmd_sftp_delete", "local-sftp", &request_id, error))
}

#[tauri::command]
pub async fn cmd_sftp_mkdir(
    state: State<'_, AppState>,
    input: SftpMkdirInput,
) -> CommandResult<SftpMkdirResponse> {
    let request_id = next_request_id();
    state
        .sftp_mkdir_service()
        .mkdir(&request_id, input)
        .await
        .map_err(|error| site_command_error("cmd_sftp_mkdir", "local-sftp", &request_id, error))
}

#[tauri::command]
pub async fn cmd_sftp_write_file(
    state: State<'_, AppState>,
    input: SftpWriteFileInput,
) -> CommandResult<SftpWriteFileResponse> {
    let request_id = next_request_id();
    state
        .sftp_write_service()
        .write_file(&request_id, input)
        .await
        .map_err(|error| {
            site_command_error("cmd_sftp_write_file", "local-sftp", &request_id, error)
        })
}
