use super::SMS_HISTORY_COMPONENT;
use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::sms_history::{
    AdminSmsDeliveryListQuery, AdminSmsDeliveryListResponse, AdminSmsMessageBatchDetailQuery,
    AdminSmsMessageBatchDetailResponse, AdminSmsMessageBatchListQuery,
    AdminSmsMessageBatchListResponse,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_sms_message_batch_get_list(
    state: State<'_, AppState>,
    query: Option<AdminSmsMessageBatchListQuery>,
) -> CommandResult<AdminSmsMessageBatchListResponse> {
    let query = normalize_batch_list_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: (batches, pagination),
        trace,
    } = execute_with_access_token(
        &app_state,
        SMS_HISTORY_COMPONENT,
        "cmd_admin_sms_message_batch_get_list",
        "/admin/sms/history/batches",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_sms_message_batches(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminSmsMessageBatchListResponse {
        batches,
        pagination,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_sms_message_batch_get(
    state: State<'_, AppState>,
    query: AdminSmsMessageBatchDetailQuery,
) -> CommandResult<AdminSmsMessageBatchDetailResponse> {
    let query = normalize_batch_detail_query(query);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: batch,
        trace,
    } = execute_with_access_token(
        &app_state,
        SMS_HISTORY_COMPONENT,
        "cmd_admin_sms_message_batch_get",
        "/admin/sms/history/batches/{wr_no}",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_sms_message_batch_detail(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminSmsMessageBatchDetailResponse {
        batch,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_sms_delivery_get_list(
    state: State<'_, AppState>,
    query: Option<AdminSmsDeliveryListQuery>,
) -> CommandResult<AdminSmsDeliveryListResponse> {
    let query = normalize_delivery_list_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: (deliveries, pagination),
        trace,
    } = execute_with_access_token(
        &app_state,
        SMS_HISTORY_COMPONENT,
        "cmd_admin_sms_delivery_get_list",
        "/admin/sms/history/deliveries",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_sms_deliveries(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminSmsDeliveryListResponse {
        deliveries,
        pagination,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

fn normalize_batch_list_query(
    mut query: AdminSmsMessageBatchListQuery,
) -> AdminSmsMessageBatchListQuery {
    query.page = query.page.max(1);
    query.per_page = query.per_page.clamp(1, 100);
    query.search = query.search.and_then(normalize_optional);
    query
}

fn normalize_batch_detail_query(
    mut query: AdminSmsMessageBatchDetailQuery,
) -> AdminSmsMessageBatchDetailQuery {
    query.wr_no = query.wr_no.max(1);
    query.wr_renum = query.wr_renum.map(|value| value.max(0));
    query.page = query.page.max(1);
    query.per_page = query.per_page.clamp(1, 100);
    query.search = query.search.and_then(normalize_optional);
    query.search_field = query.search_field.and_then(|value| {
        let normalized = value.trim().to_string();
        match normalized.as_str() {
            "name" | "hp" => Some(normalized),
            _ => None,
        }
    });
    query
}

fn normalize_delivery_list_query(
    mut query: AdminSmsDeliveryListQuery,
) -> AdminSmsDeliveryListQuery {
    query.page = query.page.max(1);
    query.per_page = query.per_page.clamp(1, 100);
    query.search = query.search.and_then(normalize_optional);
    query.search_field = query.search_field.and_then(|value| {
        let normalized = value.trim().to_string();
        match normalized.as_str() {
            "name" | "hp" | "bk_no" => Some(normalized),
            _ => None,
        }
    });
    query
}

fn normalize_optional(value: String) -> Option<String> {
    let normalized = value.trim().to_string();
    if normalized.is_empty() {
        None
    } else {
        Some(normalized)
    }
}
