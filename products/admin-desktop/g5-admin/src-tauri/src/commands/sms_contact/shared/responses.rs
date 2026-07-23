use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::sms_contact::{
    AdminSmsContactBatchResponse, AdminSmsContactBatchResult, AdminSmsContactDetailResponse,
    AdminSmsContactExportItem, AdminSmsContactExportResponse, AdminSmsContactGroup,
    AdminSmsContactGroupClearResponse, AdminSmsContactGroupClearResult,
    AdminSmsContactGroupDetailResponse, AdminSmsContactGroupListResponse,
    AdminSmsContactGroupMoveResponse, AdminSmsContactGroupMoveResult,
    AdminSmsContactImportResponse, AdminSmsContactImportResult, AdminSmsContactItem,
    AdminSmsContactListResponse, AdminSmsContactSummary,
};
use g5_admin_models::models::trace::ResponseTrace;

pub(in crate::commands::sms_contact) fn group_list_response(
    groups: Vec<AdminSmsContactGroup>,
    trace: ResponseTrace,
) -> AdminSmsContactGroupListResponse {
    AdminSmsContactGroupListResponse {
        total: groups.len() as i32,
        groups,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(in crate::commands::sms_contact) fn group_detail_response(
    group: AdminSmsContactGroup,
    trace: ResponseTrace,
) -> AdminSmsContactGroupDetailResponse {
    AdminSmsContactGroupDetailResponse {
        group,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(in crate::commands::sms_contact) fn group_move_response(
    result: AdminSmsContactGroupMoveResult,
    trace: ResponseTrace,
) -> AdminSmsContactGroupMoveResponse {
    AdminSmsContactGroupMoveResponse {
        result,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(in crate::commands::sms_contact) fn group_clear_response(
    result: AdminSmsContactGroupClearResult,
    trace: ResponseTrace,
) -> AdminSmsContactGroupClearResponse {
    AdminSmsContactGroupClearResponse {
        result,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(in crate::commands::sms_contact) fn contact_list_response(
    value: (Vec<AdminSmsContactItem>, Pagination, AdminSmsContactSummary),
    trace: ResponseTrace,
) -> AdminSmsContactListResponse {
    let (contacts, pagination, summary) = value;

    AdminSmsContactListResponse {
        contacts,
        pagination,
        summary,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(in crate::commands::sms_contact) fn contact_detail_response(
    contact: AdminSmsContactItem,
    trace: ResponseTrace,
) -> AdminSmsContactDetailResponse {
    AdminSmsContactDetailResponse {
        contact,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(in crate::commands::sms_contact) fn contact_batch_response(
    result: AdminSmsContactBatchResult,
    trace: ResponseTrace,
) -> AdminSmsContactBatchResponse {
    AdminSmsContactBatchResponse {
        result,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(in crate::commands::sms_contact) fn contact_import_response(
    result: AdminSmsContactImportResult,
    trace: ResponseTrace,
) -> AdminSmsContactImportResponse {
    AdminSmsContactImportResponse {
        result,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(in crate::commands::sms_contact) fn contact_export_response(
    value: (Vec<AdminSmsContactExportItem>, i32, Option<i32>, bool, bool),
    trace: ResponseTrace,
) -> AdminSmsContactExportResponse {
    let (items, total, bg_no, include_no_phone, with_hyphen) = value;

    AdminSmsContactExportResponse {
        items,
        total,
        bg_no,
        include_no_phone,
        with_hyphen,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}

pub(in crate::commands::sms_contact) fn deleted_message(trace: ResponseTrace) -> CommandMessage {
    CommandMessage {
        message: "deleted".to_string(),
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    }
}
