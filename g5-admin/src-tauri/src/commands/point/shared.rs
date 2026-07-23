use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::point::{
    AdminPointActionInput, AdminPointActionResponse, AdminPointActionResult, AdminPointDeleteInput,
    AdminPointDeleteResponse, AdminPointDeleteResult, AdminPointExpireInput,
    AdminPointExpireResponse, AdminPointExpireResult, AdminPointItem, AdminPointListQuery,
    AdminPointListResponse, AdminPointSummary, AdminPointSummaryResponse,
};
use g5_admin_models::models::trace::ResponseTrace;

pub(super) const POINT_COMPONENT: &str = "g5_admin::commands::point";

pub(super) fn point_list_response(
    value: (Vec<AdminPointItem>, Pagination),
    trace: ResponseTrace,
) -> AdminPointListResponse {
    let (points, pagination) = value;
    AdminPointListResponse {
        points,
        pagination,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn point_summary_response(
    summary: AdminPointSummary,
    trace: ResponseTrace,
) -> AdminPointSummaryResponse {
    AdminPointSummaryResponse {
        summary,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn point_action_response(
    result: AdminPointActionResult,
    trace: ResponseTrace,
) -> AdminPointActionResponse {
    AdminPointActionResponse {
        result,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn point_delete_response(
    result: AdminPointDeleteResult,
    trace: ResponseTrace,
) -> AdminPointDeleteResponse {
    AdminPointDeleteResponse {
        result,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn point_expire_response(
    result: AdminPointExpireResult,
    trace: ResponseTrace,
) -> AdminPointExpireResponse {
    AdminPointExpireResponse {
        result,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn normalize_point_list_query(mut query: AdminPointListQuery) -> AdminPointListQuery {
    query.page = query.page.max(1);
    query.per_page = query.per_page.clamp(1, 100);
    query.mb_id = normalize_optional(query.mb_id);
    query.search = normalize_optional(query.search);
    query.search_field = query.search_field.and_then(|value| {
        let normalized = value.trim().to_string();
        match normalized.as_str() {
            "mb_id" | "po_content" => Some(normalized),
            _ => None,
        }
    });
    query
}

pub(super) fn normalize_point_action_input(
    mut input: AdminPointActionInput,
) -> AdminPointActionInput {
    input.mb_id = input.mb_id.trim().to_string();
    input.po_content = normalize_optional(input.po_content);
    input
}

pub(super) fn normalize_point_delete_input(
    mut input: AdminPointDeleteInput,
) -> AdminPointDeleteInput {
    input.po_ids.retain(|po_id| *po_id > 0);
    input
}

pub(super) fn normalize_point_expire_input(
    mut input: AdminPointExpireInput,
) -> AdminPointExpireInput {
    input.base_date = normalize_optional(input.base_date);
    input
}

fn normalize_optional(value: Option<String>) -> Option<String> {
    value
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
}
