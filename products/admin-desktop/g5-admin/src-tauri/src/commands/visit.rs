use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::trace::Traced;
use g5_admin_models::models::visit::{
    AdminVisitDeleteInput, AdminVisitDeleteResponse, AdminVisitSearchQuery,
    AdminVisitSearchResponse, AdminVisitStatsQuery, AdminVisitStatsResponse,
};
use tauri::State;

const VISIT_COMPONENT: &str = "g5_admin::commands::visit";

#[tauri::command]
pub async fn cmd_admin_visit_stats_get(
    state: State<'_, AppState>,
    query: Option<AdminVisitStatsQuery>,
) -> CommandResult<AdminVisitStatsResponse> {
    let query = normalize_visit_stats_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: (visit_type, summary, items),
        trace,
    } = execute_with_access_token(
        &app_state,
        VISIT_COMPONENT,
        "cmd_admin_visit_stats_get",
        "/admin/visits/stats",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_visit_stats(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminVisitStatsResponse {
        r#type: visit_type,
        summary,
        items,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_visit_search(
    state: State<'_, AppState>,
    query: Option<AdminVisitSearchQuery>,
) -> CommandResult<AdminVisitSearchResponse> {
    let query = normalize_visit_search_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: (visits, pagination),
        trace,
    } = execute_with_access_token(
        &app_state,
        VISIT_COMPONENT,
        "cmd_admin_visit_search",
        "/admin/visits/search",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .search_admin_visits(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminVisitSearchResponse {
        visits,
        pagination,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_visit_delete(
    state: State<'_, AppState>,
    input: AdminVisitDeleteInput,
) -> CommandResult<AdminVisitDeleteResponse> {
    let input = normalize_visit_delete_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: result,
        trace,
    } = execute_with_access_token(
        &app_state,
        VISIT_COMPONENT,
        "cmd_admin_visit_delete",
        "/admin/visits",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .delete_admin_visits(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminVisitDeleteResponse {
        result,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

fn normalize_visit_stats_query(mut query: AdminVisitStatsQuery) -> AdminVisitStatsQuery {
    query.date_from = normalize_optional(query.date_from);
    query.date_to = normalize_optional(query.date_to);
    query.r#type = normalize_optional(query.r#type).or(Some("date".to_string()));
    query.limit = Some(query.limit.unwrap_or(30).clamp(1, 1000));

    query
}

fn normalize_visit_search_query(mut query: AdminVisitSearchQuery) -> AdminVisitSearchQuery {
    query.page = query.page.max(1);
    query.per_page = query.per_page.clamp(1, 200);
    query.date_from = normalize_optional(query.date_from);
    query.date_to = normalize_optional(query.date_to);
    query.ip = normalize_optional(query.ip);
    query.referer = normalize_optional(query.referer);
    query.agent = normalize_optional(query.agent);

    query
}

fn normalize_visit_delete_input(mut input: AdminVisitDeleteInput) -> AdminVisitDeleteInput {
    input.before = normalize_optional(input.before);
    input.date_from = normalize_optional(input.date_from);
    input.date_to = normalize_optional(input.date_to);
    input.ip = normalize_optional(input.ip);

    input
}

fn normalize_optional(value: Option<String>) -> Option<String> {
    value
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
}
