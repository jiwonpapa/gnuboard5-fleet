use serde::{Deserialize, Serialize};

use crate::permissions::Pagination;

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPopupListQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
}

impl AdminPopupListQuery {
    pub fn is_valid(&self) -> bool {
        self.page.is_none_or(|value| (1..=100_000).contains(&value))
            && self.per_page.is_none_or(|value| (1..=100).contains(&value))
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPopup {
    pub nw_id: i64,
    pub nw_division: Option<String>,
    pub nw_device: Option<String>,
    pub nw_begin_time: Option<String>,
    pub nw_end_time: Option<String>,
    pub nw_disable_hours: Option<i64>,
    pub nw_left: Option<i64>,
    pub nw_top: Option<i64>,
    pub nw_height: Option<i64>,
    pub nw_width: Option<i64>,
    pub nw_subject: Option<String>,
    pub nw_content: Option<String>,
    pub nw_content_html: Option<i64>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPopupList {
    pub items: Vec<AdminPopup>,
    pub pagination: Pagination,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPopupCreate {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub nw_division: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub nw_device: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub nw_begin_time: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub nw_end_time: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub nw_disable_hours: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub nw_left: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub nw_top: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub nw_height: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub nw_width: Option<i64>,
    pub nw_subject: String,
    pub nw_content: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub nw_content_html: Option<i64>,
}

impl AdminPopupCreate {
    pub fn is_valid(&self) -> bool {
        valid_required_text(&self.nw_subject)
            && valid_required_text(&self.nw_content)
            && self.nw_division.as_deref().is_none_or(valid_division)
            && self.nw_device.as_deref().is_none_or(valid_device)
            && self
                .nw_begin_time
                .as_deref()
                .is_none_or(valid_optional_text)
            && self.nw_end_time.as_deref().is_none_or(valid_optional_text)
            && valid_numbers([
                self.nw_disable_hours,
                self.nw_left,
                self.nw_top,
                self.nw_height,
                self.nw_width,
            ])
            && self
                .nw_content_html
                .is_none_or(|value| matches!(value, 0 | 1))
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPopupUpdate {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub nw_division: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub nw_device: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub nw_begin_time: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub nw_end_time: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub nw_disable_hours: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub nw_left: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub nw_top: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub nw_height: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub nw_width: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub nw_subject: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub nw_content: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub nw_content_html: Option<i64>,
}

impl AdminPopupUpdate {
    pub fn is_valid(&self) -> bool {
        self.has_value()
            && self.nw_division.as_deref().is_none_or(valid_division)
            && self.nw_device.as_deref().is_none_or(valid_device)
            && self
                .nw_begin_time
                .as_deref()
                .is_none_or(valid_optional_text)
            && self.nw_end_time.as_deref().is_none_or(valid_optional_text)
            && self.nw_subject.as_deref().is_none_or(valid_required_text)
            && self.nw_content.as_deref().is_none_or(valid_required_text)
            && valid_numbers([
                self.nw_disable_hours,
                self.nw_left,
                self.nw_top,
                self.nw_height,
                self.nw_width,
            ])
            && self
                .nw_content_html
                .is_none_or(|value| matches!(value, 0 | 1))
    }

    fn has_value(&self) -> bool {
        self.nw_division.is_some()
            || self.nw_device.is_some()
            || self.nw_begin_time.is_some()
            || self.nw_end_time.is_some()
            || self.nw_disable_hours.is_some()
            || self.nw_left.is_some()
            || self.nw_top.is_some()
            || self.nw_height.is_some()
            || self.nw_width.is_some()
            || self.nw_subject.is_some()
            || self.nw_content.is_some()
            || self.nw_content_html.is_some()
    }
}

pub fn valid_popup_id(nw_id: i64) -> bool {
    nw_id > 0
}

fn valid_division(value: &str) -> bool {
    matches!(value, "both" | "comm" | "shop" | "layer" | "new")
}

fn valid_device(value: &str) -> bool {
    matches!(value, "both" | "pc" | "mobile")
}

fn valid_required_text(value: &str) -> bool {
    !value.trim().is_empty() && value.len() <= 65_535 && !value.chars().any(char::is_control)
}

fn valid_optional_text(value: &str) -> bool {
    value.len() <= 255 && !value.chars().any(char::is_control)
}

fn valid_numbers(values: [Option<i64>; 5]) -> bool {
    values.into_iter().flatten().all(|value| value >= 0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create() -> AdminPopupCreate {
        AdminPopupCreate {
            nw_division: Some("both".into()),
            nw_device: Some("pc".into()),
            nw_begin_time: Some("2026-08-18 09:00:00".into()),
            nw_end_time: Some("2026-08-19 09:00:00".into()),
            nw_disable_hours: Some(24),
            nw_left: Some(100),
            nw_top: Some(100),
            nw_height: Some(400),
            nw_width: Some(600),
            nw_subject: "점검 공지".into(),
            nw_content: "점검 내용을 안내합니다.".into(),
            nw_content_html: Some(0),
        }
    }

    #[test]
    fn validates_create_and_sparse_update() {
        assert!(create().is_valid());
        assert!(
            AdminPopupUpdate {
                nw_device: Some("mobile".into()),
                ..Default::default()
            }
            .is_valid()
        );
        assert!(!AdminPopupUpdate::default().is_valid());
    }

    #[test]
    fn rejects_invalid_enum_negative_and_blank_content() {
        assert!(
            !AdminPopupCreate {
                nw_division: Some("unknown".into()),
                ..create()
            }
            .is_valid()
        );
        assert!(
            !AdminPopupCreate {
                nw_width: Some(-1),
                ..create()
            }
            .is_valid()
        );
        assert!(
            !AdminPopupCreate {
                nw_content: " ".into(),
                ..create()
            }
            .is_valid()
        );
    }
}
