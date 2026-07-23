use super::{deleted_message, PERMISSION_COMPONENT};
use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::permission::{
    AdminPermissionDeleteInput, AdminPermissionListQuery, AdminPermissionListResponse,
    AdminPermissionSaveInput, AdminPermissionSaveResponse,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_permission_get_list(
    state: State<'_, AppState>,
    query: Option<AdminPermissionListQuery>,
) -> CommandResult<AdminPermissionListResponse> {
    let query = normalize_permission_list_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: (permissions, pagination),
        trace,
    } = execute_with_access_token(
        &app_state,
        PERMISSION_COMPONENT,
        "cmd_admin_permission_get_list",
        "/admin/system/auths",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_permissions(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminPermissionListResponse {
        permissions,
        pagination,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_permission_save(
    state: State<'_, AppState>,
    input: AdminPermissionSaveInput,
) -> CommandResult<AdminPermissionSaveResponse> {
    let input = normalize_permission_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: permission,
        trace,
    } = execute_with_access_token(
        &app_state,
        PERMISSION_COMPONENT,
        "cmd_admin_permission_save",
        "/admin/system/auths",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .save_admin_permission(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminPermissionSaveResponse {
        permission,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_permission_delete(
    state: State<'_, AppState>,
    input: AdminPermissionDeleteInput,
) -> CommandResult<CommandMessage> {
    let (request_id, app_state) = command_context(&state);
    let trace = execute_with_access_token(
        &app_state,
        PERMISSION_COMPONENT,
        "cmd_admin_permission_delete",
        "/admin/system/auths/{mb_id}/{au_menu}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .delete_admin_permission(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(deleted_message(trace))
}

fn normalize_permission_list_query(
    mut query: AdminPermissionListQuery,
) -> AdminPermissionListQuery {
    query.page = query.page.max(1);
    query.per_page = query.per_page.clamp(1, 100);
    query.mb_id = query
        .mb_id
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());

    query
}

fn normalize_permission_input(mut input: AdminPermissionSaveInput) -> AdminPermissionSaveInput {
    input.mb_id = input.mb_id.trim().to_string();
    input.au_menu = input.au_menu.trim().to_lowercase();
    input.au_auth = input.au_auth.trim().to_string();
    input
}
