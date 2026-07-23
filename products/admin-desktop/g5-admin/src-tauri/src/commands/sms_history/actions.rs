use super::SMS_HISTORY_COMPONENT;
use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::sms_history::AdminSmsBatchResendInput;
use g5_admin_models::models::sms_message::AdminSmsSendResponse;
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_sms_message_batch_resend_failures(
    state: State<'_, AppState>,
    input: AdminSmsBatchResendInput,
) -> CommandResult<AdminSmsSendResponse> {
    resend_batch(
        state,
        normalize_batch_resend_input(input),
        "cmd_admin_sms_message_batch_resend_failures",
        "/admin/sms/history/batches/{wr_no}/resend-failures",
        true,
    )
    .await
}

#[tauri::command]
pub async fn cmd_admin_sms_message_batch_resend_all(
    state: State<'_, AppState>,
    input: AdminSmsBatchResendInput,
) -> CommandResult<AdminSmsSendResponse> {
    resend_batch(
        state,
        normalize_batch_resend_input(input),
        "cmd_admin_sms_message_batch_resend_all",
        "/admin/sms/history/batches/{wr_no}/resend-all",
        false,
    )
    .await
}

async fn resend_batch(
    state: State<'_, AppState>,
    input: AdminSmsBatchResendInput,
    operation: &'static str,
    target: &'static str,
    failures_only: bool,
) -> CommandResult<AdminSmsSendResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: result,
        trace,
    } = execute_with_access_token(
        &app_state,
        SMS_HISTORY_COMPONENT,
        operation,
        target,
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                if failures_only {
                    app_state
                        .api_client
                        .resend_admin_sms_batch_failures(&request_id, &access_token, &input)
                        .await
                } else {
                    app_state
                        .api_client
                        .resend_admin_sms_batch_all(&request_id, &access_token, &input)
                        .await
                }
            }
        },
    )
    .await?;

    Ok(AdminSmsSendResponse {
        result,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

fn normalize_batch_resend_input(mut input: AdminSmsBatchResendInput) -> AdminSmsBatchResendInput {
    input.wr_no = input.wr_no.max(1);
    input.wr_renum = input.wr_renum.map(|value| value.max(0));
    input.booking_at = input.booking_at.and_then(normalize_optional);
    input
}

fn normalize_optional(value: String) -> Option<String> {
    let normalized = value.trim().to_string();
    if normalized.is_empty() {
        None
    } else {
        Some(normalized)
    }
}
