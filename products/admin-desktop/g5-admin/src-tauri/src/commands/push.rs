use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::push::{AdminPushMessageInput, AdminPushMessageResponse};
use g5_admin_models::models::trace::Traced;
use tauri::State;

const PUSH_COMPONENT: &str = "g5_admin::commands::push";

#[tauri::command]
pub async fn cmd_admin_push_message_create(
    state: State<'_, AppState>,
    input: AdminPushMessageInput,
) -> CommandResult<AdminPushMessageResponse> {
    let input = normalize_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: result,
        trace,
    } = execute_with_access_token(
        &app_state,
        PUSH_COMPONENT,
        "cmd_admin_push_message_create",
        "/admin/push/messages",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .create_admin_push_message(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminPushMessageResponse {
        result,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_push_send(
    state: State<'_, AppState>,
    input: AdminPushMessageInput,
) -> CommandResult<AdminPushMessageResponse> {
    let input = normalize_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: result,
        trace,
    } = execute_with_access_token(
        &app_state,
        PUSH_COMPONENT,
        "cmd_admin_push_send",
        "/admin/push/send",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .send_admin_push_message(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminPushMessageResponse {
        result,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

fn normalize_input(mut input: AdminPushMessageInput) -> AdminPushMessageInput {
    input.title = input.title.trim().to_string();
    input.body = input.body.trim().to_string();
    input.r#type = normalize_optional(input.r#type);
    input.target = normalize_optional(input.target);
    input.member_ids = input.member_ids.map(|member_ids| {
        member_ids
            .into_iter()
            .map(|member_id| member_id.trim().to_string())
            .filter(|member_id| !member_id.is_empty())
            .collect()
    });
    input
}

fn normalize_optional(value: Option<String>) -> Option<String> {
    value.and_then(|value| {
        let normalized = value.trim().to_string();
        if normalized.is_empty() {
            None
        } else {
            Some(normalized)
        }
    })
}
