use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::faq::{
    AdminFaqCreateInput, AdminFaqDetailResponse, AdminFaqImage, AdminFaqImageResponse,
    AdminFaqImageUploadInput, AdminFaqItem, AdminFaqListQuery, AdminFaqListResponse,
    AdminFaqMasterCreateInput, AdminFaqMasterDetail, AdminFaqMasterDetailResponse,
    AdminFaqMasterListQuery, AdminFaqMasterListResponse, AdminFaqMasterSummary,
    AdminFaqMasterUpdateInput, AdminFaqUpdateInput,
};
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::trace::ResponseTrace;

pub(super) const FAQ_COMPONENT: &str = "g5_admin::commands::faq";

pub(super) fn faq_master_list_response(
    value: (Vec<AdminFaqMasterSummary>, Pagination),
    trace: ResponseTrace,
) -> AdminFaqMasterListResponse {
    let (masters, pagination) = value;

    AdminFaqMasterListResponse {
        masters,
        pagination,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn faq_master_detail_response(
    master: AdminFaqMasterDetail,
    trace: ResponseTrace,
) -> AdminFaqMasterDetailResponse {
    AdminFaqMasterDetailResponse {
        master,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn faq_list_response(
    value: (Vec<AdminFaqItem>, Pagination),
    trace: ResponseTrace,
) -> AdminFaqListResponse {
    let (faqs, pagination) = value;

    AdminFaqListResponse {
        faqs,
        pagination,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn faq_detail_response(
    faq: AdminFaqItem,
    trace: ResponseTrace,
) -> AdminFaqDetailResponse {
    AdminFaqDetailResponse {
        faq,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn faq_image_response(
    image: AdminFaqImage,
    trace: ResponseTrace,
) -> AdminFaqImageResponse {
    AdminFaqImageResponse {
        image,
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

pub(super) fn normalize_master_list_query(
    mut query: AdminFaqMasterListQuery,
) -> AdminFaqMasterListQuery {
    query.page = query.page.max(1);
    query.per_page = query.per_page.clamp(1, 100);
    query
}

pub(super) fn normalize_master_create_input(
    mut input: AdminFaqMasterCreateInput,
) -> AdminFaqMasterCreateInput {
    input.fm_subject = input.fm_subject.trim().to_string();
    input.fm_head_html = normalize_optional(input.fm_head_html);
    input.fm_tail_html = normalize_optional(input.fm_tail_html);
    input.fm_mobile_head_html = normalize_optional(input.fm_mobile_head_html);
    input.fm_mobile_tail_html = normalize_optional(input.fm_mobile_tail_html);
    input
}

pub(super) fn normalize_master_update_input(
    mut input: AdminFaqMasterUpdateInput,
) -> AdminFaqMasterUpdateInput {
    input.fm_id = normalize_positive_i32(input.fm_id);
    input.fm_subject = normalize_optional(input.fm_subject);
    input.fm_head_html = normalize_optional(input.fm_head_html);
    input.fm_tail_html = normalize_optional(input.fm_tail_html);
    input.fm_mobile_head_html = normalize_optional(input.fm_mobile_head_html);
    input.fm_mobile_tail_html = normalize_optional(input.fm_mobile_tail_html);
    input
}

pub(super) fn normalize_image_upload_input(
    mut input: AdminFaqImageUploadInput,
) -> AdminFaqImageUploadInput {
    input.fm_id = normalize_positive_i32(input.fm_id);
    input.file_name = input.file_name.trim().to_string();
    input.mime_type = normalize_optional(input.mime_type);
    input
}

pub(super) fn normalize_faq_list_query(mut query: AdminFaqListQuery) -> AdminFaqListQuery {
    query.page = query.page.max(1);
    query.per_page = query.per_page.clamp(1, 100);
    query.fm_id = query.fm_id.map(normalize_positive_i32);
    query
}

pub(super) fn normalize_faq_create_input(mut input: AdminFaqCreateInput) -> AdminFaqCreateInput {
    input.fm_id = normalize_positive_i32(input.fm_id);
    input.fa_subject = input.fa_subject.trim().to_string();
    input.fa_content = input.fa_content.trim().to_string();
    input
}

pub(super) fn normalize_faq_update_input(mut input: AdminFaqUpdateInput) -> AdminFaqUpdateInput {
    input.fa_id = normalize_positive_i32(input.fa_id);
    input.fm_id = input.fm_id.map(normalize_positive_i32);
    input.fa_subject = normalize_optional(input.fa_subject);
    input.fa_content = normalize_optional(input.fa_content);
    input
}

pub(super) fn normalize_positive_i32(value: i32) -> i32 {
    value.max(1)
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
