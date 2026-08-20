use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminQaConfig {
    pub qa_id: i64,
    pub qa_title: String,
    pub qa_category: String,
    pub qa_skin: String,
    pub qa_mobile_skin: String,
    pub qa_use_email: String,
    pub qa_req_email: String,
    pub qa_use_hp: String,
    pub qa_req_hp: String,
    pub qa_use_sms: String,
    pub qa_send_number: String,
    pub qa_admin_hp: String,
    pub qa_admin_email: String,
    pub qa_use_editor: String,
    pub qa_subject_len: String,
    pub qa_mobile_subject_len: String,
    pub qa_page_rows: String,
    pub qa_mobile_page_rows: String,
    pub qa_image_width: String,
    pub qa_upload_size: String,
    pub qa_insert_content: String,
    pub qa_include_head: String,
    pub qa_include_tail: String,
    pub qa_content_head: String,
    pub qa_content_tail: String,
    pub qa_mobile_content_head: String,
    pub qa_mobile_content_tail: String,
    pub qa_1_subj: String,
    pub qa_2_subj: String,
    pub qa_3_subj: String,
    pub qa_4_subj: String,
    pub qa_5_subj: String,
    pub qa_1: String,
    pub qa_2: String,
    pub qa_3: String,
    pub qa_4: String,
    pub qa_5: String,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminQaConfigUpdate {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_title: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_category: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_skin: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_mobile_skin: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_use_email: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_req_email: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_use_hp: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_req_hp: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_use_sms: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_send_number: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_admin_hp: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_admin_email: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_use_editor: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_subject_len: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_mobile_subject_len: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_page_rows: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_mobile_page_rows: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_image_width: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_upload_size: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_insert_content: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_include_head: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_include_tail: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_content_head: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_content_tail: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_mobile_content_head: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_mobile_content_tail: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_1_subj: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_2_subj: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_3_subj: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_4_subj: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_5_subj: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_1: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_2: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_3: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_4: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qa_5: Option<String>,
}

impl AdminQaConfigUpdate {
    pub fn is_valid(&self) -> bool {
        serde_json::to_value(self).is_ok_and(|value| {
            value.as_object().is_some_and(|fields| {
                !fields.is_empty()
                    && fields
                        .values()
                        .all(|field| field.as_str().is_some_and(|text| text.len() <= 65_535))
            })
        })
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminQaBulkDelete {
    pub qa_ids: Vec<i64>,
}

impl AdminQaBulkDelete {
    pub fn is_valid(&self) -> bool {
        !self.qa_ids.is_empty()
            && self.qa_ids.iter().all(|qa_id| *qa_id > 0)
            && self.qa_ids.iter().collect::<BTreeSet<_>>().len() == self.qa_ids.len()
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminQaBulkDeleteResult {
    pub deleted_count: i64,
    pub qa_ids: Vec<i64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn qa_config_update_requires_at_least_one_bounded_field() {
        assert!(!AdminQaConfigUpdate::default().is_valid());
        assert!(
            AdminQaConfigUpdate {
                qa_title: Some("1:1 문의".into()),
                qa_1_subj: Some("추가 필드".into()),
                ..Default::default()
            }
            .is_valid()
        );
        assert!(
            !AdminQaConfigUpdate {
                qa_insert_content: Some("x".repeat(65_536)),
                ..Default::default()
            }
            .is_valid()
        );
    }

    #[test]
    fn qa_bulk_delete_rejects_empty_invalid_and_duplicate_ids() {
        assert!(!AdminQaBulkDelete::default().is_valid());
        assert!(!AdminQaBulkDelete { qa_ids: vec![0] }.is_valid());
        assert!(!AdminQaBulkDelete { qa_ids: vec![2, 2] }.is_valid());
        assert!(AdminQaBulkDelete { qa_ids: vec![2, 3] }.is_valid());
    }
}
