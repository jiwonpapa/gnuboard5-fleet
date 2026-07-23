use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::sms_message::{AdminSmsSendInput, AdminSmsSendResponse};
use g5_admin_models::models::trace::Traced;
use tauri::State;

const SMS_MESSAGE_COMPONENT: &str = "g5_admin::commands::sms_message";

#[tauri::command]
pub async fn cmd_admin_sms_message_send(
    state: State<'_, AppState>,
    input: AdminSmsSendInput,
) -> CommandResult<AdminSmsSendResponse> {
    let input = normalize_send_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: result,
        trace,
    } = execute_with_access_token(
        &app_state,
        SMS_MESSAGE_COMPONENT,
        "cmd_admin_sms_message_send",
        "/admin/sms/messages",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .send_admin_sms_message(&request_id, &access_token, &input)
                    .await
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

fn normalize_send_input(mut input: AdminSmsSendInput) -> AdminSmsSendInput {
    input.message = input.message.and_then(normalize_optional);
    input.template_id = input.template_id.filter(|value| *value > 0);
    input.group_ids = normalize_positive_vec(input.group_ids);
    input.contact_ids = normalize_positive_vec(input.contact_ids);
    input.member_levels = normalize_positive_vec(input.member_levels);
    input.manual_targets = input
        .manual_targets
        .into_iter()
        .map(|mut target| {
            target.name = target.name.and_then(normalize_optional);
            target.phone = normalize_phone_digits(&target.phone);
            target
        })
        .filter(|target| !target.phone.is_empty())
        .collect();
    input.booking_at = input.booking_at.and_then(normalize_optional);
    input.wr_reply = input.wr_reply.and_then(normalize_optional);
    input
}

fn normalize_positive_vec(values: Vec<i32>) -> Vec<i32> {
    let mut normalized = values
        .into_iter()
        .filter(|value| *value > 0)
        .collect::<Vec<_>>();
    normalized.sort_unstable();
    normalized.dedup();
    normalized
}

fn normalize_optional(value: String) -> Option<String> {
    let normalized = value.trim().to_string();
    if normalized.is_empty() {
        None
    } else {
        Some(normalized)
    }
}

fn normalize_phone_digits(value: &str) -> String {
    value.chars().filter(|char| char.is_ascii_digit()).collect()
}
