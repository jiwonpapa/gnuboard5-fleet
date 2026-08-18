use serde::{Deserialize, Serialize};

use crate::permissions::Pagination;

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminFaqListQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub fm_id: Option<i64>,
}

impl AdminFaqListQuery {
    pub fn is_valid(&self) -> bool {
        valid_pagination(self.page, self.per_page) && self.fm_id.is_none_or(valid_id)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminFaqItem {
    pub fa_id: i64,
    pub fm_id: i64,
    pub fm_subject: Option<String>,
    pub fa_subject: String,
    pub fa_content: String,
    pub fa_order: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminFaqList {
    pub items: Vec<AdminFaqItem>,
    pub pagination: Pagination,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminFaqCreate {
    pub fm_id: i64,
    pub fa_subject: String,
    pub fa_content: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fa_order: Option<i64>,
}

impl AdminFaqCreate {
    pub fn is_valid(&self) -> bool {
        valid_id(self.fm_id)
            && valid_required_text(&self.fa_subject)
            && valid_required_text(&self.fa_content)
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminFaqUpdate {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fm_id: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fa_subject: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fa_content: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fa_order: Option<i64>,
}

impl AdminFaqUpdate {
    pub fn is_valid(&self) -> bool {
        let has_change = self.fm_id.is_some()
            || self.fa_subject.is_some()
            || self.fa_content.is_some()
            || self.fa_order.is_some();
        has_change
            && self.fm_id.is_none_or(valid_id)
            && self.fa_subject.as_deref().is_none_or(valid_required_text)
            && self.fa_content.as_deref().is_none_or(valid_required_text)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminFaqImage {
    pub exists: bool,
    pub relative_path: String,
    pub url: String,
    pub width: Option<i64>,
    pub height: Option<i64>,
    pub mime: Option<String>,
    pub size: Option<i64>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminFaqMasterSummary {
    pub fm_id: i64,
    pub fm_subject: String,
    pub fm_order: i64,
    pub faq_count: i64,
    pub header_image: AdminFaqImage,
    pub footer_image: AdminFaqImage,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminFaqMasterDetail {
    pub fm_id: i64,
    pub fm_subject: String,
    pub fm_head_html: String,
    pub fm_tail_html: String,
    pub fm_mobile_head_html: String,
    pub fm_mobile_tail_html: String,
    pub fm_order: i64,
    pub faq_count: i64,
    pub header_image: AdminFaqImage,
    pub footer_image: AdminFaqImage,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminFaqMasterListQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
}

impl AdminFaqMasterListQuery {
    pub fn is_valid(&self) -> bool {
        valid_pagination(self.page, self.per_page)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminFaqMasterList {
    pub items: Vec<AdminFaqMasterSummary>,
    pub pagination: Pagination,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminFaqMasterCreate {
    pub fm_subject: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fm_order: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fm_head_html: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fm_tail_html: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fm_mobile_head_html: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fm_mobile_tail_html: Option<String>,
}

impl AdminFaqMasterCreate {
    pub fn is_valid(&self) -> bool {
        valid_required_text(&self.fm_subject)
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminFaqMasterUpdate {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fm_subject: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fm_order: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fm_head_html: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fm_tail_html: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fm_mobile_head_html: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fm_mobile_tail_html: Option<String>,
}

impl AdminFaqMasterUpdate {
    pub fn is_valid(&self) -> bool {
        let has_change = self.fm_subject.is_some()
            || self.fm_order.is_some()
            || self.fm_head_html.is_some()
            || self.fm_tail_html.is_some()
            || self.fm_mobile_head_html.is_some()
            || self.fm_mobile_tail_html.is_some();
        has_change && self.fm_subject.as_deref().is_none_or(valid_required_text)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminFaqImageUpload {
    pub file_name: String,
    pub mime_type: Option<String>,
    pub bytes_base64: String,
}

impl AdminFaqImageUpload {
    pub fn is_valid(&self) -> bool {
        !self.file_name.is_empty()
            && self.file_name.len() <= 255
            && !self.file_name.contains(['/', '\\'])
            && !self.bytes_base64.is_empty()
            && self.bytes_base64.len() <= 24 * 1024 * 1024
    }
}

pub fn valid_faq_id(value: i64) -> bool {
    valid_id(value)
}

fn valid_id(value: i64) -> bool {
    value > 0
}

fn valid_required_text(value: &str) -> bool {
    !value.trim().is_empty()
}

fn valid_pagination(page: Option<u32>, per_page: Option<u32>) -> bool {
    page.is_none_or(|value| value > 0) && per_page.is_none_or(|value| (1..=100).contains(&value))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn faq_inputs_preserve_html_and_fail_closed() {
        assert!(
            AdminFaqMasterCreate {
                fm_subject: "서비스 안내".into(),
                fm_order: Some(0),
                fm_head_html: Some("<p>head</p>".into()),
                fm_tail_html: Some(String::new()),
                fm_mobile_head_html: Some(String::new()),
                fm_mobile_tail_html: Some(String::new()),
            }
            .is_valid()
        );
        assert!(
            AdminFaqCreate {
                fm_id: 1,
                fa_subject: "질문".into(),
                fa_content: "<p>답변</p>".into(),
                fa_order: Some(0),
            }
            .is_valid()
        );
        assert!(!AdminFaqMasterUpdate::default().is_valid());
        assert!(!AdminFaqUpdate::default().is_valid());
        assert!(
            !AdminFaqCreate {
                fm_id: 0,
                fa_subject: " ".into(),
                fa_content: String::new(),
                fa_order: None,
            }
            .is_valid()
        );
        assert!(
            AdminFaqImageUpload {
                file_name: "header.png".into(),
                mime_type: Some("image/png".into()),
                bytes_base64: "aGVsbG8=".into(),
            }
            .is_valid()
        );
    }
}
