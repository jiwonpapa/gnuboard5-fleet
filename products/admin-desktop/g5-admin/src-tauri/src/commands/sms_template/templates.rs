use super::shared::{
    deleted_message, normalize_template_batch_input, normalize_template_create_input,
    normalize_template_list_query, normalize_template_update_input, template_batch_response,
    template_detail_response, template_list_response, SMS_TEMPLATE_COMPONENT,
};
use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::sms_template::{
    AdminSmsTemplateBatchInput, AdminSmsTemplateBatchResponse, AdminSmsTemplateCreateInput,
    AdminSmsTemplateDeleteInput, AdminSmsTemplateDetailResponse, AdminSmsTemplateListQuery,
    AdminSmsTemplateListResponse, AdminSmsTemplateUpdateInput,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_sms_template_get_list(
    state: State<'_, AppState>,
    query: Option<AdminSmsTemplateListQuery>,
) -> CommandResult<AdminSmsTemplateListResponse> {
    let query = normalize_template_list_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        SMS_TEMPLATE_COMPONENT,
        "cmd_admin_sms_template_get_list",
        "/admin/sms/templates",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_sms_templates(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(template_list_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_sms_template_get(
    state: State<'_, AppState>,
    fo_no: i32,
) -> CommandResult<AdminSmsTemplateDetailResponse> {
    let fo_no = fo_no.max(1);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: template,
        trace,
    } = execute_with_access_token(
        &app_state,
        SMS_TEMPLATE_COMPONENT,
        "cmd_admin_sms_template_get",
        "/admin/sms/templates/{fo_no}",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_sms_template(&request_id, &access_token, fo_no)
                .await
        },
    )
    .await?;

    Ok(template_detail_response(template, trace))
}

#[tauri::command]
pub async fn cmd_admin_sms_template_create(
    state: State<'_, AppState>,
    input: AdminSmsTemplateCreateInput,
) -> CommandResult<AdminSmsTemplateDetailResponse> {
    let input = normalize_template_create_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: template,
        trace,
    } = execute_with_access_token(
        &app_state,
        SMS_TEMPLATE_COMPONENT,
        "cmd_admin_sms_template_create",
        "/admin/sms/templates",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .create_admin_sms_template(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(template_detail_response(template, trace))
}

#[tauri::command]
pub async fn cmd_admin_sms_template_update(
    state: State<'_, AppState>,
    input: AdminSmsTemplateUpdateInput,
) -> CommandResult<AdminSmsTemplateDetailResponse> {
    let input = normalize_template_update_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: template,
        trace,
    } = execute_with_access_token(
        &app_state,
        SMS_TEMPLATE_COMPONENT,
        "cmd_admin_sms_template_update",
        "/admin/sms/templates/{fo_no}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .update_admin_sms_template(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(template_detail_response(template, trace))
}

#[tauri::command]
pub async fn cmd_admin_sms_template_delete(
    state: State<'_, AppState>,
    input: AdminSmsTemplateDeleteInput,
) -> CommandResult<CommandMessage> {
    let input = AdminSmsTemplateDeleteInput {
        fo_no: input.fo_no.max(1),
    };
    let (request_id, app_state) = command_context(&state);
    let trace = execute_with_access_token(
        &app_state,
        SMS_TEMPLATE_COMPONENT,
        "cmd_admin_sms_template_delete",
        "/admin/sms/templates/{fo_no}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .delete_admin_sms_template(&request_id, &access_token, input.fo_no)
                    .await
            }
        },
    )
    .await?;

    Ok(deleted_message(trace))
}

#[tauri::command]
pub async fn cmd_admin_sms_template_batch(
    state: State<'_, AppState>,
    input: AdminSmsTemplateBatchInput,
) -> CommandResult<AdminSmsTemplateBatchResponse> {
    let input = normalize_template_batch_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: result,
        trace,
    } = execute_with_access_token(
        &app_state,
        SMS_TEMPLATE_COMPONENT,
        "cmd_admin_sms_template_batch",
        "/admin/sms/templates/batch",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .batch_admin_sms_templates(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(template_batch_response(result, trace))
}
