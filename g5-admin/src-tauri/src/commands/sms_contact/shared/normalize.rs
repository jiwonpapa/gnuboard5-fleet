use g5_admin_models::models::sms_contact::{
    AdminSmsContactBatchInput, AdminSmsContactCreateInput, AdminSmsContactDeleteInput,
    AdminSmsContactExportQuery, AdminSmsContactGroupCreateInput, AdminSmsContactGroupDeleteInput,
    AdminSmsContactGroupMoveInput, AdminSmsContactGroupUpdateInput, AdminSmsContactImportInput,
    AdminSmsContactListQuery, AdminSmsContactUpdateInput,
};

pub(in crate::commands::sms_contact) fn normalize_contact_group_create_input(
    mut input: AdminSmsContactGroupCreateInput,
) -> AdminSmsContactGroupCreateInput {
    input.bg_name = input.bg_name.trim().to_string();
    input
}

pub(in crate::commands::sms_contact) fn normalize_contact_group_update_input(
    mut input: AdminSmsContactGroupUpdateInput,
) -> AdminSmsContactGroupUpdateInput {
    input.bg_no = normalize_positive_i32(input.bg_no);
    input.bg_name = input.bg_name.trim().to_string();
    input
}

pub(in crate::commands::sms_contact) fn normalize_contact_group_delete_input(
    input: AdminSmsContactGroupDeleteInput,
) -> AdminSmsContactGroupDeleteInput {
    AdminSmsContactGroupDeleteInput {
        bg_no: normalize_positive_i32(input.bg_no),
    }
}

pub(in crate::commands::sms_contact) fn normalize_contact_group_move_input(
    mut input: AdminSmsContactGroupMoveInput,
) -> AdminSmsContactGroupMoveInput {
    input.bg_no = normalize_positive_i32(input.bg_no);
    input.target_bg_no = normalize_positive_i32(input.target_bg_no);
    input
}

pub(in crate::commands::sms_contact) fn normalize_contact_list_query(
    mut query: AdminSmsContactListQuery,
) -> AdminSmsContactListQuery {
    query.page = query.page.max(1);
    query.per_page = query.per_page.clamp(1, 100);
    query.bg_no = query.bg_no.map(normalize_positive_i32);
    query.search = query.search.and_then(normalize_optional);
    query.search_field = query.search_field.and_then(|value| {
        let normalized = value.trim().to_string();
        match normalized.as_str() {
            "all" | "name" | "hp" => Some(normalized),
            _ => None,
        }
    });
    query
}

pub(in crate::commands::sms_contact) fn normalize_contact_create_input(
    mut input: AdminSmsContactCreateInput,
) -> AdminSmsContactCreateInput {
    input.bg_no = normalize_positive_i32(input.bg_no);
    input.mb_id = input.mb_id.and_then(normalize_optional);
    input.bk_name = input.bk_name.trim().to_string();
    input.bk_hp = normalize_phone_digits(&input.bk_hp);
    input.bk_receipt = i32::from(input.bk_receipt > 0);
    input.bk_memo = input.bk_memo.and_then(normalize_optional);
    input
}

pub(in crate::commands::sms_contact) fn normalize_contact_update_input(
    mut input: AdminSmsContactUpdateInput,
) -> AdminSmsContactUpdateInput {
    input.bk_no = normalize_positive_i32(input.bk_no);
    input.bg_no = input.bg_no.map(normalize_positive_i32);
    input.bk_name = input.bk_name.and_then(normalize_optional);
    input.bk_hp = input.bk_hp.map(|value| normalize_phone_digits(&value));
    input.bk_receipt = input.bk_receipt.map(|value| i32::from(value > 0));
    input.bk_memo = input.bk_memo.and_then(normalize_optional);
    input
}

pub(in crate::commands::sms_contact) fn normalize_contact_delete_input(
    input: AdminSmsContactDeleteInput,
) -> AdminSmsContactDeleteInput {
    AdminSmsContactDeleteInput {
        bk_no: normalize_positive_i32(input.bk_no),
    }
}

pub(in crate::commands::sms_contact) fn normalize_contact_batch_input(
    mut input: AdminSmsContactBatchInput,
) -> AdminSmsContactBatchInput {
    input.action = input.action.trim().to_string();
    input.contact_ids = normalize_positive_vec(input.contact_ids);
    input.target_bg_no = input.target_bg_no.map(normalize_positive_i32);
    input
}

pub(in crate::commands::sms_contact) fn normalize_contact_import_input(
    mut input: AdminSmsContactImportInput,
) -> AdminSmsContactImportInput {
    input.bg_no = normalize_positive_i32(input.bg_no);
    input.file_name = input.file_name.and_then(normalize_optional);
    input.mime_type = input.mime_type.and_then(normalize_optional);
    input.contacts = input.contacts.map(|contacts| {
        contacts
            .into_iter()
            .map(|mut contact| {
                contact.name = contact.name.trim().to_string();
                contact.phone = normalize_phone_digits(&contact.phone);
                contact
            })
            .filter(|contact| !contact.name.is_empty() && !contact.phone.is_empty())
            .collect()
    });
    input
}

pub(in crate::commands::sms_contact) fn normalize_contact_export_query(
    mut query: AdminSmsContactExportQuery,
) -> AdminSmsContactExportQuery {
    query.bg_no = query.bg_no.map(normalize_positive_i32);
    query
}

pub(in crate::commands::sms_contact) fn normalize_positive_i32(value: i32) -> i32 {
    value.max(1)
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

fn normalize_phone_digits(value: &str) -> String {
    value.chars().filter(|char| char.is_ascii_digit()).collect()
}
