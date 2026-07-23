use super::shared::{
    deleted_message, group_clear_response, group_detail_response, group_list_response,
    group_move_response, normalize_contact_group_create_input,
    normalize_contact_group_delete_input, normalize_contact_group_move_input,
    normalize_contact_group_update_input, normalize_positive_i32, SMS_CONTACT_COMPONENT,
};
use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::sms_contact::{
    AdminSmsContactGroupClearResponse, AdminSmsContactGroupCreateInput,
    AdminSmsContactGroupDeleteInput, AdminSmsContactGroupDetailResponse,
    AdminSmsContactGroupListResponse, AdminSmsContactGroupMoveInput,
    AdminSmsContactGroupMoveResponse, AdminSmsContactGroupUpdateInput,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_sms_contact_group_get_list(
    state: State<'_, AppState>,
) -> CommandResult<AdminSmsContactGroupListResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        SMS_CONTACT_COMPONENT,
        "cmd_admin_sms_contact_group_get_list",
        "/admin/sms/contact-groups",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_sms_contact_groups(&request_id, &access_token)
                .await
        },
    )
    .await?;

    Ok(group_list_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_sms_contact_group_get(
    state: State<'_, AppState>,
    bg_no: i32,
) -> CommandResult<AdminSmsContactGroupDetailResponse> {
    let bg_no = normalize_positive_i32(bg_no);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        SMS_CONTACT_COMPONENT,
        "cmd_admin_sms_contact_group_get",
        "/admin/sms/contact-groups/{bg_no}",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_sms_contact_group(&request_id, &access_token, bg_no)
                .await
        },
    )
    .await?;

    Ok(group_detail_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_sms_contact_group_create(
    state: State<'_, AppState>,
    input: AdminSmsContactGroupCreateInput,
) -> CommandResult<AdminSmsContactGroupDetailResponse> {
    let input = normalize_contact_group_create_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        SMS_CONTACT_COMPONENT,
        "cmd_admin_sms_contact_group_create",
        "/admin/sms/contact-groups",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .create_admin_sms_contact_group(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(group_detail_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_sms_contact_group_update(
    state: State<'_, AppState>,
    input: AdminSmsContactGroupUpdateInput,
) -> CommandResult<AdminSmsContactGroupDetailResponse> {
    let input = normalize_contact_group_update_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        SMS_CONTACT_COMPONENT,
        "cmd_admin_sms_contact_group_update",
        "/admin/sms/contact-groups/{bg_no}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .update_admin_sms_contact_group(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(group_detail_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_sms_contact_group_delete(
    state: State<'_, AppState>,
    input: AdminSmsContactGroupDeleteInput,
) -> CommandResult<CommandMessage> {
    let input = normalize_contact_group_delete_input(input);
    let (request_id, app_state) = command_context(&state);
    let trace = execute_with_access_token(
        &app_state,
        SMS_CONTACT_COMPONENT,
        "cmd_admin_sms_contact_group_delete",
        "/admin/sms/contact-groups/{bg_no}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .delete_admin_sms_contact_group(&request_id, &access_token, input.bg_no)
                    .await
            }
        },
    )
    .await?;

    Ok(deleted_message(trace))
}

#[tauri::command]
pub async fn cmd_admin_sms_contact_group_move(
    state: State<'_, AppState>,
    input: AdminSmsContactGroupMoveInput,
) -> CommandResult<AdminSmsContactGroupMoveResponse> {
    let input = normalize_contact_group_move_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        SMS_CONTACT_COMPONENT,
        "cmd_admin_sms_contact_group_move",
        "/admin/sms/contact-groups/{bg_no}/move",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .move_admin_sms_contact_group(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(group_move_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_sms_contact_group_clear(
    state: State<'_, AppState>,
    bg_no: i32,
) -> CommandResult<AdminSmsContactGroupClearResponse> {
    let bg_no = normalize_positive_i32(bg_no);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        SMS_CONTACT_COMPONENT,
        "cmd_admin_sms_contact_group_clear",
        "/admin/sms/contact-groups/{bg_no}/contacts",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .clear_admin_sms_contact_group(&request_id, &access_token, bg_no)
                .await
        },
    )
    .await?;

    Ok(group_clear_response(value, trace))
}
