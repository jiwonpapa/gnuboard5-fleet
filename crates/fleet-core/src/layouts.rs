use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::permissions::Pagination;

pub const LAYOUT_WIDGET_TYPES: [&str; 10] = [
    "latest_posts",
    "notice_banner",
    "popular_posts",
    "category_grid",
    "search_bar",
    "image_carousel",
    "ad_banner",
    "spacer",
    "html_block",
    "quick_menu",
];

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminLayoutSummary {
    pub sl_id: i64,
    pub sl_page_id: String,
    pub sl_title: String,
    pub sl_active: i64,
    pub sl_datetime: String,
    pub sl_updated: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminLayoutDetail {
    pub sl_id: i64,
    pub sl_page_id: String,
    pub sl_title: String,
    pub sl_schema: String,
    pub sl_active: i64,
    pub sl_datetime: String,
    pub sl_updated: String,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminLayoutListQuery {
    pub page: Option<u32>,
    pub per_page: Option<u8>,
}

impl AdminLayoutListQuery {
    pub fn is_valid(&self) -> bool {
        self.page.is_none_or(|value| (1..=100_000).contains(&value))
            && self.per_page.is_none_or(|value| (1..=100).contains(&value))
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminLayoutList {
    pub items: Vec<AdminLayoutSummary>,
    pub pagination: Pagination,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminLayoutWidget {
    pub widget_id: String,
    #[serde(rename = "type")]
    pub widget_type: String,
    #[serde(default)]
    pub title: String,
    #[serde(default = "default_widget_order")]
    pub order: i64,
    #[serde(default)]
    pub config: BTreeMap<String, Value>,
    #[serde(default)]
    pub style: BTreeMap<String, Value>,
}

impl AdminLayoutWidget {
    pub fn is_valid(&self) -> bool {
        valid_widget_id(&self.widget_id) && valid_widget_type(&self.widget_type) && self.order >= 1
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminLayoutSave {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    pub widgets: Vec<AdminLayoutWidget>,
}

impl AdminLayoutSave {
    pub fn is_valid(&self) -> bool {
        self.title.as_deref().is_none_or(valid_optional_text)
            && self.widgets.iter().all(AdminLayoutWidget::is_valid)
            && unique_widget_ids(self.widgets.iter().map(|widget| widget.widget_id.as_str()))
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminLayoutWidgetCreate {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub widget_id: Option<String>,
    #[serde(rename = "type")]
    pub widget_type: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub order: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub config: Option<BTreeMap<String, Value>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub style: Option<BTreeMap<String, Value>>,
}

impl AdminLayoutWidgetCreate {
    pub fn is_valid(&self) -> bool {
        self.widget_id.as_deref().is_none_or(valid_widget_id)
            && valid_widget_type(&self.widget_type)
            && self.title.as_deref().is_none_or(valid_optional_text)
            && self.order.is_none_or(|value| value >= 1)
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminLayoutWidgetUpdate {
    #[serde(rename = "type", default, skip_serializing_if = "Option::is_none")]
    pub widget_type: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub order: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub config: Option<BTreeMap<String, Value>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub style: Option<BTreeMap<String, Value>>,
}

impl AdminLayoutWidgetUpdate {
    pub fn is_valid(&self) -> bool {
        let has_change = self.widget_type.is_some()
            || self.title.is_some()
            || self.order.is_some()
            || self.config.is_some()
            || self.style.is_some();
        has_change
            && self.widget_type.as_deref().is_none_or(valid_widget_type)
            && self.title.as_deref().is_none_or(valid_optional_text)
            && self.order.is_none_or(|value| value >= 1)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminLayoutWidgetReorder {
    pub widget_ids: Vec<String>,
}

impl AdminLayoutWidgetReorder {
    pub fn is_valid(&self) -> bool {
        !self.widget_ids.is_empty()
            && self.widget_ids.iter().all(|value| valid_widget_id(value))
            && unique_widget_ids(self.widget_ids.iter().map(String::as_str))
    }
}

pub fn valid_layout_page_id(value: &str) -> bool {
    valid_slug(value, 120)
}

pub fn valid_widget_id(value: &str) -> bool {
    valid_slug(value, 80)
}

pub fn valid_widget_type(value: &str) -> bool {
    LAYOUT_WIDGET_TYPES.contains(&value)
}

fn valid_slug(value: &str, max_len: usize) -> bool {
    !value.is_empty()
        && value.len() <= max_len
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
}

fn valid_optional_text(value: &str) -> bool {
    value.len() <= 255
}

fn unique_widget_ids<'a>(mut values: impl Iterator<Item = &'a str>) -> bool {
    let mut seen = std::collections::BTreeSet::new();
    values.all(|value| seen.insert(value))
}

const fn default_widget_order() -> i64 {
    1
}

#[cfg(test)]
mod tests {
    use super::*;

    fn widget(id: &str, widget_type: &str, order: i64) -> AdminLayoutWidget {
        AdminLayoutWidget {
            widget_id: id.into(),
            widget_type: widget_type.into(),
            title: String::new(),
            order,
            config: BTreeMap::new(),
            style: BTreeMap::new(),
        }
    }

    #[test]
    fn layout_inputs_reuse_widget_rules_and_fail_closed() {
        assert!(valid_layout_page_id("dashboard-main"));
        assert!(
            AdminLayoutSave {
                title: Some("대시보드".into()),
                widgets: vec![widget("latest_1", "latest_posts", 1)],
            }
            .is_valid()
        );
        assert!(
            !AdminLayoutSave {
                title: None,
                widgets: vec![
                    widget("same", "latest_posts", 1),
                    widget("same", "unknown", 0),
                ],
            }
            .is_valid()
        );
        assert!(!AdminLayoutWidgetUpdate::default().is_valid());
        assert!(
            AdminLayoutWidgetReorder {
                widget_ids: vec!["hero".into(), "latest".into()],
            }
            .is_valid()
        );
        assert!(
            !AdminLayoutWidgetReorder {
                widget_ids: vec!["same".into(), "same".into()],
            }
            .is_valid()
        );
    }
}
