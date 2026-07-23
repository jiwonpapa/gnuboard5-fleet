use super::{deleted_message, PERMISSION_COMPONENT};
use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::permission::{
    AdminAuthDeleteInput, AdminAuthListQuery, AdminAuthListResponse, AdminAuthUpsertInput,
    AdminAuthUpsertResponse,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_auth_get_list(
    state: State<'_, AppState>,
    query: Option<AdminAuthListQuery>,
) -> CommandResult<AdminAuthListResponse> {
    let query = normalize_admin_auth_list_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: (items, pagination),
        trace,
    } = execute_with_access_token(
        &app_state,
        PERMISSION_COMPONENT,
        "cmd_admin_auth_get_list",
        "/admin/auth",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_auth_list(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminAuthListResponse {
        items,
        pagination,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_auth_upsert(
    state: State<'_, AppState>,
    input: AdminAuthUpsertInput,
) -> CommandResult<AdminAuthUpsertResponse> {
    let input = normalize_admin_auth_upsert_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value: item, trace } = execute_with_access_token(
        &app_state,
        PERMISSION_COMPONENT,
        "cmd_admin_auth_upsert",
        "/admin/auth/{mb_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .upsert_admin_auth(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminAuthUpsertResponse {
        item,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_auth_delete_member(
    state: State<'_, AppState>,
    input: AdminAuthDeleteInput,
) -> CommandResult<CommandMessage> {
    let input = normalize_admin_auth_delete_input(input);
    let (request_id, app_state) = command_context(&state);
    let trace = execute_with_access_token(
        &app_state,
        PERMISSION_COMPONENT,
        "cmd_admin_auth_delete_member",
        "/admin/auth/{mb_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .delete_admin_auth_by_member(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(deleted_message(trace))
}

fn normalize_admin_auth_list_query(mut query: AdminAuthListQuery) -> AdminAuthListQuery {
    query.page = query.page.max(1);
    query.per_page = query.per_page.clamp(1, 100);
    query.mb_id = query
        .mb_id
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    query.date_from = query
        .date_from
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    query.date_to = query
        .date_to
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    query
}

fn normalize_admin_auth_upsert_input(mut input: AdminAuthUpsertInput) -> AdminAuthUpsertInput {
    input.mb_id = input.mb_id.trim().to_string();
    input.auths = input
        .auths
        .into_iter()
        .map(|mut auth| {
            auth.au_menu = auth.au_menu.trim().to_string();
            auth.au_auth = normalize_admin_auth_value(&auth.au_auth);
            auth
        })
        .filter(|auth| !auth.au_menu.is_empty() && !auth.au_auth.is_empty())
        .collect();
    input
}

fn normalize_admin_auth_delete_input(mut input: AdminAuthDeleteInput) -> AdminAuthDeleteInput {
    input.mb_id = input.mb_id.trim().to_string();
    input
}

fn normalize_admin_auth_value(value: &str) -> String {
    let normalized_value = value.to_lowercase();
    let mut normalized = Vec::new();
    for token in ['r', 'w', 'd'] {
        if normalized_value.contains(token) {
            normalized.push(token.to_string());
        }
    }

    normalized.join(",")
}
