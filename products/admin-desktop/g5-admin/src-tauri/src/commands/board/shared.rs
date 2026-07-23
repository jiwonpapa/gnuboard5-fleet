use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::board::{
    AdminBoard, AdminBoardCopyInput, AdminBoardCreateInput, AdminBoardDetailResponse,
    AdminBoardListQuery, AdminBoardListResponse, AdminBoardNewPostDeleteInput,
    AdminBoardNewPostDeleteResponse, AdminBoardNewPostDeleteResult, AdminBoardUpdateInput,
};
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::trace::ResponseTrace;

pub(super) const BOARD_COMPONENT: &str = "g5_admin::commands::board";

pub(super) fn board_list_response(
    value: (Vec<AdminBoard>, Pagination),
    trace: ResponseTrace,
) -> AdminBoardListResponse {
    let (boards, pagination) = value;
    AdminBoardListResponse {
        boards,
        pagination,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn board_detail_response(
    board: AdminBoard,
    trace: ResponseTrace,
) -> AdminBoardDetailResponse {
    AdminBoardDetailResponse {
        board,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn board_delete_response(trace: ResponseTrace) -> CommandMessage {
    CommandMessage {
        message: "deleted".to_string(),
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn board_new_post_delete_response(
    result: AdminBoardNewPostDeleteResult,
    trace: ResponseTrace,
) -> AdminBoardNewPostDeleteResponse {
    AdminBoardNewPostDeleteResponse {
        result,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn normalize_board_list_query(mut query: AdminBoardListQuery) -> AdminBoardListQuery {
    query.page = query.page.max(1);
    query.per_page = query.per_page.clamp(1, 100);
    query.gr_id = normalize_option(query.gr_id);
    query.search = normalize_option(query.search);
    query
}

pub(super) fn normalize_board_create_input(
    mut input: AdminBoardCreateInput,
) -> AdminBoardCreateInput {
    input.bo_table = normalize_board_table(input.bo_table);
    input.bo_subject = input.bo_subject.trim().to_string();
    input.gr_id = input.gr_id.trim().to_string();
    input.bo_category_list = normalize_option(input.bo_category_list);
    input
}

pub(super) fn normalize_board_update_input(
    mut input: AdminBoardUpdateInput,
) -> AdminBoardUpdateInput {
    input.bo_table = normalize_board_table(input.bo_table);
    input.bo_subject = normalize_option(input.bo_subject);
    input.gr_id = normalize_option(input.gr_id);
    input.bo_category_list = normalize_option(input.bo_category_list);
    input
}

pub(super) fn normalize_board_copy_input(mut input: AdminBoardCopyInput) -> AdminBoardCopyInput {
    input.bo_table = normalize_board_table(input.bo_table);
    input.target_bo_table = normalize_board_table(input.target_bo_table);
    input.target_bo_subject = normalize_option(input.target_bo_subject);
    input
}

pub(super) fn normalize_board_new_post_delete_input(
    mut input: AdminBoardNewPostDeleteInput,
) -> AdminBoardNewPostDeleteInput {
    input.bn_ids.retain(|bn_id| *bn_id > 0);
    input
}

pub(super) fn normalize_board_table(value: String) -> String {
    value.trim().to_lowercase()
}

fn normalize_option(value: Option<String>) -> Option<String> {
    value
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
}
