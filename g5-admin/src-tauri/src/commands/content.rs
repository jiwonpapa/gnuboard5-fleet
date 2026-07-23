use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::content::{
    AdminContentCreateInput, AdminContentDeleteInput, AdminContentDetailResponse,
    AdminContentListQuery, AdminContentListResponse, AdminContentUpdateInput,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

const CONTENT_COMPONENT: &str = "g5_admin::commands::content";

#[tauri::command]
pub async fn cmd_admin_content_get_list(
    state: State<'_, AppState>,
    query: Option<AdminContentListQuery>,
) -> CommandResult<AdminContentListResponse> {
    let query = normalize_content_list_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: (contents, pagination),
        trace,
    } = execute_with_access_token(
        &app_state,
        CONTENT_COMPONENT,
        "cmd_admin_content_get_list",
        "/admin/contents",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_contents(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminContentListResponse {
        contents,
        pagination,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_content_get(
    state: State<'_, AppState>,
    co_id: String,
) -> CommandResult<AdminContentDetailResponse> {
    let co_id = normalize_content_id(co_id);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: content,
        trace,
    } = execute_with_access_token(
        &app_state,
        CONTENT_COMPONENT,
        "cmd_admin_content_get",
        "/admin/contents/{co_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let co_id = co_id.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_content(&request_id, &access_token, &co_id)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminContentDetailResponse {
        content,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_content_create(
    state: State<'_, AppState>,
    input: AdminContentCreateInput,
) -> CommandResult<AdminContentDetailResponse> {
    let input = normalize_content_create_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: content,
        trace,
    } = execute_with_access_token(
        &app_state,
        CONTENT_COMPONENT,
        "cmd_admin_content_create",
        "/admin/contents",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .create_admin_content(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminContentDetailResponse {
        content,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_content_update(
    state: State<'_, AppState>,
    input: AdminContentUpdateInput,
) -> CommandResult<AdminContentDetailResponse> {
    let input = normalize_content_update_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: content,
        trace,
    } = execute_with_access_token(
        &app_state,
        CONTENT_COMPONENT,
        "cmd_admin_content_update",
        "/admin/contents/{co_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .update_admin_content(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminContentDetailResponse {
        content,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_content_delete(
    state: State<'_, AppState>,
    input: AdminContentDeleteInput,
) -> CommandResult<CommandMessage> {
    let input = AdminContentDeleteInput {
        co_id: normalize_content_id(input.co_id),
    };
    let (request_id, app_state) = command_context(&state);
    let trace = execute_with_access_token(
        &app_state,
        CONTENT_COMPONENT,
        "cmd_admin_content_delete",
        "/admin/contents/{co_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .delete_admin_content(&request_id, &access_token, &input.co_id)
                    .await
            }
        },
    )
    .await?;

    Ok(CommandMessage {
        message: "deleted".to_string(),
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

fn normalize_content_list_query(mut query: AdminContentListQuery) -> AdminContentListQuery {
    query.page = query.page.max(1);
    query.per_page = query.per_page.clamp(1, 100);
    query.search = normalize_optional(query.search);

    query
}

fn normalize_content_create_input(mut input: AdminContentCreateInput) -> AdminContentCreateInput {
    input.co_id = normalize_content_id(input.co_id);
    input.co_subject = input.co_subject.trim().to_string();
    input.co_content = input.co_content.trim().to_string();
    input.co_mobile_content = normalize_optional(input.co_mobile_content);
    input.co_html = i32::from(input.co_html > 0);

    input
}

fn normalize_content_update_input(mut input: AdminContentUpdateInput) -> AdminContentUpdateInput {
    input.co_id = normalize_content_id(input.co_id);
    input.co_subject = normalize_optional(input.co_subject);
    input.co_content = normalize_optional(input.co_content);
    input.co_mobile_content = normalize_optional(input.co_mobile_content);
    input.co_html = input.co_html.map(|value| i32::from(value > 0));

    input
}

fn normalize_content_id(value: String) -> String {
    value.trim().to_string()
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
