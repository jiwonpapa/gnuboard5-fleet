use serde::{Deserialize, Serialize};

use crate::permissions::Pagination;

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminContentListQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub search: Option<String>,
}

impl AdminContentListQuery {
    pub fn is_valid(&self) -> bool {
        self.page.is_none_or(|value| value > 0)
            && self.per_page.is_none_or(|value| (1..=100).contains(&value))
            && self
                .search
                .as_deref()
                .is_none_or(|value| value.len() <= 200)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminContent {
    pub co_id: String,
    pub co_subject: String,
    pub co_html: i64,
    pub co_content: String,
    pub co_mobile_content: String,
    pub co_include_head: String,
    pub co_include_tail: String,
    pub co_tag_filter_use: i64,
    pub co_skin: String,
    pub co_mobile_skin: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminContentList {
    pub items: Vec<AdminContent>,
    pub pagination: Pagination,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminContentCreate {
    pub co_id: String,
    pub co_subject: String,
    pub co_content: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub co_html: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub co_mobile_content: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub co_include_head: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub co_include_tail: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub co_tag_filter_use: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub co_skin: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub co_mobile_skin: Option<String>,
}

impl AdminContentCreate {
    pub fn is_valid(&self) -> bool {
        valid_content_id(&self.co_id)
            && valid_required_text(&self.co_subject)
            && valid_required_text(&self.co_content)
            && valid_html_mode(self.co_html)
            && valid_flag(self.co_tag_filter_use)
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminContentUpdate {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub co_subject: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub co_html: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub co_content: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub co_mobile_content: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub co_include_head: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub co_include_tail: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub co_tag_filter_use: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub co_skin: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub co_mobile_skin: Option<String>,
}

impl AdminContentUpdate {
    pub fn is_valid(&self) -> bool {
        let has_change = self.co_subject.is_some()
            || self.co_html.is_some()
            || self.co_content.is_some()
            || self.co_mobile_content.is_some()
            || self.co_include_head.is_some()
            || self.co_include_tail.is_some()
            || self.co_tag_filter_use.is_some()
            || self.co_skin.is_some()
            || self.co_mobile_skin.is_some();
        has_change
            && self.co_subject.as_deref().is_none_or(valid_required_text)
            && self.co_content.as_deref().is_none_or(valid_required_text)
            && valid_html_mode(self.co_html)
            && valid_flag(self.co_tag_filter_use)
    }
}

pub fn valid_content_id(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 20
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_')
}

fn valid_required_text(value: &str) -> bool {
    !value.trim().is_empty()
}

fn valid_html_mode(value: Option<i64>) -> bool {
    value.is_none_or(|value| (0..=2).contains(&value))
}

fn valid_flag(value: Option<i64>) -> bool {
    value.is_none_or(|value| (0..=1).contains(&value))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn content_inputs_preserve_html_mode_and_fail_closed() {
        assert!(
            AdminContentCreate {
                co_id: "about_us".into(),
                co_subject: "회사 소개".into(),
                co_content: "<p>hello</p>".into(),
                co_html: Some(2),
                co_mobile_content: Some(String::new()),
                co_include_head: None,
                co_include_tail: None,
                co_tag_filter_use: Some(1),
                co_skin: None,
                co_mobile_skin: None,
            }
            .is_valid()
        );
        assert!(
            !AdminContentCreate {
                co_id: "../about".into(),
                co_subject: " ".into(),
                co_content: String::new(),
                co_html: Some(3),
                co_mobile_content: None,
                co_include_head: None,
                co_include_tail: None,
                co_tag_filter_use: Some(2),
                co_skin: None,
                co_mobile_skin: None,
            }
            .is_valid()
        );
        assert!(!AdminContentUpdate::default().is_valid());
        assert!(
            AdminContentUpdate {
                co_html: Some(2),
                ..Default::default()
            }
            .is_valid()
        );
    }
}
