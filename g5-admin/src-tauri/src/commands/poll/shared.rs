use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::poll::{
    AdminPoll, AdminPollCreateInput, AdminPollDeleteInput, AdminPollDetailResponse,
    AdminPollListQuery, AdminPollListResponse, AdminPollUpdateInput,
};
use g5_admin_models::models::trace::ResponseTrace;

pub(super) const POLL_COMPONENT: &str = "g5_admin::commands::poll";

pub(super) fn poll_list_response(
    value: (Vec<AdminPoll>, Pagination),
    trace: ResponseTrace,
) -> AdminPollListResponse {
    let (polls, pagination) = value;
    AdminPollListResponse {
        polls,
        pagination,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn poll_detail_response(
    poll: AdminPoll,
    trace: ResponseTrace,
) -> AdminPollDetailResponse {
    AdminPollDetailResponse {
        poll,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn poll_delete_response(trace: ResponseTrace) -> CommandMessage {
    CommandMessage {
        message: "deleted".to_string(),
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn normalize_poll_list_query(mut query: AdminPollListQuery) -> AdminPollListQuery {
    query.page = query.page.max(1);
    query.per_page = query.per_page.clamp(1, 100);
    query
}

pub(super) fn normalize_poll_create_input(mut input: AdminPollCreateInput) -> AdminPollCreateInput {
    input.po_subject = input.po_subject.trim().to_string();
    input.po_poll1 = input.po_poll1.trim().to_string();
    input.po_poll2 = input.po_poll2.trim().to_string();
    normalize_poll_optional(&mut input.po_poll3);
    normalize_poll_optional(&mut input.po_poll4);
    normalize_poll_optional(&mut input.po_poll5);
    normalize_poll_optional(&mut input.po_poll6);
    normalize_poll_optional(&mut input.po_poll7);
    normalize_poll_optional(&mut input.po_poll8);
    normalize_poll_optional(&mut input.po_poll9);
    normalize_poll_optional(&mut input.po_etc);
    input
}

pub(super) fn normalize_poll_update_input(mut input: AdminPollUpdateInput) -> AdminPollUpdateInput {
    normalize_poll_optional(&mut input.po_subject);
    normalize_poll_optional(&mut input.po_poll1);
    normalize_poll_optional(&mut input.po_poll2);
    normalize_poll_optional(&mut input.po_poll3);
    normalize_poll_optional(&mut input.po_poll4);
    normalize_poll_optional(&mut input.po_poll5);
    normalize_poll_optional(&mut input.po_poll6);
    normalize_poll_optional(&mut input.po_poll7);
    normalize_poll_optional(&mut input.po_poll8);
    normalize_poll_optional(&mut input.po_poll9);
    normalize_poll_optional(&mut input.po_etc);
    input
}

pub(super) fn normalize_poll_delete_input(input: AdminPollDeleteInput) -> AdminPollDeleteInput {
    input
}

fn normalize_poll_optional(value: &mut Option<String>) {
    *value = value
        .take()
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty());
}
