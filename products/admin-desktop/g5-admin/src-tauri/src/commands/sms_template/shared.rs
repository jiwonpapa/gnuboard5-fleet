use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::sms_template::{
    AdminSmsTemplateBatchInput, AdminSmsTemplateBatchResponse, AdminSmsTemplateBatchResult,
    AdminSmsTemplateCreateInput, AdminSmsTemplateDetailResponse, AdminSmsTemplateGroup,
    AdminSmsTemplateGroupClearResponse, AdminSmsTemplateGroupClearResult,
    AdminSmsTemplateGroupCreateInput, AdminSmsTemplateGroupDetailResponse,
    AdminSmsTemplateGroupListResponse, AdminSmsTemplateGroupMoveInput,
    AdminSmsTemplateGroupMoveResponse, AdminSmsTemplateGroupMoveResult,
    AdminSmsTemplateGroupUpdateInput, AdminSmsTemplateItem, AdminSmsTemplateListQuery,
    AdminSmsTemplateListResponse, AdminSmsTemplateUpdateInput,
};
use g5_admin_models::models::trace::ResponseTrace;

pub(super) const SMS_TEMPLATE_COMPONENT: &str = "g5_admin::commands::sms_template";

pub(super) fn group_list_response(
    groups: Vec<AdminSmsTemplateGroup>,
    trace: ResponseTrace,
) -> AdminSmsTemplateGroupListResponse {
    AdminSmsTemplateGroupListResponse {
        total: groups.len() as i32,
        groups,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn group_detail_response(
    group: AdminSmsTemplateGroup,
    trace: ResponseTrace,
) -> AdminSmsTemplateGroupDetailResponse {
    AdminSmsTemplateGroupDetailResponse {
        group,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn group_move_response(
    result: AdminSmsTemplateGroupMoveResult,
    trace: ResponseTrace,
) -> AdminSmsTemplateGroupMoveResponse {
    AdminSmsTemplateGroupMoveResponse {
        result,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn group_clear_response(
    result: AdminSmsTemplateGroupClearResult,
    trace: ResponseTrace,
) -> AdminSmsTemplateGroupClearResponse {
    AdminSmsTemplateGroupClearResponse {
        result,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn template_list_response(
    value: (Vec<AdminSmsTemplateItem>, Pagination),
    trace: ResponseTrace,
) -> AdminSmsTemplateListResponse {
    let (templates, pagination) = value;

    AdminSmsTemplateListResponse {
        templates,
        pagination,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn template_detail_response(
    template: AdminSmsTemplateItem,
    trace: ResponseTrace,
) -> AdminSmsTemplateDetailResponse {
    AdminSmsTemplateDetailResponse {
        template,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn template_batch_response(
    result: AdminSmsTemplateBatchResult,
    trace: ResponseTrace,
) -> AdminSmsTemplateBatchResponse {
    AdminSmsTemplateBatchResponse {
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

pub(super) fn normalize_template_list_query(
    mut query: AdminSmsTemplateListQuery,
) -> AdminSmsTemplateListQuery {
    query.page = query.page.max(1);
    query.per_page = query.per_page.clamp(1, 100);
    query.fg_no = query.fg_no.map(normalize_non_negative_i32);
    query.search = query.search.and_then(normalize_optional);
    query.search_field = query.search_field.and_then(|value| {
        let normalized = value.trim().to_string();
        match normalized.as_str() {
            "all" | "name" | "content" => Some(normalized),
            _ => None,
        }
    });

    query
}

pub(super) fn normalize_template_group_create_input(
    mut input: AdminSmsTemplateGroupCreateInput,
) -> AdminSmsTemplateGroupCreateInput {
    input.fg_name = input.fg_name.trim().to_string();
    input.fg_member = i32::from(input.fg_member > 0);
    input
}

pub(super) fn normalize_template_group_update_input(
    mut input: AdminSmsTemplateGroupUpdateInput,
) -> AdminSmsTemplateGroupUpdateInput {
    input.fg_no = normalize_positive_i32(input.fg_no);
    input.fg_name = input.fg_name.and_then(normalize_optional);
    input.fg_member = input.fg_member.map(|value| i32::from(value > 0));
    input
}

pub(super) fn normalize_template_group_move_input(
    mut input: AdminSmsTemplateGroupMoveInput,
) -> AdminSmsTemplateGroupMoveInput {
    input.fg_no = normalize_non_negative_i32(input.fg_no);
    input.target_fg_no = normalize_non_negative_i32(input.target_fg_no);
    input
}

pub(super) fn normalize_template_create_input(
    mut input: AdminSmsTemplateCreateInput,
) -> AdminSmsTemplateCreateInput {
    input.fg_no = normalize_non_negative_i32(input.fg_no);
    input.fo_name = input.fo_name.trim().to_string();
    input.fo_content = input.fo_content.trim().to_string();
    input
}

pub(super) fn normalize_template_update_input(
    mut input: AdminSmsTemplateUpdateInput,
) -> AdminSmsTemplateUpdateInput {
    input.fo_no = normalize_positive_i32(input.fo_no);
    input.fg_no = input.fg_no.map(normalize_non_negative_i32);
    input.fo_name = input.fo_name.and_then(normalize_optional);
    input.fo_content = input.fo_content.and_then(normalize_optional);
    input
}

pub(super) fn normalize_template_batch_input(
    mut input: AdminSmsTemplateBatchInput,
) -> AdminSmsTemplateBatchInput {
    input.action = input.action.trim().to_string();
    input.template_ids = normalize_positive_vec(input.template_ids);
    input.target_fg_no = input.target_fg_no.map(normalize_non_negative_i32);
    input
}

fn normalize_positive_i32(value: i32) -> i32 {
    value.max(1)
}

fn normalize_non_negative_i32(value: i32) -> i32 {
    value.max(0)
}

fn normalize_positive_vec(values: Vec<i32>) -> Vec<i32> {
    let mut normalized = values
        .into_iter()
        .filter(|value| *value > 0)
        .collect::<Vec<_>>();
    normalized.sort_unstable();
    normalized.dedup();
    normalized
}

fn normalize_optional(value: String) -> Option<String> {
    let normalized = value.trim().to_string();
    if normalized.is_empty() {
        None
    } else {
        Some(normalized)
    }
}
