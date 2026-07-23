use crate::app_state::AppState;
use crate::commands::mail::shared::{
    mail_detail_response, mail_list_response, mail_recipients_response, normalize_mail_list_query,
    normalize_mail_recipient_query, MAIL_COMPONENT,
};
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::mail::{
    AdminMailDetailResponse, AdminMailListQuery, AdminMailListResponse,
    AdminMailRecipientListResponse, AdminMailRecipientQuery, AdminSystemMailListQuery,
    AdminSystemMailRecipientListResponse, AdminSystemMailRecipientQuery,
    AdminSystemMailTemplateListResponse,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_system_mail_get_list(
    state: State<'_, AppState>,
    query: Option<AdminSystemMailListQuery>,
) -> CommandResult<AdminSystemMailTemplateListResponse> {
    let mut query = query.unwrap_or_default();
    query.page = query.page.max(1);
    query.per_page = query.per_page.clamp(1, 100);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, .. } = execute_with_access_token(
        &app_state,
        MAIL_COMPONENT,
        "cmd_admin_system_mail_get_list",
        "/admin/system/mails",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_system_mails(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(value)
}

#[tauri::command]
pub async fn cmd_admin_system_mail_recipients_get(
    state: State<'_, AppState>,
    query: Option<AdminSystemMailRecipientQuery>,
) -> CommandResult<AdminSystemMailRecipientListResponse> {
    let mut query = query.unwrap_or_default();
    query.page = query.page.max(1);
    query.per_page = query.per_page.clamp(1, 1000);
    query.search = query.search.and_then(|value| {
        let normalized = value.trim().to_string();
        (!normalized.is_empty()).then_some(normalized)
    });
    let (request_id, app_state) = command_context(&state);
    let Traced { value, .. } = execute_with_access_token(
        &app_state,
        MAIL_COMPONENT,
        "cmd_admin_system_mail_recipients_get",
        "/admin/system/mail-recipients",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_system_mail_recipients(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(value)
}

#[tauri::command]
pub async fn cmd_admin_mail_get_list(
    state: State<'_, AppState>,
    query: Option<AdminMailListQuery>,
) -> CommandResult<AdminMailListResponse> {
    let query = normalize_mail_list_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        MAIL_COMPONENT,
        "cmd_admin_mail_get_list",
        "/admin/mails",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_mails(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(mail_list_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_mail_get(
    state: State<'_, AppState>,
    ma_id: i32,
) -> CommandResult<AdminMailDetailResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        MAIL_COMPONENT,
        "cmd_admin_mail_get",
        "/admin/mails/{ma_id}",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_mail(&request_id, &access_token, ma_id)
                .await
        },
    )
    .await?;

    Ok(mail_detail_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_mail_recipients_get(
    state: State<'_, AppState>,
    query: Option<AdminMailRecipientQuery>,
) -> CommandResult<AdminMailRecipientListResponse> {
    let query = normalize_mail_recipient_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        MAIL_COMPONENT,
        "cmd_admin_mail_recipients_get",
        "/admin/mails/recipients",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_mail_recipients(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(mail_recipients_response(value, trace))
}
