mod normalize;
mod responses;

pub(super) const SMS_CONTACT_COMPONENT: &str = "g5_admin::commands::sms_contact";

pub(super) use normalize::{
    normalize_contact_batch_input, normalize_contact_create_input, normalize_contact_delete_input,
    normalize_contact_export_query, normalize_contact_group_create_input,
    normalize_contact_group_delete_input, normalize_contact_group_move_input,
    normalize_contact_group_update_input, normalize_contact_import_input,
    normalize_contact_list_query, normalize_contact_update_input, normalize_positive_i32,
};
pub(super) use responses::{
    contact_batch_response, contact_detail_response, contact_export_response,
    contact_import_response, contact_list_response, deleted_message, group_clear_response,
    group_detail_response, group_list_response, group_move_response,
};
