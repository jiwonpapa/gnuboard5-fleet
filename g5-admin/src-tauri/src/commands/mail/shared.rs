use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::mail::{
    AdminMailDetail, AdminMailDetailResponse, AdminMailListQuery, AdminMailListResponse,
    AdminMailRecipient, AdminMailRecipientListResponse, AdminMailRecipientQuery,
    AdminMailSendInput, AdminMailSendResponse, AdminMailSendResult, AdminMailTemplate,
    AdminMailTemplateCreateInput, AdminMailTemplateUpdateInput,
};
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::trace::ResponseTrace;

pub(super) const MAIL_COMPONENT: &str = "g5_admin::commands::mail";

pub(super) fn mail_list_response(
    value: (Vec<AdminMailTemplate>, Pagination),
    trace: ResponseTrace,
) -> AdminMailListResponse {
    let (mails, pagination) = value;
    AdminMailListResponse {
        mails,
        pagination,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn mail_detail_response(
    mail: AdminMailDetail,
    trace: ResponseTrace,
) -> AdminMailDetailResponse {
    AdminMailDetailResponse {
        mail,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn mail_recipients_response(
    value: (Vec<AdminMailRecipient>, Pagination),
    trace: ResponseTrace,
) -> AdminMailRecipientListResponse {
    let (recipients, pagination) = value;
    AdminMailRecipientListResponse {
        recipients,
        pagination,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn mail_send_response(
    result: AdminMailSendResult,
    trace: ResponseTrace,
) -> AdminMailSendResponse {
    AdminMailSendResponse {
        result,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn mail_delete_response(trace: ResponseTrace) -> CommandMessage {
    CommandMessage {
        message: "deleted".to_string(),
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(super) fn normalize_mail_list_query(mut query: AdminMailListQuery) -> AdminMailListQuery {
    query.page = query.page.max(1);
    query.per_page = query.per_page.clamp(1, 100);
    query
}

pub(super) fn normalize_mail_template_create_input(
    mut input: AdminMailTemplateCreateInput,
) -> AdminMailTemplateCreateInput {
    input.ma_subject = input.ma_subject.trim().to_string();
    input.ma_content = input.ma_content.trim().to_string();
    input
}

pub(super) fn normalize_mail_template_update_input(
    mut input: AdminMailTemplateUpdateInput,
) -> AdminMailTemplateUpdateInput {
    input.ma_subject = input.ma_subject.trim().to_string();
    input.ma_content = input.ma_content.trim().to_string();
    input
}

pub(super) fn normalize_mail_recipient_query(
    mut query: AdminMailRecipientQuery,
) -> AdminMailRecipientQuery {
    query.page = query.page.max(1);
    query.per_page = query.per_page.clamp(1, 1000);
    query.search = normalize_optional(query.search);
    query.gr_id = normalize_optional(query.gr_id);
    query.member_id_from = normalize_optional(query.member_id_from);
    query.member_id_to = normalize_optional(query.member_id_to);
    query.email_contains = normalize_optional(query.email_contains);
    query
}

pub(super) fn normalize_mail_send_input(mut input: AdminMailSendInput) -> AdminMailSendInput {
    input.subject = normalize_optional(input.subject);
    input.content = normalize_optional(input.content);
    input.target_type = match input.target_type.trim().to_lowercase().as_str() {
        "level" => "level".to_string(),
        "group" => "group".to_string(),
        "member" => "member".to_string(),
        _ => "all".to_string(),
    };
    input.gr_id = normalize_optional(input.gr_id);
    input.member_id_from = normalize_optional(input.member_id_from);
    input.member_id_to = normalize_optional(input.member_id_to);
    input.email_contains = normalize_optional(input.email_contains);
    input.mb_ids = input
        .mb_ids
        .into_iter()
        .map(|member_id| member_id.trim().to_string())
        .filter(|member_id| !member_id.is_empty())
        .collect();
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
