use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::popup::{
    AdminPopup, AdminPopupCreateInput, AdminPopupDeleteInput, AdminPopupDetailResponse,
    AdminPopupListQuery, AdminPopupListResponse, AdminPopupUpdateInput,
};
use g5_admin_models::models::trace::ResponseTrace;

pub(super) const POPUP_COMPONENT: &str = "g5_admin::commands::popup";

pub(super) fn popup_list_response(
    value: (Vec<AdminPopup>, Pagination),
    trace: ResponseTrace,
) -> AdminPopupListResponse {
    let (popups, pagination) = value;
    AdminPopupListResponse {
        popups,
        pagination,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn popup_detail_response(
    popup: AdminPopup,
    trace: ResponseTrace,
) -> AdminPopupDetailResponse {
    AdminPopupDetailResponse {
        popup,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn popup_delete_response(trace: ResponseTrace) -> CommandMessage {
    CommandMessage {
        message: "deleted".to_string(),
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn normalize_popup_list_query(mut query: AdminPopupListQuery) -> AdminPopupListQuery {
    query.page = query.page.max(1);
    query.per_page = query.per_page.clamp(1, 100);
    query
}

pub(super) fn normalize_popup_create_input(
    mut input: AdminPopupCreateInput,
) -> AdminPopupCreateInput {
    input.nw_division = normalize_optional(input.nw_division);
    input.nw_device = normalize_optional(input.nw_device);
    input.nw_begin_time = normalize_optional(input.nw_begin_time);
    input.nw_end_time = normalize_optional(input.nw_end_time);
    input.nw_subject = input.nw_subject.trim().to_string();
    input.nw_content = input.nw_content.trim().to_string();
    input
}

pub(super) fn normalize_popup_update_input(
    mut input: AdminPopupUpdateInput,
) -> AdminPopupUpdateInput {
    input.nw_division = normalize_optional(input.nw_division);
    input.nw_device = normalize_optional(input.nw_device);
    input.nw_begin_time = normalize_optional(input.nw_begin_time);
    input.nw_end_time = normalize_optional(input.nw_end_time);
    input.nw_subject = normalize_optional(input.nw_subject);
    input.nw_content = normalize_optional(input.nw_content);
    input
}

pub(super) fn normalize_popup_delete_input(input: AdminPopupDeleteInput) -> AdminPopupDeleteInput {
    input
}

fn normalize_optional(value: Option<String>) -> Option<String> {
    value
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
}
