use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::mail_test::{AdminMailTestInput, AdminMailTestResponse};
use g5_admin_models::models::trace::Traced;
use tauri::State;

const MAIL_TEST_COMPONENT: &str = "g5_admin::commands::mail_test";

#[tauri::command]
pub async fn cmd_admin_mail_test_send(
    state: State<'_, AppState>,
    input: AdminMailTestInput,
) -> CommandResult<AdminMailTestResponse> {
    let input = normalize_mail_test_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        MAIL_TEST_COMPONENT,
        "cmd_admin_mail_test_send",
        "/admin/system/mails/test",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .send_admin_mail_test(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminMailTestResponse {
        result: value,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_mail_test_send_legacy_mails(
    state: State<'_, AppState>,
    input: AdminMailTestInput,
) -> CommandResult<AdminMailTestResponse> {
    let input = normalize_mail_test_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        MAIL_TEST_COMPONENT,
        "cmd_admin_mail_test_send_legacy_mails",
        "/admin/mails/test",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .send_admin_mail_test_legacy_mails(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminMailTestResponse {
        result: value,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_mail_test_send_legacy_mail_tests(
    state: State<'_, AppState>,
    input: AdminMailTestInput,
) -> CommandResult<AdminMailTestResponse> {
    let input = normalize_mail_test_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        MAIL_TEST_COMPONENT,
        "cmd_admin_mail_test_send_legacy_mail_tests",
        "/admin/mail-tests",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .send_admin_mail_test_legacy_mail_tests(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminMailTestResponse {
        result: value,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

fn normalize_mail_test_input(mut input: AdminMailTestInput) -> AdminMailTestInput {
    input.to = input.to.trim().to_string();
    input.subject = input.subject.trim().to_string();
    input.content = input.content.trim().to_string();
    input
}
