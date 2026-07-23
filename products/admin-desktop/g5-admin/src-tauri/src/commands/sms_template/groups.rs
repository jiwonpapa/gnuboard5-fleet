use super::shared::{
    deleted_message, group_clear_response, group_detail_response, group_list_response,
    group_move_response, normalize_template_group_create_input,
    normalize_template_group_move_input, normalize_template_group_update_input,
    SMS_TEMPLATE_COMPONENT,
};
use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::sms_template::{
    AdminSmsTemplateGroupClearResponse, AdminSmsTemplateGroupCreateInput,
    AdminSmsTemplateGroupDeleteInput, AdminSmsTemplateGroupDetailResponse,
    AdminSmsTemplateGroupListResponse, AdminSmsTemplateGroupMoveInput,
    AdminSmsTemplateGroupMoveResponse, AdminSmsTemplateGroupUpdateInput,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_sms_template_group_get_list(
    state: State<'_, AppState>,
) -> CommandResult<AdminSmsTemplateGroupListResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: groups,
        trace,
    } = execute_with_access_token(
        &app_state,
        SMS_TEMPLATE_COMPONENT,
        "cmd_admin_sms_template_group_get_list",
        "/admin/sms/template-groups",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_sms_template_groups(&request_id, &access_token)
                .await
        },
    )
    .await?;

    Ok(group_list_response(groups, trace))
}

#[tauri::command]
pub async fn cmd_admin_sms_template_group_get(
    state: State<'_, AppState>,
    fg_no: i32,
) -> CommandResult<AdminSmsTemplateGroupDetailResponse> {
    let fg_no = fg_no.max(1);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: group,
        trace,
    } = execute_with_access_token(
        &app_state,
        SMS_TEMPLATE_COMPONENT,
        "cmd_admin_sms_template_group_get",
        "/admin/sms/template-groups/{fg_no}",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_sms_template_group(&request_id, &access_token, fg_no)
                .await
        },
    )
    .await?;

    Ok(group_detail_response(group, trace))
}

#[tauri::command]
pub async fn cmd_admin_sms_template_group_create(
    state: State<'_, AppState>,
    input: AdminSmsTemplateGroupCreateInput,
) -> CommandResult<AdminSmsTemplateGroupDetailResponse> {
    let input = normalize_template_group_create_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: group,
        trace,
    } = execute_with_access_token(
        &app_state,
        SMS_TEMPLATE_COMPONENT,
        "cmd_admin_sms_template_group_create",
        "/admin/sms/template-groups",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .create_admin_sms_template_group(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(group_detail_response(group, trace))
}

#[tauri::command]
pub async fn cmd_admin_sms_template_group_update(
    state: State<'_, AppState>,
    input: AdminSmsTemplateGroupUpdateInput,
) -> CommandResult<AdminSmsTemplateGroupDetailResponse> {
    let input = normalize_template_group_update_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: group,
        trace,
    } = execute_with_access_token(
        &app_state,
        SMS_TEMPLATE_COMPONENT,
        "cmd_admin_sms_template_group_update",
        "/admin/sms/template-groups/{fg_no}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .update_admin_sms_template_group(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(group_detail_response(group, trace))
}

#[tauri::command]
pub async fn cmd_admin_sms_template_group_delete(
    state: State<'_, AppState>,
    input: AdminSmsTemplateGroupDeleteInput,
) -> CommandResult<CommandMessage> {
    let input = AdminSmsTemplateGroupDeleteInput {
        fg_no: input.fg_no.max(1),
    };
    let (request_id, app_state) = command_context(&state);
    let trace = execute_with_access_token(
        &app_state,
        SMS_TEMPLATE_COMPONENT,
        "cmd_admin_sms_template_group_delete",
        "/admin/sms/template-groups/{fg_no}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .delete_admin_sms_template_group(&request_id, &access_token, input.fg_no)
                    .await
            }
        },
    )
    .await?;

    Ok(deleted_message(trace))
}

#[tauri::command]
pub async fn cmd_admin_sms_template_group_move(
    state: State<'_, AppState>,
    input: AdminSmsTemplateGroupMoveInput,
) -> CommandResult<AdminSmsTemplateGroupMoveResponse> {
    let input = normalize_template_group_move_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: result,
        trace,
    } = execute_with_access_token(
        &app_state,
        SMS_TEMPLATE_COMPONENT,
        "cmd_admin_sms_template_group_move",
        "/admin/sms/template-groups/{fg_no}/move",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .move_admin_sms_template_group(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(group_move_response(result, trace))
}

#[tauri::command]
pub async fn cmd_admin_sms_template_group_clear(
    state: State<'_, AppState>,
    fg_no: i32,
) -> CommandResult<AdminSmsTemplateGroupClearResponse> {
    let fg_no = fg_no.max(0);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: result,
        trace,
    } = execute_with_access_token(
        &app_state,
        SMS_TEMPLATE_COMPONENT,
        "cmd_admin_sms_template_group_clear",
        "/admin/sms/template-groups/{fg_no}/templates",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .clear_admin_sms_template_group(&request_id, &access_token, fg_no)
                .await
        },
    )
    .await?;

    Ok(group_clear_response(result, trace))
}
