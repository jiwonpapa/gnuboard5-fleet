use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::qa::{AdminQaBulkDeleteInput, AdminQaBulkDeleteResponse};
use g5_admin_models::models::trace::Traced;
use tauri::State;

const QA_COMPONENT: &str = "g5_admin::commands::qa";

#[tauri::command]
pub async fn cmd_admin_qa_bulk_delete(
    state: State<'_, AppState>,
    input: AdminQaBulkDeleteInput,
) -> CommandResult<AdminQaBulkDeleteResponse> {
    let input = normalize_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: result,
        trace,
    } = execute_with_access_token(
        &app_state,
        QA_COMPONENT,
        "cmd_admin_qa_bulk_delete",
        "/admin/qa",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .bulk_delete_admin_qa(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminQaBulkDeleteResponse {
        result,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

fn normalize_input(mut input: AdminQaBulkDeleteInput) -> AdminQaBulkDeleteInput {
    input.qa_ids.retain(|qa_id| *qa_id > 0);
    input
}
