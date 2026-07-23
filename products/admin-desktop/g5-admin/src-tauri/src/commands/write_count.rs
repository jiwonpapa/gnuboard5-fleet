use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::trace::Traced;
use g5_admin_models::models::write_count::{
    AdminWriteCountStatsQuery, AdminWriteCountStatsResponse,
};
use tauri::State;

const WRITE_COUNT_COMPONENT: &str = "g5_admin::commands::write_count";

#[tauri::command]
pub async fn cmd_admin_write_count_stats_get(
    state: State<'_, AppState>,
    query: Option<AdminWriteCountStatsQuery>,
) -> CommandResult<AdminWriteCountStatsResponse> {
    let query = normalize_write_count_stats_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        WRITE_COUNT_COMPONENT,
        "cmd_admin_write_count_stats_get",
        "/admin/write-count/stats",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_write_count_stats(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminWriteCountStatsResponse {
        period: value.period,
        date_from: value.date_from,
        date_to: value.date_to,
        bo_table: value.bo_table,
        summary: value.summary,
        items: value.items,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

fn normalize_write_count_stats_query(
    mut query: AdminWriteCountStatsQuery,
) -> AdminWriteCountStatsQuery {
    query.period = query.period.and_then(|value| {
        let normalized = value.trim().to_lowercase();
        match normalized.as_str() {
            "hour" | "day" | "week" | "month" | "year" => Some(normalized),
            _ => None,
        }
    });
    query.date_from = normalize_optional(query.date_from);
    query.date_to = normalize_optional(query.date_to);
    query.bo_table = normalize_optional(query.bo_table);

    query
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
