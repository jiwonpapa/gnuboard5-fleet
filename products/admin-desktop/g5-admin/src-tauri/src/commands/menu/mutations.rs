use super::{deleted_message, MENU_COMPONENT};
use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::menu::{
    AdminMenuCreateInput, AdminMenuDeleteInput, AdminMenuDetailResponse, AdminMenuReorderInput,
    AdminMenuReorderResponse, AdminMenuUpdateInput,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_menu_create(
    state: State<'_, AppState>,
    input: AdminMenuCreateInput,
) -> CommandResult<AdminMenuDetailResponse> {
    let input = normalize_menu_create_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value: menu, trace } = execute_with_access_token(
        &app_state,
        MENU_COMPONENT,
        "cmd_admin_menu_create",
        "/admin/menus",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .create_admin_menu(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminMenuDetailResponse {
        menu,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_menu_update(
    state: State<'_, AppState>,
    input: AdminMenuUpdateInput,
) -> CommandResult<AdminMenuDetailResponse> {
    let input = normalize_menu_update_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value: menu, trace } = execute_with_access_token(
        &app_state,
        MENU_COMPONENT,
        "cmd_admin_menu_update",
        "/admin/menus/{me_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .update_admin_menu(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminMenuDetailResponse {
        menu,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_menu_delete(
    state: State<'_, AppState>,
    input: AdminMenuDeleteInput,
) -> CommandResult<CommandMessage> {
    let (request_id, app_state) = command_context(&state);
    let trace = execute_with_access_token(
        &app_state,
        MENU_COMPONENT,
        "cmd_admin_menu_delete",
        "/admin/menus/{me_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .delete_admin_menu(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(deleted_message(trace))
}

#[tauri::command]
pub async fn cmd_admin_menu_reorder(
    state: State<'_, AppState>,
    input: AdminMenuReorderInput,
) -> CommandResult<AdminMenuReorderResponse> {
    let input = normalize_menu_reorder_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        MENU_COMPONENT,
        "cmd_admin_menu_reorder",
        "/admin/menus",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .reorder_admin_menus(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminMenuReorderResponse {
        result: value.result,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_menu_reorder_legacy(
    state: State<'_, AppState>,
    input: AdminMenuReorderInput,
) -> CommandResult<AdminMenuReorderResponse> {
    let input = normalize_menu_reorder_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        MENU_COMPONENT,
        "cmd_admin_menu_reorder_legacy",
        "/admin/menus/reorder",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .reorder_admin_menus_legacy(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminMenuReorderResponse {
        result: value.result,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

fn normalize_menu_create_input(mut input: AdminMenuCreateInput) -> AdminMenuCreateInput {
    input.me_code = input.me_code.trim().to_string();
    input.me_name = input.me_name.trim().to_string();
    input.me_link = input.me_link.trim().to_string();
    input.me_target = normalize_optional(input.me_target);
    input
}

fn normalize_menu_update_input(mut input: AdminMenuUpdateInput) -> AdminMenuUpdateInput {
    input.me_code = normalize_optional(input.me_code);
    input.me_name = normalize_optional(input.me_name);
    input.me_link = normalize_optional(input.me_link);
    input.me_target = normalize_optional(input.me_target);
    input
}

fn normalize_menu_reorder_input(mut input: AdminMenuReorderInput) -> AdminMenuReorderInput {
    input.orders = input
        .orders
        .into_iter()
        .filter(|item| item.me_id > 0)
        .map(|mut item| {
            item.me_order = item.me_order.max(0);
            item
        })
        .collect();
    input
}

fn normalize_optional(value: Option<String>) -> Option<String> {
    value
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
}
