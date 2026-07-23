use super::shared::{
    deleted_message, faq_master_detail_response, faq_master_list_response,
    normalize_master_create_input, normalize_master_list_query, normalize_master_update_input,
    normalize_positive_i32, FAQ_COMPONENT,
};
use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::faq::{
    AdminFaqMasterCreateInput, AdminFaqMasterDeleteInput, AdminFaqMasterDetailResponse,
    AdminFaqMasterListQuery, AdminFaqMasterListResponse, AdminFaqMasterUpdateInput,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_faq_master_get_list(
    state: State<'_, AppState>,
    query: Option<AdminFaqMasterListQuery>,
) -> CommandResult<AdminFaqMasterListResponse> {
    let query = normalize_master_list_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        FAQ_COMPONENT,
        "cmd_admin_faq_master_get_list",
        "/admin/faq-masters",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_faq_masters(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(faq_master_list_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_faq_master_get(
    state: State<'_, AppState>,
    fm_id: i32,
) -> CommandResult<AdminFaqMasterDetailResponse> {
    let fm_id = normalize_positive_i32(fm_id);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: master,
        trace,
    } = execute_with_access_token(
        &app_state,
        FAQ_COMPONENT,
        "cmd_admin_faq_master_get",
        "/admin/faq-masters/{fm_id}",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_faq_master(&request_id, &access_token, fm_id)
                .await
        },
    )
    .await?;

    Ok(faq_master_detail_response(master, trace))
}

#[tauri::command]
pub async fn cmd_admin_faq_master_create(
    state: State<'_, AppState>,
    input: AdminFaqMasterCreateInput,
) -> CommandResult<AdminFaqMasterDetailResponse> {
    let input = normalize_master_create_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: master,
        trace,
    } = execute_with_access_token(
        &app_state,
        FAQ_COMPONENT,
        "cmd_admin_faq_master_create",
        "/admin/faq-masters",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .create_admin_faq_master(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(faq_master_detail_response(master, trace))
}

#[tauri::command]
pub async fn cmd_admin_faq_master_update(
    state: State<'_, AppState>,
    input: AdminFaqMasterUpdateInput,
) -> CommandResult<AdminFaqMasterDetailResponse> {
    let input = normalize_master_update_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: master,
        trace,
    } = execute_with_access_token(
        &app_state,
        FAQ_COMPONENT,
        "cmd_admin_faq_master_update",
        "/admin/faq-masters/{fm_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .update_admin_faq_master(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(faq_master_detail_response(master, trace))
}

#[tauri::command]
pub async fn cmd_admin_faq_master_delete(
    state: State<'_, AppState>,
    input: AdminFaqMasterDeleteInput,
) -> CommandResult<CommandMessage> {
    let input = AdminFaqMasterDeleteInput {
        fm_id: normalize_positive_i32(input.fm_id),
    };
    let (request_id, app_state) = command_context(&state);
    let trace = execute_with_access_token(
        &app_state,
        FAQ_COMPONENT,
        "cmd_admin_faq_master_delete",
        "/admin/faq-masters/{fm_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .delete_admin_faq_master(&request_id, &access_token, input.fm_id)
                    .await
            }
        },
    )
    .await?;

    Ok(deleted_message(trace))
}
