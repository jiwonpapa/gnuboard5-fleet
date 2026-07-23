use super::shared::{
    normalize_reorder_input, normalize_save_input, normalize_widget_create_input,
    normalize_widget_update_input, run_layout_action,
};
use crate::app_state::AppState;
use crate::error::CommandResult;
use g5_admin_models::models::layout::{
    AdminLayoutActionResponse, AdminLayoutReorderInput, AdminLayoutSaveInput,
    AdminLayoutWidgetCreateInput, AdminLayoutWidgetDeleteInput, AdminLayoutWidgetUpdateInput,
};
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_layout_save(
    state: State<'_, AppState>,
    input: AdminLayoutSaveInput,
) -> CommandResult<AdminLayoutActionResponse> {
    run_layout_action(
        state,
        normalize_save_input(input),
        "cmd_admin_layout_save",
        "/admin/layouts/{page_id}",
        |app_state, request_id, access_token, input| async move {
            app_state
                .api_client
                .save_admin_layout(&request_id, &access_token, &input)
                .await
        },
    )
    .await
}

#[tauri::command]
pub async fn cmd_admin_layout_widget_add(
    state: State<'_, AppState>,
    input: AdminLayoutWidgetCreateInput,
) -> CommandResult<AdminLayoutActionResponse> {
    run_layout_action(
        state,
        normalize_widget_create_input(input),
        "cmd_admin_layout_widget_add",
        "/admin/layouts/{page_id}/widgets",
        |app_state, request_id, access_token, input| async move {
            app_state
                .api_client
                .add_admin_layout_widget(&request_id, &access_token, &input)
                .await
        },
    )
    .await
}

#[tauri::command]
pub async fn cmd_admin_layout_widget_update(
    state: State<'_, AppState>,
    input: AdminLayoutWidgetUpdateInput,
) -> CommandResult<AdminLayoutActionResponse> {
    run_layout_action(
        state,
        normalize_widget_update_input(input),
        "cmd_admin_layout_widget_update",
        "/admin/layouts/{page_id}/widgets/{widget_id}",
        |app_state, request_id, access_token, input| async move {
            app_state
                .api_client
                .update_admin_layout_widget(&request_id, &access_token, &input)
                .await
        },
    )
    .await
}

#[tauri::command]
pub async fn cmd_admin_layout_widget_delete(
    state: State<'_, AppState>,
    input: AdminLayoutWidgetDeleteInput,
) -> CommandResult<AdminLayoutActionResponse> {
    run_layout_action(
        state,
        AdminLayoutWidgetDeleteInput {
            page_id: input.page_id.trim().to_string(),
            widget_id: input.widget_id.trim().to_string(),
        },
        "cmd_admin_layout_widget_delete",
        "/admin/layouts/{page_id}/widgets/{widget_id}",
        |app_state, request_id, access_token, input| async move {
            app_state
                .api_client
                .delete_admin_layout_widget(&request_id, &access_token, &input)
                .await
        },
    )
    .await
}

#[tauri::command]
pub async fn cmd_admin_layout_reorder(
    state: State<'_, AppState>,
    input: AdminLayoutReorderInput,
) -> CommandResult<AdminLayoutActionResponse> {
    run_layout_action(
        state,
        normalize_reorder_input(input),
        "cmd_admin_layout_reorder",
        "/admin/layouts/{page_id}/widgets",
        |app_state, request_id, access_token, input| async move {
            app_state
                .api_client
                .reorder_admin_layout_widgets(&request_id, &access_token, &input)
                .await
        },
    )
    .await
}
