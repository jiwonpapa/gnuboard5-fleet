use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::member::{
    AdminMemberDetail, AdminMemberDetailResponse, AdminMemberListItem, AdminMemberListQuery,
    AdminMemberListResponse, AdminMemberMediaResponse, AdminMemberMediaResult,
    AdminMemberMediaUploadInput, AdminMemberUpdateInput, Pagination,
};
use g5_admin_models::models::trace::ResponseTrace;

pub(super) const MEMBER_COMPONENT: &str = "g5_admin::commands::member";

pub(super) fn normalize_member_list_query(mut query: AdminMemberListQuery) -> AdminMemberListQuery {
    query.page = query.page.max(1);
    query.per_page = query.per_page.clamp(1, 100);
    query.search = query
        .search
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    query.search_field = query
        .search_field
        .map(|value| value.trim().to_string())
        .filter(|value| {
            matches!(
                value.as_str(),
                "all" | "mb_id" | "mb_name" | "mb_nick" | "mb_email"
            )
        });

    query
}

pub(super) fn normalize_member_update_input(
    mut input: AdminMemberUpdateInput,
) -> AdminMemberUpdateInput {
    input.mb_id = input.mb_id.trim().to_string();
    input.mb_name = normalize_option(input.mb_name);
    input.mb_nick = normalize_option(input.mb_nick);
    input.mb_email = normalize_option(input.mb_email);
    input.mb_homepage = normalize_option(input.mb_homepage);
    input.mb_zip = normalize_option(input.mb_zip);
    input.mb_addr1 = normalize_option(input.mb_addr1);
    input.mb_addr2 = normalize_option(input.mb_addr2);
    input.mb_intercept_date = normalize_option(input.mb_intercept_date);

    input
}

pub(super) fn normalize_member_media_upload_input(
    input: AdminMemberMediaUploadInput,
) -> AdminMemberMediaUploadInput {
    AdminMemberMediaUploadInput {
        mb_id: input.mb_id.trim().to_string(),
        file_name: input.file_name.trim().to_string(),
        mime_type: normalize_option(input.mime_type),
        bytes: input.bytes,
    }
}

pub(super) fn build_member_list_response(
    members: Vec<AdminMemberListItem>,
    pagination: Pagination,
    trace: ResponseTrace,
) -> AdminMemberListResponse {
    AdminMemberListResponse {
        members,
        pagination,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn build_member_detail_response(
    member: AdminMemberDetail,
    trace: ResponseTrace,
) -> AdminMemberDetailResponse {
    AdminMemberDetailResponse {
        member,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn build_member_media_response(
    media: AdminMemberMediaResult,
    trace: ResponseTrace,
) -> AdminMemberMediaResponse {
    AdminMemberMediaResponse {
        media,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn build_deleted_message(trace: ResponseTrace) -> CommandMessage {
    CommandMessage {
        message: "deleted".to_string(),
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

fn normalize_option(value: Option<String>) -> Option<String> {
    value
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
}
