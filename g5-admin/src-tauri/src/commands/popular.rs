use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::popular::{
    AdminPopularListQuery, AdminPopularListResponse, AdminPopularRankQuery,
    AdminPopularRankResponse, AdminPopularResetInput, AdminPopularResetResponse,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

const POPULAR_COMPONENT: &str = "g5_admin::commands::popular";

#[tauri::command]
pub async fn cmd_admin_popular_get_list(
    state: State<'_, AppState>,
    query: Option<AdminPopularListQuery>,
) -> CommandResult<AdminPopularListResponse> {
    let query = normalize_popular_list_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: (populars, pagination),
        trace,
    } = execute_with_access_token(
        &app_state,
        POPULAR_COMPONENT,
        "cmd_admin_popular_get_list",
        "/admin/popular",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_populars(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminPopularListResponse {
        populars,
        pagination,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_popular_reset(
    state: State<'_, AppState>,
    input: Option<AdminPopularResetInput>,
) -> CommandResult<AdminPopularResetResponse> {
    let input = normalize_popular_reset_input(input.unwrap_or(AdminPopularResetInput {
        date_from: None,
        date_to: None,
    }));
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: result,
        trace,
    } = execute_with_access_token(
        &app_state,
        POPULAR_COMPONENT,
        "cmd_admin_popular_reset",
        "/admin/popular",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .reset_admin_populars(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminPopularResetResponse {
        result,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_popular_rank_get(
    state: State<'_, AppState>,
    query: Option<AdminPopularRankQuery>,
) -> CommandResult<AdminPopularRankResponse> {
    let query = normalize_popular_rank_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: (ranks, pagination),
        trace,
    } = execute_with_access_token(
        &app_state,
        POPULAR_COMPONENT,
        "cmd_admin_popular_rank_get",
        "/admin/popular/rank",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_popular_ranks(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminPopularRankResponse {
        ranks,
        pagination,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

fn normalize_popular_list_query(mut query: AdminPopularListQuery) -> AdminPopularListQuery {
    query.page = query.page.max(1);
    query.per_page = query.per_page.clamp(1, 100);
    query.date_from = normalize_optional(query.date_from);
    query.date_to = normalize_optional(query.date_to);

    query
}

fn normalize_popular_reset_input(mut input: AdminPopularResetInput) -> AdminPopularResetInput {
    input.date_from = normalize_optional(input.date_from);
    input.date_to = normalize_optional(input.date_to);

    input
}

fn normalize_popular_rank_query(mut query: AdminPopularRankQuery) -> AdminPopularRankQuery {
    query.limit = query.limit.clamp(1, 100);
    query.date_from = normalize_optional(query.date_from);
    query.date_to = normalize_optional(query.date_to);

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
