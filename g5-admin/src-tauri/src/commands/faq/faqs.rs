use super::shared::{
    deleted_message, faq_detail_response, faq_list_response, normalize_faq_create_input,
    normalize_faq_list_query, normalize_faq_update_input, normalize_positive_i32, FAQ_COMPONENT,
};
use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::faq::{
    AdminFaqCreateInput, AdminFaqDeleteInput, AdminFaqDetailResponse, AdminFaqListQuery,
    AdminFaqListResponse, AdminFaqUpdateInput,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_faq_get_list(
    state: State<'_, AppState>,
    query: Option<AdminFaqListQuery>,
) -> CommandResult<AdminFaqListResponse> {
    let query = normalize_faq_list_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        FAQ_COMPONENT,
        "cmd_admin_faq_get_list",
        "/admin/faqs",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_faqs(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(faq_list_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_faq_get(
    state: State<'_, AppState>,
    fa_id: i32,
) -> CommandResult<AdminFaqDetailResponse> {
    let fa_id = normalize_positive_i32(fa_id);
    let (request_id, app_state) = command_context(&state);
    let Traced { value: faq, trace } = execute_with_access_token(
        &app_state,
        FAQ_COMPONENT,
        "cmd_admin_faq_get",
        "/admin/faqs/{fa_id}",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_faq(&request_id, &access_token, fa_id)
                .await
        },
    )
    .await?;

    Ok(faq_detail_response(faq, trace))
}

#[tauri::command]
pub async fn cmd_admin_faq_create(
    state: State<'_, AppState>,
    input: AdminFaqCreateInput,
) -> CommandResult<AdminFaqDetailResponse> {
    let input = normalize_faq_create_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value: faq, trace } = execute_with_access_token(
        &app_state,
        FAQ_COMPONENT,
        "cmd_admin_faq_create",
        "/admin/faqs",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .create_admin_faq(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(faq_detail_response(faq, trace))
}

#[tauri::command]
pub async fn cmd_admin_faq_update(
    state: State<'_, AppState>,
    input: AdminFaqUpdateInput,
) -> CommandResult<AdminFaqDetailResponse> {
    let input = normalize_faq_update_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value: faq, trace } = execute_with_access_token(
        &app_state,
        FAQ_COMPONENT,
        "cmd_admin_faq_update",
        "/admin/faqs/{fa_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .update_admin_faq(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(faq_detail_response(faq, trace))
}

#[tauri::command]
pub async fn cmd_admin_faq_delete(
    state: State<'_, AppState>,
    input: AdminFaqDeleteInput,
) -> CommandResult<CommandMessage> {
    let input = AdminFaqDeleteInput {
        fa_id: normalize_positive_i32(input.fa_id),
    };
    let (request_id, app_state) = command_context(&state);
    let trace = execute_with_access_token(
        &app_state,
        FAQ_COMPONENT,
        "cmd_admin_faq_delete",
        "/admin/faqs/{fa_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .delete_admin_faq(&request_id, &access_token, input.fa_id)
                    .await
            }
        },
    )
    .await?;

    Ok(deleted_message(trace))
}
