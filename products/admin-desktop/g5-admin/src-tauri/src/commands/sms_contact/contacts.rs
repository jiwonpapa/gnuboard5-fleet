use super::shared::{
    contact_batch_response, contact_detail_response, contact_list_response, deleted_message,
    normalize_contact_batch_input, normalize_contact_create_input, normalize_contact_delete_input,
    normalize_contact_list_query, normalize_contact_update_input, normalize_positive_i32,
    SMS_CONTACT_COMPONENT,
};
use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::sms_contact::{
    AdminSmsContactBatchInput, AdminSmsContactBatchResponse, AdminSmsContactCreateInput,
    AdminSmsContactDeleteInput, AdminSmsContactDetailResponse, AdminSmsContactListQuery,
    AdminSmsContactListResponse, AdminSmsContactUpdateInput,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_sms_contact_get_list(
    state: State<'_, AppState>,
    query: Option<AdminSmsContactListQuery>,
) -> CommandResult<AdminSmsContactListResponse> {
    let query = normalize_contact_list_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        SMS_CONTACT_COMPONENT,
        "cmd_admin_sms_contact_get_list",
        "/admin/sms/contacts",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_sms_contacts(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(contact_list_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_sms_contact_get(
    state: State<'_, AppState>,
    bk_no: i32,
) -> CommandResult<AdminSmsContactDetailResponse> {
    let bk_no = normalize_positive_i32(bk_no);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        SMS_CONTACT_COMPONENT,
        "cmd_admin_sms_contact_get",
        "/admin/sms/contacts/{bk_no}",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_sms_contact(&request_id, &access_token, bk_no)
                .await
        },
    )
    .await?;

    Ok(contact_detail_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_sms_contact_create(
    state: State<'_, AppState>,
    input: AdminSmsContactCreateInput,
) -> CommandResult<AdminSmsContactDetailResponse> {
    let input = normalize_contact_create_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        SMS_CONTACT_COMPONENT,
        "cmd_admin_sms_contact_create",
        "/admin/sms/contacts",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .create_admin_sms_contact(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(contact_detail_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_sms_contact_update(
    state: State<'_, AppState>,
    input: AdminSmsContactUpdateInput,
) -> CommandResult<AdminSmsContactDetailResponse> {
    let input = normalize_contact_update_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        SMS_CONTACT_COMPONENT,
        "cmd_admin_sms_contact_update",
        "/admin/sms/contacts/{bk_no}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .update_admin_sms_contact(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(contact_detail_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_sms_contact_delete(
    state: State<'_, AppState>,
    input: AdminSmsContactDeleteInput,
) -> CommandResult<CommandMessage> {
    let input = normalize_contact_delete_input(input);
    let (request_id, app_state) = command_context(&state);
    let trace = execute_with_access_token(
        &app_state,
        SMS_CONTACT_COMPONENT,
        "cmd_admin_sms_contact_delete",
        "/admin/sms/contacts/{bk_no}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .delete_admin_sms_contact(&request_id, &access_token, input.bk_no)
                    .await
            }
        },
    )
    .await?;

    Ok(deleted_message(trace))
}

#[tauri::command]
pub async fn cmd_admin_sms_contact_batch(
    state: State<'_, AppState>,
    input: AdminSmsContactBatchInput,
) -> CommandResult<AdminSmsContactBatchResponse> {
    let input = normalize_contact_batch_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        SMS_CONTACT_COMPONENT,
        "cmd_admin_sms_contact_batch",
        "/admin/sms/contacts/batch",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .batch_admin_sms_contacts(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(contact_batch_response(value, trace))
}
