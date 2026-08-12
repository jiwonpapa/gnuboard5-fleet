use serde::{Deserialize, Serialize};

use crate::permissions::{Pagination, valid_member_id};

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMemberListQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub search: Option<String>,
    pub search_field: Option<String>,
    pub sort_by: Option<String>,
    pub sort_direction: Option<String>,
}

impl AdminMemberListQuery {
    pub fn is_valid(&self) -> bool {
        let search_field_valid = self.search_field.as_deref().is_none_or(|value| {
            matches!(value, "all" | "mb_id" | "mb_name" | "mb_nick" | "mb_email")
        });
        let sort_by_valid = self
            .sort_by
            .as_deref()
            .is_none_or(|value| matches!(value, "mb_id" | "mb_level" | "mb_point" | "mb_datetime"));
        let direction_valid = self
            .sort_direction
            .as_deref()
            .is_none_or(|value| matches!(value, "ASC" | "DESC"));
        self.page.is_none_or(|value| value > 0)
            && self.per_page.is_none_or(|value| (1..=100).contains(&value))
            && self
                .search
                .as_deref()
                .is_none_or(|value| value.len() <= 200)
            && search_field_valid
            && sort_by_valid
            && direction_valid
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMember {
    pub mb_id: String,
    pub mb_no: Option<i64>,
    pub mb_name: Option<String>,
    pub mb_nick: Option<String>,
    pub mb_nick_date: Option<String>,
    pub mb_email: Option<String>,
    pub mb_homepage: Option<String>,
    pub mb_level: Option<i64>,
    pub mb_sex: Option<String>,
    pub mb_birth: Option<String>,
    pub mb_tel: Option<String>,
    pub mb_hp: Option<String>,
    pub mb_certify: Option<String>,
    pub mb_adult: Option<i64>,
    pub mb_zip: Option<String>,
    pub mb_zip1: Option<String>,
    pub mb_zip2: Option<String>,
    pub mb_addr1: Option<String>,
    pub mb_addr2: Option<String>,
    pub mb_addr3: Option<String>,
    pub mb_addr_jibeon: Option<String>,
    pub mb_signature: Option<String>,
    pub mb_recommend: Option<String>,
    pub mb_point: Option<i64>,
    pub mb_today_login: Option<String>,
    pub mb_login_ip: Option<String>,
    pub mb_datetime: Option<String>,
    pub mb_ip: Option<String>,
    pub mb_leave_date: Option<String>,
    pub mb_intercept_date: Option<String>,
    pub mb_email_certify: Option<String>,
    pub mb_memo: Option<String>,
    pub mb_mailling: Option<i64>,
    pub mb_mailling_date: Option<String>,
    pub mb_sms: Option<i64>,
    pub mb_sms_date: Option<String>,
    pub mb_open: Option<i64>,
    pub mb_open_date: Option<String>,
    pub mb_profile: Option<String>,
    pub mb_memo_call: Option<String>,
    pub mb_memo_cnt: Option<i64>,
    pub mb_scrap_cnt: Option<i64>,
    pub mb_marketing_agree: Option<i64>,
    pub mb_marketing_date: Option<String>,
    pub mb_thirdparty_agree: Option<i64>,
    pub mb_thirdparty_date: Option<String>,
    pub mb_agree_log: Option<String>,
    pub mb_1: Option<String>,
    pub mb_2: Option<String>,
    pub mb_3: Option<String>,
    pub mb_4: Option<String>,
    pub mb_5: Option<String>,
    pub mb_6: Option<String>,
    pub mb_7: Option<String>,
    pub mb_8: Option<String>,
    pub mb_9: Option<String>,
    pub mb_10: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMemberList {
    pub items: Vec<AdminMember>,
    pub pagination: Pagination,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMemberUpdate {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_nick: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_level: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_hp: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_tel: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_mailling: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_sms: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_marketing_agree: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_thirdparty_agree: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_homepage: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_zip: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_zip1: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_zip2: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_addr1: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_addr2: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_addr3: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_addr_jibeon: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_memo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_profile: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_signature: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_adult: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_certify: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_certify_case: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_open: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_leave_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_intercept_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_password: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_1: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_2: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_3: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_4: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_5: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_6: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_7: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_8: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_9: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mb_10: Option<String>,
}

impl AdminMemberUpdate {
    pub fn is_valid(&self) -> bool {
        let value = serde_json::to_value(self).ok();
        let Some(fields) = value.as_ref().and_then(serde_json::Value::as_object) else {
            return false;
        };
        !fields.is_empty()
            && self.mb_level.is_none_or(|value| (1..=10).contains(&value))
            && [
                self.mb_mailling,
                self.mb_sms,
                self.mb_marketing_agree,
                self.mb_thirdparty_agree,
                self.mb_adult,
                self.mb_open,
            ]
            .into_iter()
            .flatten()
            .all(|value| matches!(value, 0 | 1))
            && [
                self.mb_leave_date.as_deref(),
                self.mb_intercept_date.as_deref(),
            ]
            .into_iter()
            .flatten()
            .all(valid_date_flag)
            && self
                .mb_password
                .as_deref()
                .is_none_or(|value| !value.is_empty())
    }
}

fn valid_date_flag(value: &str) -> bool {
    value.is_empty() || (value.len() == 8 && value.bytes().all(|byte| byte.is_ascii_digit()))
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMemberLevelUpdate {
    pub mb_level: i64,
}

impl AdminMemberLevelUpdate {
    pub fn is_valid(&self) -> bool {
        (1..=10).contains(&self.mb_level)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMemberMediaUpload {
    pub file_name: String,
    pub mime_type: Option<String>,
    pub bytes_base64: String,
}

impl AdminMemberMediaUpload {
    pub fn is_valid(&self) -> bool {
        !self.file_name.is_empty()
            && self.file_name.len() <= 255
            && !self.file_name.contains(['/', '\\'])
            && !self.bytes_base64.is_empty()
            && self.bytes_base64.len() <= 24 * 1024 * 1024
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMemberMediaUploadResult {
    pub mb_id: String,
    pub storage: String,
    pub relative_path: String,
    pub url: String,
    pub size: i64,
    pub width: i64,
    pub height: i64,
    pub mime: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMemberMediaDeleteResult {
    pub mb_id: String,
    pub storage: String,
    pub relative_path: String,
    pub url: String,
    pub deleted: bool,
}

pub fn valid_member_target(value: &str) -> bool {
    valid_member_id(value)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn member_inputs_reject_unknown_enums_empty_updates_and_unsafe_files() {
        assert!(
            AdminMemberListQuery {
                page: Some(1),
                per_page: Some(100),
                search_field: Some("mb_email".into()),
                sort_by: Some("mb_datetime".into()),
                sort_direction: Some("DESC".into()),
                ..Default::default()
            }
            .is_valid()
        );
        assert!(
            !AdminMemberListQuery {
                search_field: Some("../../password".into()),
                ..Default::default()
            }
            .is_valid()
        );
        assert!(!AdminMemberUpdate::default().is_valid());
        assert!(
            AdminMemberUpdate {
                mb_nick: Some("새 닉네임".into()),
                ..Default::default()
            }
            .is_valid()
        );
        assert!(
            !AdminMemberMediaUpload {
                file_name: "../avatar.png".into(),
                mime_type: Some("image/png".into()),
                bytes_base64: "AA==".into(),
            }
            .is_valid()
        );
    }
}
