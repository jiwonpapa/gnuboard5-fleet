use serde::{Deserialize, Serialize};

use crate::permissions::Pagination;

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPollListQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
}

impl AdminPollListQuery {
    pub fn is_valid(&self) -> bool {
        self.page.is_none_or(|value| (1..=100_000).contains(&value))
            && self.per_page.is_none_or(|value| (1..=100).contains(&value))
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPollSummary {
    pub po_id: i64,
    pub po_subject: String,
    pub po_date: String,
    pub po_level: i64,
    pub po_point: i64,
    pub po_use: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPoll {
    pub po_id: i64,
    pub po_subject: String,
    pub po_poll1: String,
    pub po_poll2: String,
    pub po_poll3: String,
    pub po_poll4: String,
    pub po_poll5: String,
    pub po_poll6: String,
    pub po_poll7: String,
    pub po_poll8: String,
    pub po_poll9: String,
    pub po_cnt1: i64,
    pub po_cnt2: i64,
    pub po_cnt3: i64,
    pub po_cnt4: i64,
    pub po_cnt5: i64,
    pub po_cnt6: i64,
    pub po_cnt7: i64,
    pub po_cnt8: i64,
    pub po_cnt9: i64,
    pub po_etc: String,
    pub po_level: i64,
    pub po_point: i64,
    pub po_date: String,
    pub po_ips: String,
    pub mb_ids: String,
    pub po_use: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPollList {
    pub items: Vec<AdminPollSummary>,
    pub pagination: Pagination,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPollCreate {
    pub po_subject: String,
    pub po_poll1: String,
    pub po_poll2: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_poll3: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_poll4: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_poll5: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_poll6: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_poll7: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_poll8: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_poll9: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_etc: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_level: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_point: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_use: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_date: Option<String>,
}

impl AdminPollCreate {
    pub fn is_valid(&self) -> bool {
        valid_required_text(&self.po_subject)
            && valid_required_text(&self.po_poll1)
            && valid_required_text(&self.po_poll2)
            && self.optional_text_is_valid()
            && self.po_level.is_none_or(|value| value >= 0)
            && self.po_point.is_none_or(|value| value >= 0)
            && self.po_use.is_none_or(|value| matches!(value, 0 | 1))
            && self.po_date.as_deref().is_none_or(valid_date)
    }

    pub fn is_valid_system(&self) -> bool {
        self.is_valid() && self.po_date.is_none()
    }

    fn optional_text_is_valid(&self) -> bool {
        [
            self.po_poll3.as_deref(),
            self.po_poll4.as_deref(),
            self.po_poll5.as_deref(),
            self.po_poll6.as_deref(),
            self.po_poll7.as_deref(),
            self.po_poll8.as_deref(),
            self.po_poll9.as_deref(),
            self.po_etc.as_deref(),
        ]
        .into_iter()
        .flatten()
        .all(valid_text)
            && self
                .po_etc
                .as_deref()
                .is_none_or(|value| value.len() <= 125)
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPollUpdate {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_subject: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_poll1: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_poll2: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_poll3: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_poll4: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_poll5: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_poll6: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_poll7: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_poll8: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_poll9: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_etc: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_level: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_point: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub po_use: Option<i64>,
}

impl AdminPollUpdate {
    pub fn is_valid(&self) -> bool {
        self.has_value()
            && self.po_subject.as_deref().is_none_or(valid_required_text)
            && self.po_poll1.as_deref().is_none_or(valid_text)
            && self.po_poll2.as_deref().is_none_or(valid_text)
            && [
                self.po_poll3.as_deref(),
                self.po_poll4.as_deref(),
                self.po_poll5.as_deref(),
                self.po_poll6.as_deref(),
                self.po_poll7.as_deref(),
                self.po_poll8.as_deref(),
                self.po_poll9.as_deref(),
                self.po_etc.as_deref(),
            ]
            .into_iter()
            .flatten()
            .all(valid_text)
            && self
                .po_etc
                .as_deref()
                .is_none_or(|value| value.len() <= 125)
            && self.po_level.is_none_or(|value| value >= 0)
            && self.po_point.is_none_or(|value| value >= 0)
            && self.po_use.is_none_or(|value| matches!(value, 0 | 1))
    }

    fn has_value(&self) -> bool {
        self.po_subject.is_some()
            || self.po_poll1.is_some()
            || self.po_poll2.is_some()
            || self.po_poll3.is_some()
            || self.po_poll4.is_some()
            || self.po_poll5.is_some()
            || self.po_poll6.is_some()
            || self.po_poll7.is_some()
            || self.po_poll8.is_some()
            || self.po_poll9.is_some()
            || self.po_etc.is_some()
            || self.po_level.is_some()
            || self.po_point.is_some()
            || self.po_use.is_some()
    }
}

pub fn valid_poll_id(po_id: i64) -> bool {
    po_id > 0
}

fn valid_required_text(value: &str) -> bool {
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

    fn create() -> AdminPollCreate {
        AdminPollCreate {
            po_subject: "다음 기능은?".into(),
            po_poll1: "투표".into(),
            po_poll2: "팝업".into(),
            po_poll3: None,
            po_poll4: None,
            po_poll5: None,
            po_poll6: None,
            po_poll7: None,
            po_poll8: None,
            po_poll9: None,
            po_etc: Some("기타".into()),
            po_level: Some(1),
            po_point: Some(0),
            po_use: Some(1),
            po_date: None,
        }
    }

    #[test]
    fn poll_inputs_follow_system_and_legacy_contracts() {
        assert!(create().is_valid_system());
        let mut legacy = create();
        legacy.po_date = Some("2026-08-18".into());
        assert!(legacy.is_valid());
        assert!(!legacy.is_valid_system());
        assert!(!AdminPollUpdate::default().is_valid());
        assert!(
            AdminPollUpdate {
                po_use: Some(0),
                ..Default::default()
            }
            .is_valid()
        );
    }

    #[test]
    fn poll_identifiers_and_pagination_fail_closed() {
        assert!(valid_poll_id(1));
        assert!(!valid_poll_id(0));
        assert!(
            !AdminPollListQuery {
                page: Some(0),
                per_page: Some(20)
            }
            .is_valid()
        );
        assert!(
            !AdminPollListQuery {
                page: Some(1),
                per_page: Some(101)
            }
            .is_valid()
        );
    }
}
