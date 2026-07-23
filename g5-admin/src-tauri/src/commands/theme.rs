use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::theme::{
    AdminThemeConfigResponse, AdminThemeConfigUpdateInput, AdminThemeDetailResponse,
    AdminThemeListResponse,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

const THEME_COMPONENT: &str = "g5_admin::commands::theme";

#[tauri::command]
pub async fn cmd_admin_theme_config_get(
    state: State<'_, AppState>,
) -> CommandResult<AdminThemeConfigResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: config,
        trace,
    } = execute_with_access_token(
        &app_state,
        THEME_COMPONENT,
        "cmd_admin_theme_config_get",
        "/admin/system/theme",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_theme_config(&request_id, &access_token)
                .await
        },
    )
    .await?;

    Ok(AdminThemeConfigResponse {
        config,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_theme_config_update(
    state: State<'_, AppState>,
    input: AdminThemeConfigUpdateInput,
) -> CommandResult<AdminThemeConfigResponse> {
    let input = normalize_theme_config_update_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: config,
        trace,
    } = execute_with_access_token(
        &app_state,
        THEME_COMPONENT,
        "cmd_admin_theme_config_update",
        "/admin/system/theme",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .update_admin_theme_config(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminThemeConfigResponse {
        config,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_theme_get_list(
    state: State<'_, AppState>,
) -> CommandResult<AdminThemeListResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: (themes, total),
        trace,
    } = execute_with_access_token(
        &app_state,
        THEME_COMPONENT,
        "cmd_admin_theme_get_list",
        "/admin/system/themes",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_themes(&request_id, &access_token)
                .await
        },
    )
    .await?;

    Ok(AdminThemeListResponse {
        themes,
        total,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_theme_get(
    state: State<'_, AppState>,
    theme: String,
) -> CommandResult<AdminThemeDetailResponse> {
    let theme = normalize_theme_id(theme);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: theme,
        trace,
    } = execute_with_access_token(
        &app_state,
        THEME_COMPONENT,
        "cmd_admin_theme_get",
        "/admin/system/themes/{theme}",
        &request_id,
        |access_token, app_state, request_id| {
            let theme = theme.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_theme(&request_id, &access_token, &theme)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminThemeDetailResponse {
        theme,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

fn normalize_theme_config_update_input(
    mut input: AdminThemeConfigUpdateInput,
) -> AdminThemeConfigUpdateInput {
    input.cf_theme = input.cf_theme.map(|value| value.trim().to_string());
    input.cf_mobile_theme = input.cf_mobile_theme.map(|value| value.trim().to_string());

    input
}

fn normalize_theme_id(value: String) -> String {
    value.trim().to_string()
}
