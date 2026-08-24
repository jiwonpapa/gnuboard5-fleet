use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};

use crate::permissions::Pagination;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsTemplateGroup {
    pub fg_no: i64,
    pub fg_name: String,
    pub fg_count: i64,
    pub fg_member: i64,
    pub is_virtual: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsTemplateGroupList {
    pub groups: Vec<AdminSmsTemplateGroup>,
    pub total: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsTemplateGroupCreate {
    pub fg_name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fg_member: Option<i64>,
}

impl AdminSmsTemplateGroupCreate {
    pub fn is_valid(&self) -> bool {
        bounded_required(&self.fg_name, 255)
            && self.fg_member.is_none_or(|value| matches!(value, 0 | 1))
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsTemplateGroupUpdate {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fg_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fg_member: Option<i64>,
}

impl AdminSmsTemplateGroupUpdate {
    pub fn is_valid(&self) -> bool {
        (self.fg_name.is_some() || self.fg_member.is_some())
            && self
                .fg_name
                .as_ref()
                .is_none_or(|value| bounded_required(value, 255))
            && self.fg_member.is_none_or(|value| matches!(value, 0 | 1))
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsTemplateGroupMove {
    pub target_fg_no: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsTemplateGroupMoveResult {
    pub from_fg_no: i64,
    pub target_fg_no: i64,
    pub affected: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsTemplateGroupClearResult {
    pub fg_no: i64,
    pub deleted: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsTemplate {
    pub fo_no: i64,
    pub fg_no: i64,
    pub fg_name: Option<String>,
    pub fg_member: i64,
    pub fo_name: String,
    pub fo_content: String,
    pub fo_datetime: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsTemplateList {
    pub templates: Vec<AdminSmsTemplate>,
    pub pagination: Pagination,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsTemplateListQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub fg_no: Option<i64>,
    pub search_field: Option<String>,
    pub search: Option<String>,
}

impl AdminSmsTemplateListQuery {
    pub fn is_valid(&self) -> bool {
        self.page.is_none_or(|value| value > 0)
            && self.per_page.is_none_or(|value| (1..=100).contains(&value))
            && self.fg_no.is_none_or(valid_group_id)
            && self
                .search_field
                .as_deref()
                .is_none_or(|value| matches!(value, "all" | "name" | "content"))
            && self.search.as_ref().is_none_or(|value| value.len() <= 255)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsTemplateCreate {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fg_no: Option<i64>,
    pub fo_name: String,
    pub fo_content: String,
}

impl AdminSmsTemplateCreate {
    pub fn is_valid(&self) -> bool {
        self.fg_no.is_none_or(valid_group_id)
            && bounded_required(&self.fo_name, 255)
            && bounded_required(&self.fo_content, 65_535)
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsTemplateUpdate {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fg_no: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fo_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fo_content: Option<String>,
}

impl AdminSmsTemplateUpdate {
    pub fn is_valid(&self) -> bool {
        (self.fg_no.is_some() || self.fo_name.is_some() || self.fo_content.is_some())
            && self.fg_no.is_none_or(valid_group_id)
            && self
                .fo_name
                .as_ref()
                .is_none_or(|value| bounded_required(value, 255))
            && self
                .fo_content
                .as_ref()
                .is_none_or(|value| bounded_required(value, 65_535))
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AdminSmsTemplateBatchAction {
    Delete,
    Move,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsTemplateBatch {
    pub action: AdminSmsTemplateBatchAction,
    #[serde(default, alias = "fo_no")]
    pub template_ids: Vec<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_fg_no: Option<i64>,
}

impl AdminSmsTemplateBatch {
    pub fn is_valid(&self) -> bool {
        !self.template_ids.is_empty()
            && self.template_ids.iter().copied().all(valid_template_id)
            && self
                .template_ids
                .iter()
                .copied()
                .collect::<BTreeSet<_>>()
                .len()
                == self.template_ids.len()
            && match self.action {
                AdminSmsTemplateBatchAction::Move => self.target_fg_no.is_some_and(valid_group_id),
                AdminSmsTemplateBatchAction::Delete => self.target_fg_no.is_none(),
            }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsTemplateBatchResult {
    pub action: AdminSmsTemplateBatchAction,
    pub affected: i64,
    pub target_fg_no: Option<i64>,
}

pub fn valid_sms_template_group_id(value: i64) -> bool {
    valid_group_id(value)
}

pub fn valid_sms_template_id(value: i64) -> bool {
    valid_template_id(value)
}

fn valid_group_id(value: i64) -> bool {
    value >= 0
}

fn valid_template_id(value: i64) -> bool {
    value > 0
}

fn bounded_required(value: &str, max: usize) -> bool {
    !value.trim().is_empty() && value.len() <= max
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn group_and_template_inputs_preserve_virtual_group_and_fail_closed() {
        assert!(
            AdminSmsTemplateGroupCreate {
                fg_name: "운영".into(),
                fg_member: Some(1),
            }
            .is_valid()
        );
        assert!(!AdminSmsTemplateGroupUpdate::default().is_valid());
        assert!(
            AdminSmsTemplateCreate {
                fg_no: Some(0),
                fo_name: "가입 안내".into(),
                fo_content: "가입을 환영합니다.".into(),
            }
            .is_valid()
        );
        assert!(!AdminSmsTemplateUpdate::default().is_valid());
    }

    #[test]
    fn batch_requires_unique_ids_and_an_explicit_move_target() {
        assert!(
            AdminSmsTemplateBatch {
                action: AdminSmsTemplateBatchAction::Move,
                template_ids: vec![1, 2],
                target_fg_no: Some(0),
            }
            .is_valid()
        );
        assert!(
            !AdminSmsTemplateBatch {
                action: AdminSmsTemplateBatchAction::Delete,
                template_ids: vec![1, 1],
                target_fg_no: None,
            }
            .is_valid()
        );
    }
}
