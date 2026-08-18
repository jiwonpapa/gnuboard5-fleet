use serde::{Deserialize, Serialize};

use crate::permissions::Pagination;

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPointListQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub mb_id: Option<String>,
    pub search_field: Option<String>,
    pub search: Option<String>,
}

impl AdminPointListQuery {
    pub fn is_valid(&self) -> bool {
        self.page.is_none_or(|value| (1..=100_000).contains(&value))
            && self.per_page.is_none_or(|value| (1..=100).contains(&value))
            && self.mb_id.as_deref().is_none_or(valid_non_empty_text)
            && self
                .search_field
                .as_deref()
                .is_none_or(|value| matches!(value, "mb_id" | "po_content"))
            && self.search.as_deref().is_none_or(valid_non_empty_text)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPointItem {
    pub po_id: i64,
    pub mb_id: String,
    pub po_point: i64,
    pub po_datetime: String,
    pub po_content: String,
    pub po_use_point: i64,
    pub po_expired: i64,
    pub po_expire_date: String,
    pub po_mb_point: i64,
    pub po_rel_table: String,
    pub po_rel_id: String,
    pub po_rel_action: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPointList {
    pub items: Vec<AdminPointItem>,
    pub pagination: Pagination,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AdminPointActionKind {
    Grant,
    Deduct,
    Expire,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPointAction {
    pub action: AdminPointActionKind,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mb_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub point: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_content: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub base_date: Option<String>,
}

impl AdminPointAction {
    pub fn is_valid(&self) -> bool {
        match self.action {
            AdminPointActionKind::Grant | AdminPointActionKind::Deduct => {
                self.mb_id.as_deref().is_some_and(valid_non_empty_text)
                    && self.point.is_some_and(|value| value > 0)
                    && self.base_date.is_none()
                    && self.po_content.as_deref().is_none_or(valid_text)
            }
            AdminPointActionKind::Expire => {
                self.mb_id.is_none()
                    && self.point.is_none()
                    && self.po_content.is_none()
                    && self.base_date.as_deref().is_none_or(valid_date)
            }
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPointChange {
    pub mb_id: String,
    pub point: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_content: Option<String>,
}

impl AdminPointChange {
    pub fn is_valid(&self) -> bool {
        valid_non_empty_text(&self.mb_id)
            && self.point > 0
            && self.po_content.as_deref().is_none_or(valid_text)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPointChangeResult {
    pub mb_id: String,
    pub before_point: i64,
    pub changed_point: i64,
    pub after_point: i64,
    pub po_content: String,
    pub processed_at: String,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPointExpire {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub base_date: Option<String>,
}

impl AdminPointExpire {
    pub fn is_valid(&self) -> bool {
        self.base_date.as_deref().is_none_or(valid_date)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPointExpireResult {
    pub base_date: String,
    pub expired_count: i64,
    pub synced_members: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(untagged)]
pub enum AdminPointActionResult {
    Change(AdminPointChangeResult),
    Expire(AdminPointExpireResult),
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPointDelete {
    pub po_ids: Vec<i64>,
}

impl AdminPointDelete {
    pub fn is_valid(&self) -> bool {
        !self.po_ids.is_empty() && self.po_ids.iter().all(|value| *value > 0) && {
            let mut ids = self.po_ids.clone();
            ids.sort_unstable();
            ids.dedup();
            ids.len() == self.po_ids.len()
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPointDeleteResult {
    pub requested_count: i64,
    pub deleted_count: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPointSummary {
    pub mb_id: Option<String>,
    pub total_point: i64,
    pub total_rows: i64,
}

fn valid_non_empty_text(value: &str) -> bool {
    !value.trim().is_empty() && valid_text(value)
}

fn valid_text(value: &str) -> bool {
    value.len() <= 255 && !value.chars().any(char::is_control)
}

fn valid_date(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() == 10
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && bytes
            .iter()
            .enumerate()
            .all(|(index, byte)| matches!(index, 4 | 7) || byte.is_ascii_digit())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn action_variants_enforce_the_openapi_one_of_contract() {
        assert!(
            AdminPointAction {
                action: AdminPointActionKind::Grant,
                mb_id: Some("fleetcert".into()),
                point: Some(100),
                po_content: Some("certification".into()),
                base_date: None,
            }
            .is_valid()
        );
        assert!(
            !AdminPointAction {
                action: AdminPointActionKind::Expire,
                mb_id: Some("fleetcert".into()),
                point: None,
                po_content: None,
                base_date: None,
            }
            .is_valid()
        );
    }

    #[test]
    fn destructive_and_query_inputs_fail_closed() {
        assert!(!AdminPointDelete { po_ids: vec![] }.is_valid());
        assert!(!AdminPointDelete { po_ids: vec![1, 1] }.is_valid());
        assert!(AdminPointDelete { po_ids: vec![1, 2] }.is_valid());
        assert!(
            !AdminPointListQuery {
                search_field: Some("po_rel_table".into()),
                ..Default::default()
            }
            .is_valid()
        );
        assert!(
            AdminPointExpire {
                base_date: Some("2026-08-18".into())
            }
            .is_valid()
        );
    }
}
