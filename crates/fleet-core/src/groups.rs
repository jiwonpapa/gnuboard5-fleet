use serde::{Deserialize, Serialize};

use crate::permissions::{Pagination, valid_member_id};

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminBoardGroup {
    pub gr_id: String,
    pub gr_subject: String,
    pub gr_admin: String,
    pub gr_device: String,
    pub gr_use_access: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminBoardGroupList {
    pub items: Vec<AdminBoardGroup>,
    pub pagination: Pagination,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminBoardGroupCreate {
    pub gr_id: String,
    pub gr_subject: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub gr_admin: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub gr_device: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub gr_use_access: Option<i64>,
}

impl AdminBoardGroupCreate {
    pub fn is_valid(&self) -> bool {
        valid_group_id(&self.gr_id)
            && valid_subject(&self.gr_subject)
            && valid_device(self.gr_device.as_deref())
            && valid_access(self.gr_use_access)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminBoardGroupUpdate {
    pub gr_subject: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub gr_admin: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub gr_device: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub gr_use_access: Option<i64>,
}

impl AdminBoardGroupUpdate {
    pub fn is_valid(&self) -> bool {
        valid_subject(&self.gr_subject)
            && valid_device(self.gr_device.as_deref())
            && valid_access(self.gr_use_access)
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminBoardGroupMemberListQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub search: Option<String>,
}

impl AdminBoardGroupMemberListQuery {
    pub fn is_valid(&self) -> bool {
        self.page.is_none_or(|value| value > 0)
            && self.per_page.is_none_or(|value| (1..=200).contains(&value))
            && self
                .search
                .as_deref()
                .is_none_or(|value| value.len() <= 200)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminBoardGroupMember {
    pub gm_id: i64,
    pub gr_id: String,
    pub mb_id: String,
    pub gm_datetime: String,
    pub mb_name: Option<String>,
    pub mb_nick: Option<String>,
    pub mb_level: Option<i64>,
    pub mb_today_login: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminBoardGroupMemberList {
    pub items: Vec<AdminBoardGroupMember>,
    pub pagination: Pagination,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminBoardGroupMemberCreate {
    pub mb_id: String,
}

impl AdminBoardGroupMemberCreate {
    pub fn is_valid(&self) -> bool {
        valid_member_id(&self.mb_id)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminBoardGroupMemberResult {
    pub gr_id: String,
    pub mb_id: String,
    pub gm_datetime: String,
}

pub fn valid_group_id(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 10
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_')
}

fn valid_subject(value: &str) -> bool {
    !value.trim().is_empty()
}

fn valid_device(value: Option<&str>) -> bool {
    value.is_none_or(|value| matches!(value, "both" | "pc" | "mobile"))
}

fn valid_access(value: Option<i64>) -> bool {
    value.is_none_or(|value| matches!(value, 0 | 1))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn group_inputs_fail_closed_on_invalid_ids_enums_and_pagination() {
        assert!(
            AdminBoardGroupCreate {
                gr_id: "staff_1".into(),
                gr_subject: "운영진".into(),
                gr_admin: Some("g5admin".into()),
                gr_device: Some("both".into()),
                gr_use_access: Some(1),
            }
            .is_valid()
        );
        assert!(
            !AdminBoardGroupCreate {
                gr_id: "../staff".into(),
                gr_subject: "운영진".into(),
                gr_admin: None,
                gr_device: None,
                gr_use_access: None,
            }
            .is_valid()
        );
        assert!(
            !AdminBoardGroupUpdate {
                gr_subject: " ".into(),
                gr_admin: None,
                gr_device: Some("tablet".into()),
                gr_use_access: Some(2),
            }
            .is_valid()
        );
        assert!(
            !AdminBoardGroupMemberListQuery {
                page: Some(0),
                per_page: Some(201),
                search: None,
            }
            .is_valid()
        );
        assert!(
            AdminBoardGroupMemberCreate {
                mb_id: "member01".into()
            }
            .is_valid()
        );
    }
}
