use crate::app_state::AppState;
use crate::commands::common::command_error_payload;
use crate::error::CommandResult;
use crate::fast_unlock;
use crate::request_id::next_request_id;
use g5_admin_models::models::master_lock::{
    MasterLockSetupInput, MasterLockStatus, MasterLockTotpInput, MasterLockUnlockInput,
};
use tauri::{AppHandle, Runtime, State};

const MASTER_LOCK_COMPONENT: &str = "g5_admin::commands::master_lock";

#[tauri::command]
pub async fn cmd_master_lock_status(state: State<'_, AppState>) -> CommandResult<MasterLockStatus> {
    let request_id = next_request_id();
    state
        .master_lock_service()
        .master_lock_status(&request_id)
        .await
        .map_err(|error| {
            command_error_payload(
                MASTER_LOCK_COMPONENT,
                "cmd_master_lock_status",
                "local-master-lock",
                &request_id,
                error,
            )
        })
}

#[tauri::command]
pub async fn cmd_master_lock_setup(
    state: State<'_, AppState>,
    input: MasterLockSetupInput,
) -> CommandResult<MasterLockStatus> {
    let request_id = next_request_id();
    state
        .master_lock_service()
        .setup_master_lock(&request_id, input)
        .await
        .map_err(|error| {
            command_error_payload(
                MASTER_LOCK_COMPONENT,
                "cmd_master_lock_setup",
                "local-master-lock",
                &request_id,
                error,
            )
        })
}

#[tauri::command]
pub async fn cmd_master_lock_unlock(
    state: State<'_, AppState>,
    input: MasterLockUnlockInput,
) -> CommandResult<MasterLockStatus> {
    let request_id = next_request_id();
    state
        .master_lock_service()
        .unlock_master_lock(&request_id, input)
        .await
        .map_err(|error| {
            command_error_payload(
                MASTER_LOCK_COMPONENT,
                "cmd_master_lock_unlock",
                "local-master-lock",
                &request_id,
                error,
            )
        })
}

#[tauri::command]
pub async fn cmd_master_lock_verify_totp(
    state: State<'_, AppState>,
    input: MasterLockTotpInput,
) -> CommandResult<MasterLockStatus> {
    let request_id = next_request_id();
    state
        .master_lock_service()
        .verify_master_lock_totp(&request_id, input)
        .await
        .map_err(|error| {
            command_error_payload(
                MASTER_LOCK_COMPONENT,
                "cmd_master_lock_verify_totp",
                "local-master-lock",
                &request_id,
                error,
            )
        })
}

#[tauri::command]
pub async fn cmd_master_lock_unlock_fast<R: Runtime>(
    state: State<'_, AppState>,
    app: AppHandle<R>,
) -> CommandResult<MasterLockStatus> {
    let request_id = next_request_id();
    let secret = fast_unlock::load_secret(&app).map_err(|error| {
        command_error_payload(
            MASTER_LOCK_COMPONENT,
            "cmd_master_lock_unlock_fast",
            "local-master-lock",
            &request_id,
            error,
        )
    })?;

    state
        .master_lock_service()
        .unlock_master_lock_fast(&request_id, &secret)
        .await
        .map_err(|error| {
            command_error_payload(
                MASTER_LOCK_COMPONENT,
                "cmd_master_lock_unlock_fast",
                "local-master-lock",
                &request_id,
                error,
            )
        })
}

#[tauri::command]
pub async fn cmd_master_lock_lock(state: State<'_, AppState>) -> CommandResult<MasterLockStatus> {
    let request_id = next_request_id();
    state
        .master_lock_service()
        .lock_master(&request_id)
        .await
        .map_err(|error| {
            command_error_payload(
                MASTER_LOCK_COMPONENT,
                "cmd_master_lock_lock",
                "local-master-lock",
                &request_id,
                error,
            )
        })
}
