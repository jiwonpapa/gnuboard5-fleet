use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::report::{
    AdminReportDetailResponse, AdminReportListQuery, AdminReportListResponse,
    AdminReportStatsResponse, AdminReportUpdateInput,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

const REPORT_COMPONENT: &str = "g5_admin::commands::report";

#[tauri::command]
pub async fn cmd_admin_report_get_list(
    state: State<'_, AppState>,
    query: Option<AdminReportListQuery>,
) -> CommandResult<AdminReportListResponse> {
    let query = normalize_list_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: (reports, pagination),
        trace,
    } = execute_with_access_token(
        &app_state,
        REPORT_COMPONENT,
        "cmd_admin_report_get_list",
        "/admin/reports",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_reports(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminReportListResponse {
        reports,
        pagination,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_report_stats_get(
    state: State<'_, AppState>,
) -> CommandResult<AdminReportStatsResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: stats,
        trace,
    } = execute_with_access_token(
        &app_state,
        REPORT_COMPONENT,
        "cmd_admin_report_stats_get",
        "/admin/reports/stats",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_report_stats(&request_id, &access_token)
                .await
        },
    )
    .await?;

    Ok(AdminReportStatsResponse {
        stats,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_report_update(
    state: State<'_, AppState>,
    input: AdminReportUpdateInput,
) -> CommandResult<AdminReportDetailResponse> {
    let input = normalize_update_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: report,
        trace,
    } = execute_with_access_token(
        &app_state,
        REPORT_COMPONENT,
        "cmd_admin_report_update",
        "/admin/reports/{report_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .update_admin_report(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminReportDetailResponse {
        report,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

fn normalize_list_query(mut query: AdminReportListQuery) -> AdminReportListQuery {
    query.page = query.page.max(1);
    query.per_page = query.per_page.clamp(1, 100);
    query.status = normalize_optional(query.status);
    query.target_type = normalize_optional(query.target_type);
    query
}

fn normalize_update_input(mut input: AdminReportUpdateInput) -> AdminReportUpdateInput {
    input.status = input.status.trim().to_string();
    input.admin_memo = normalize_optional(input.admin_memo);
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
