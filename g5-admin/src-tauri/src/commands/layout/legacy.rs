use super::shared::{normalize_reorder_input, run_layout_action};
use crate::app_state::AppState;
use crate::error::CommandResult;
use g5_admin_models::models::layout::{AdminLayoutActionResponse, AdminLayoutReorderInput};
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_layout_reorder_legacy(
    state: State<'_, AppState>,
    input: AdminLayoutReorderInput,
) -> CommandResult<AdminLayoutActionResponse> {
    run_layout_action(
        state,
        normalize_reorder_input(input),
        "cmd_admin_layout_reorder_legacy",
        "/admin/layouts/{page_id}/reorder",
        |app_state, request_id, access_token, input| async move {
            app_state
                .api_client
                .reorder_admin_layout_widgets_legacy(&request_id, &access_token, &input)
                .await
        },
    )
    .await
}
