use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::board_group::{
    AdminBoardGroup, AdminBoardGroupCreateInput, AdminBoardGroupDeleteInput,
    AdminBoardGroupDetailResponse, AdminBoardGroupListResponse, AdminBoardGroupMember,
    AdminBoardGroupMemberAddInput, AdminBoardGroupMemberDeleteInput,
    AdminBoardGroupMemberListQuery, AdminBoardGroupMemberListResponse,
    AdminBoardGroupMemberResponse, AdminBoardGroupMemberResult, AdminBoardGroupUpdateInput,
};
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::trace::ResponseTrace;

pub(super) const BOARD_GROUP_COMPONENT: &str = "g5_admin::commands::board_group";

pub(super) fn board_group_list_response(
    value: (Vec<AdminBoardGroup>, Pagination),
    trace: ResponseTrace,
) -> AdminBoardGroupListResponse {
    let (groups, pagination) = value;

    AdminBoardGroupListResponse {
        groups,
        pagination,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn board_group_detail_response(
    group: AdminBoardGroup,
    trace: ResponseTrace,
) -> AdminBoardGroupDetailResponse {
    AdminBoardGroupDetailResponse {
        group,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn board_group_member_list_response(
    value: (Vec<AdminBoardGroupMember>, Pagination),
    trace: ResponseTrace,
) -> AdminBoardGroupMemberListResponse {
    let (members, pagination) = value;

    AdminBoardGroupMemberListResponse {
        members,
        pagination,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn board_group_member_response(
    result: AdminBoardGroupMemberResult,
    trace: ResponseTrace,
) -> AdminBoardGroupMemberResponse {
    AdminBoardGroupMemberResponse {
        result,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn deleted_message(trace: ResponseTrace) -> CommandMessage {
    CommandMessage {
        message: "deleted".to_string(),
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn normalize_group_id(value: String) -> String {
    value.trim().to_string()
}

pub(super) fn normalize_group_create_input(
    mut input: AdminBoardGroupCreateInput,
) -> AdminBoardGroupCreateInput {
    input.gr_id = normalize_group_id(input.gr_id);
    input.gr_subject = input.gr_subject.trim().to_string();

    input
}

pub(super) fn normalize_group_update_input(
    mut input: AdminBoardGroupUpdateInput,
) -> AdminBoardGroupUpdateInput {
    input.gr_id = normalize_group_id(input.gr_id);
    input.gr_subject = input.gr_subject.trim().to_string();

    input
}

pub(super) fn normalize_group_delete_input(
    input: AdminBoardGroupDeleteInput,
) -> AdminBoardGroupDeleteInput {
    AdminBoardGroupDeleteInput {
        gr_id: normalize_group_id(input.gr_id),
    }
}

pub(super) fn normalize_group_member_list_query(
    mut query: AdminBoardGroupMemberListQuery,
) -> AdminBoardGroupMemberListQuery {
    query.gr_id = normalize_group_id(query.gr_id);
    query.page = query.page.max(1);
    query.per_page = query.per_page.clamp(1, 200);
    query.search = normalize_optional(query.search);

    query
}

pub(super) fn normalize_group_member_add_input(
    mut input: AdminBoardGroupMemberAddInput,
) -> AdminBoardGroupMemberAddInput {
    input.gr_id = normalize_group_id(input.gr_id);
    input.mb_id = input.mb_id.trim().to_string();

    input
}

pub(super) fn normalize_group_member_delete_input(
    mut input: AdminBoardGroupMemberDeleteInput,
) -> AdminBoardGroupMemberDeleteInput {
    input.gr_id = normalize_group_id(input.gr_id);
    input.mb_id = input.mb_id.trim().to_string();

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
