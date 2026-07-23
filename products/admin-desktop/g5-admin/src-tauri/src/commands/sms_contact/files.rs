use super::shared::{
    contact_export_response, contact_import_response, normalize_contact_export_query,
    normalize_contact_import_input, SMS_CONTACT_COMPONENT,
};
use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::sms_contact::{
    AdminSmsContactExportQuery, AdminSmsContactExportResponse, AdminSmsContactImportInput,
    AdminSmsContactImportResponse,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_sms_contact_import(
    state: State<'_, AppState>,
    input: AdminSmsContactImportInput,
) -> CommandResult<AdminSmsContactImportResponse> {
    let input = normalize_contact_import_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        SMS_CONTACT_COMPONENT,
        "cmd_admin_sms_contact_import",
        "/admin/sms/contacts/import",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .import_admin_sms_contacts(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(contact_import_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_sms_contact_export(
    state: State<'_, AppState>,
    query: Option<AdminSmsContactExportQuery>,
) -> CommandResult<AdminSmsContactExportResponse> {
    let query = normalize_contact_export_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        SMS_CONTACT_COMPONENT,
        "cmd_admin_sms_contact_export",
        "/admin/sms/contacts/export",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .export_admin_sms_contacts(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(contact_export_response(value, trace))
}
