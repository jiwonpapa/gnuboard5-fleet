use crate::app_state::AppState;
use crate::commands::mail::shared::{
    mail_delete_response, mail_detail_response, mail_send_response, normalize_mail_send_input,
    normalize_mail_template_create_input, normalize_mail_template_update_input, MAIL_COMPONENT,
};
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::mail::{
    AdminMailDetailResponse, AdminMailSendInput, AdminMailSendResponse,
    AdminMailTemplateCreateInput, AdminMailTemplateDeleteInput, AdminMailTemplateUpdateInput,
    AdminSystemMailSendRequest, AdminSystemMailSendResponse,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_system_mail_send(
    state: State<'_, AppState>,
    mut input: AdminSystemMailSendRequest,
) -> CommandResult<AdminSystemMailSendResponse> {
    input.subject = input.subject.and_then(|value| {
        let normalized = value.trim().to_string();
        (!normalized.is_empty()).then_some(normalized)
    });
    input.content = input.content.and_then(|value| {
        let normalized = value.trim().to_string();
        (!normalized.is_empty()).then_some(normalized)
    });
    input.mb_ids = input
        .mb_ids
        .into_iter()
        .map(|member_id| member_id.trim().to_string())
        .filter(|member_id| !member_id.is_empty())
        .collect();

    let (request_id, app_state) = command_context(&state);
    let Traced { value, .. } = execute_with_access_token(
        &app_state,
        MAIL_COMPONENT,
        "cmd_admin_system_mail_send",
        "/admin/system/mails/send",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .send_admin_system_mail(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(value)
}

#[tauri::command]
pub async fn cmd_admin_mail_create(
    state: State<'_, AppState>,
    input: AdminMailTemplateCreateInput,
) -> CommandResult<AdminMailDetailResponse> {
    let input = normalize_mail_template_create_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        MAIL_COMPONENT,
        "cmd_admin_mail_create",
        "/admin/mails/templates",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .create_admin_mail_template(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(mail_detail_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_mail_update(
    state: State<'_, AppState>,
    input: AdminMailTemplateUpdateInput,
) -> CommandResult<AdminMailDetailResponse> {
    let input = normalize_mail_template_update_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        MAIL_COMPONENT,
        "cmd_admin_mail_update",
        "/admin/mails/{ma_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .update_admin_mail_template(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(mail_detail_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_mail_delete(
    state: State<'_, AppState>,
    input: AdminMailTemplateDeleteInput,
) -> CommandResult<CommandMessage> {
    let (request_id, app_state) = command_context(&state);
    let trace = execute_with_access_token(
        &app_state,
        MAIL_COMPONENT,
        "cmd_admin_mail_delete",
        "/admin/mails/{ma_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .delete_admin_mail(&request_id, &access_token, input.ma_id)
                    .await
            }
        },
    )
    .await?;

    Ok(mail_delete_response(trace))
}

#[tauri::command]
pub async fn cmd_admin_mail_send(
    state: State<'_, AppState>,
    input: AdminMailSendInput,
) -> CommandResult<AdminMailSendResponse> {
    let input = normalize_mail_send_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        MAIL_COMPONENT,
        "cmd_admin_mail_send",
        "/admin/mails",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .send_admin_mail(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(mail_send_response(value, trace))
}
