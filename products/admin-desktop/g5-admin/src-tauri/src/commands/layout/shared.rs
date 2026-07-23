use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::{AppError, CommandResult};
use g5_admin_models::models::layout::{
    AdminLayoutActionResponse, AdminLayoutDetail, AdminLayoutDetailResponse, AdminLayoutListQuery,
    AdminLayoutListResponse, AdminLayoutReorderInput, AdminLayoutSaveInput, AdminLayoutSummary,
    AdminLayoutWidgetCreateInput, AdminLayoutWidgetUpdateInput,
};
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::trace::{ResponseTrace, Traced};
use tauri::State;

pub(super) const LAYOUT_COMPONENT: &str = "g5_admin::commands::layout";

pub(super) fn layout_list_response(
    value: (Vec<AdminLayoutSummary>, Pagination),
    trace: ResponseTrace,
) -> AdminLayoutListResponse {
    let (layouts, pagination) = value;
    AdminLayoutListResponse {
        layouts,
        pagination,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn layout_detail_response(
    layout: AdminLayoutDetail,
    trace: ResponseTrace,
) -> AdminLayoutDetailResponse {
    AdminLayoutDetailResponse {
        layout,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn layout_action_response(
    layout: AdminLayoutDetail,
    trace: ResponseTrace,
) -> AdminLayoutActionResponse {
    AdminLayoutActionResponse {
        layout,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) async fn run_layout_action<TInput, TFuture, TFn, E>(
    state: State<'_, AppState>,
    input: TInput,
    operation: &'static str,
    target: &'static str,
    request: TFn,
) -> CommandResult<AdminLayoutActionResponse>
where
    TInput: Clone + Send + 'static,
    TFuture: std::future::Future<Output = Result<Traced<AdminLayoutDetail>, E>> + Send + 'static,
    TFn: Fn(AppState, String, String, TInput) -> TFuture + Clone + Send + Sync + 'static,
    E: Into<AppError>,
{
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: layout,
        trace,
    } = execute_with_access_token(
        &app_state,
        LAYOUT_COMPONENT,
        operation,
        target,
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            let request = request.clone();
            async move { request(app_state, request_id, access_token, input).await }
        },
    )
    .await?;

    Ok(layout_action_response(layout, trace))
}

pub(super) fn normalize_list_query(mut query: AdminLayoutListQuery) -> AdminLayoutListQuery {
    query.page = query.page.max(1);
    query.per_page = query.per_page.clamp(1, 100);
    query
}

pub(super) fn normalize_save_input(mut input: AdminLayoutSaveInput) -> AdminLayoutSaveInput {
    input.page_id = normalize_page_id(input.page_id);
    input.title = normalize_optional(input.title);
    input.widgets_json = normalize_json_string(input.widgets_json);
    input
}

pub(super) fn normalize_widget_create_input(
    mut input: AdminLayoutWidgetCreateInput,
) -> AdminLayoutWidgetCreateInput {
    input.page_id = normalize_page_id(input.page_id);
    input.widget_json = normalize_json_string(input.widget_json);
    input
}

pub(super) fn normalize_widget_update_input(
    mut input: AdminLayoutWidgetUpdateInput,
) -> AdminLayoutWidgetUpdateInput {
    input.page_id = normalize_page_id(input.page_id);
    input.widget_id = normalize_widget_id(input.widget_id);
    input.r#type = normalize_optional(input.r#type);
    input.title = normalize_optional(input.title);
    input.config_json = normalize_optional(input.config_json);
    input.style_json = normalize_optional(input.style_json);
    input
}

pub(super) fn normalize_reorder_input(
    mut input: AdminLayoutReorderInput,
) -> AdminLayoutReorderInput {
    input.page_id = normalize_page_id(input.page_id);
    input.widget_ids = input
        .widget_ids
        .into_iter()
        .map(normalize_widget_id)
        .filter(|widget_id| !widget_id.is_empty())
        .collect();
    input
}

fn normalize_page_id(value: String) -> String {
    let normalized = value.trim().to_string();
    if normalized.is_empty() {
        "default".to_string()
    } else {
        normalized
    }
}

fn normalize_widget_id(value: String) -> String {
    let normalized = value.trim().to_string();
    if normalized.is_empty() {
        "widget".to_string()
    } else {
        normalized
    }
}

fn normalize_json_string(value: String) -> String {
    let normalized = value.trim();
    if normalized.is_empty() {
        "[]".to_string()
    } else {
        normalized.to_string()
    }
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
