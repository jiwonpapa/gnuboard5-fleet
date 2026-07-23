use crate::app_state::AppState;
use crate::commands::common::command_error_payload;
use crate::error::CommandResult;
use crate::request_id::next_request_id;
use g5_admin_models::models::backup::{
    SiteBackupExportInput, SiteBackupExportResult, SiteBackupImportInput, SiteBackupImportResult,
};
use g5_admin_models::models::trace::ResponseTrace;
use tauri::State;

const BACKUP_COMPONENT: &str = "g5_admin::commands::backup";

#[tauri::command]
pub async fn cmd_backup_export(
    state: State<'_, AppState>,
    input: SiteBackupExportInput,
) -> CommandResult<SiteBackupExportResult> {
    let request_id = next_request_id();
    let trace = ResponseTrace::local(request_id.clone());
    let (copied_bytes, site_count) = state
        .export_backup(
            &input.path,
            &input.auth.current_password,
            input.auth.current_totp_code.as_deref(),
            &input.backup_password,
        )
        .await
        .map_err(|error| {
            command_error_payload(
                BACKUP_COMPONENT,
                "cmd_backup_export",
                "local-backup-file",
                &request_id,
                error,
            )
        })?;

    Ok(SiteBackupExportResult {
        path: input.path,
        site_count,
        copied_bytes,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_backup_import(
    state: State<'_, AppState>,
    input: SiteBackupImportInput,
) -> CommandResult<SiteBackupImportResult> {
    let request_id = next_request_id();
    let trace = ResponseTrace::local(request_id.clone());
    let summary = state
        .import_backup(
            &input.path,
            &input.auth.current_password,
            input.auth.current_totp_code.as_deref(),
            &input.backup_password,
        )
        .await
        .map_err(|error| {
            command_error_payload(
                BACKUP_COMPONENT,
                "cmd_backup_import",
                "local-backup-file",
                &request_id,
                error,
            )
        })?;

    Ok(SiteBackupImportResult {
        path: input.path,
        imported_site_count: summary.imported_site_count,
        reused_site_count: summary.reused_site_count,
        copied_setting_count: summary.copied_setting_count,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}
