use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};

use crate::permissions::Pagination;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsContactGroup {
    pub bg_no: i64,
    pub bg_name: String,
    pub bg_count: i64,
    pub bg_member: i64,
    pub bg_nomember: i64,
    pub bg_receipt: i64,
    pub bg_reject: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsContactGroupList {
    pub groups: Vec<AdminSmsContactGroup>,
    pub total: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsContactGroupWrite {
    pub bg_name: String,
}

impl AdminSmsContactGroupWrite {
    pub fn is_valid(&self) -> bool {
        bounded_required(&self.bg_name, 255)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsContactGroupMove {
    pub target_bg_no: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsContactGroupMoveResult {
    pub from_bg_no: i64,
    pub target_bg_no: i64,
    pub affected: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsContactGroupClearResult {
    pub bg_no: i64,
    pub deleted: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsContact {
    pub bk_no: i64,
    pub bg_no: i64,
    pub bg_name: Option<String>,
    pub mb_id: Option<String>,
    pub bk_name: String,
    pub bk_hp: String,
    pub bk_receipt: i64,
    pub bk_datetime: Option<String>,
    pub bk_memo: Option<String>,
    pub receipt_label: String,
    pub member_type: String,
    pub member_sync_skipped: Option<bool>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsContactSummary {
    pub total_count: i64,
    pub receipt_count: i64,
    pub reject_count: i64,
    pub member_count: i64,
    pub non_member_count: i64,
    pub last_synced_at: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsContactList {
    pub contacts: Vec<AdminSmsContact>,
    pub pagination: Pagination,
    pub summary: AdminSmsContactSummary,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsContactListQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub bg_no: Option<i64>,
    pub search_field: Option<String>,
    pub search: Option<String>,
    pub with_phone_only: Option<bool>,
}

impl AdminSmsContactListQuery {
    pub fn is_valid(&self) -> bool {
        self.page.is_none_or(|value| value > 0)
            && self.per_page.is_none_or(|value| (1..=100).contains(&value))
            && self.bg_no.is_none_or(valid_id)
            && self
                .search_field
                .as_deref()
                .is_none_or(|value| matches!(value, "all" | "name" | "hp"))
            && self.search.as_ref().is_none_or(|value| value.len() <= 255)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsContactCreate {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bg_no: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mb_id: Option<String>,
    pub bk_name: String,
    pub bk_hp: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bk_receipt: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bk_memo: Option<String>,
}

impl AdminSmsContactCreate {
    pub fn is_valid(&self) -> bool {
        self.bg_no.is_none_or(valid_id)
            && self.mb_id.as_ref().is_none_or(|value| value.len() <= 20)
            && bounded_required(&self.bk_name, 255)
            && valid_phone(&self.bk_hp)
            && self.bk_receipt.is_none_or(|value| matches!(value, 0 | 1))
            && self
                .bk_memo
                .as_ref()
                .is_none_or(|value| value.len() <= 4_096)
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsContactUpdate {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bg_no: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bk_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bk_hp: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bk_receipt: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bk_memo: Option<String>,
}

impl AdminSmsContactUpdate {
    pub fn is_valid(&self) -> bool {
        self.field_count() > 0
            && self.bg_no.is_none_or(valid_id)
            && self
                .bk_name
                .as_ref()
                .is_none_or(|value| bounded_required(value, 255))
            && self.bk_hp.as_ref().is_none_or(|value| valid_phone(value))
            && self.bk_receipt.is_none_or(|value| matches!(value, 0 | 1))
            && self
                .bk_memo
                .as_ref()
                .is_none_or(|value| value.len() <= 4_096)
    }

    fn field_count(&self) -> usize {
        [
            self.bg_no.is_some(),
            self.bk_name.is_some(),
            self.bk_hp.is_some(),
            self.bk_receipt.is_some(),
            self.bk_memo.is_some(),
        ]
        .into_iter()
        .filter(|present| *present)
        .count()
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AdminSmsContactBatchAction {
    Delete,
    Allow,
    Reject,
    Move,
    Copy,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsContactBatch {
    pub action: AdminSmsContactBatchAction,
    #[serde(default, alias = "bk_no")]
    pub contact_ids: Vec<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_bg_no: Option<i64>,
}

impl AdminSmsContactBatch {
    pub fn is_valid(&self) -> bool {
        !self.contact_ids.is_empty()
            && self.contact_ids.iter().copied().all(valid_id)
            && self
                .contact_ids
                .iter()
                .copied()
                .collect::<BTreeSet<_>>()
                .len()
                == self.contact_ids.len()
            && match self.action {
                AdminSmsContactBatchAction::Move | AdminSmsContactBatchAction::Copy => {
                    self.target_bg_no.is_some_and(valid_id)
                }
                _ => self.target_bg_no.is_none(),
            }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsContactBatchResult {
    pub action: AdminSmsContactBatchAction,
    pub affected: i64,
    pub target_bg_no: Option<i64>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsContactImportItem {
    #[serde(default, alias = "bk_name")]
    pub name: Option<String>,
    #[serde(default, alias = "bk_hp")]
    pub phone: Option<String>,
    #[serde(default, alias = "bk_memo")]
    pub memo: Option<String>,
    #[serde(default, alias = "bk_receipt")]
    pub receipt: Option<bool>,
}

impl AdminSmsContactImportItem {
    pub fn is_valid(&self) -> bool {
        self.name.as_ref().is_none_or(|value| value.len() <= 255)
            // Import previews intentionally accept malformed phone rows so the
            // provider can report invalid_count instead of rejecting the whole file.
            && self.phone.as_ref().is_some_and(|value| value.len() <= 32)
            && self.memo.as_ref().is_none_or(|value| value.len() <= 4_096)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsContactImport {
    pub bg_no: i64,
    #[serde(default)]
    pub dry_run: bool,
    pub contacts: Vec<AdminSmsContactImportItem>,
}

impl AdminSmsContactImport {
    pub fn is_valid(&self) -> bool {
        valid_id(self.bg_no)
            && !self.contacts.is_empty()
            && self.contacts.len() <= 10_000
            && self
                .contacts
                .iter()
                .all(AdminSmsContactImportItem::is_valid)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsContactImportResult {
    pub total_count: i64,
    pub invalid_count: i64,
    pub duplicate_count: i64,
    pub importable_count: i64,
    pub imported_count: i64,
    pub dry_run: bool,
    pub duplicate_phones: Vec<String>,
    pub importable_phones: Vec<String>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsContactExportQuery {
    pub bg_no: Option<i64>,
    pub include_no_phone: Option<bool>,
    pub with_hyphen: Option<bool>,
}

impl AdminSmsContactExportQuery {
    pub fn is_valid(&self) -> bool {
        self.bg_no.is_none_or(valid_id)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsContactExportItem {
    pub bk_name: String,
    pub bk_hp: String,
    pub bg_no: i64,
    pub mb_id: Option<String>,
    pub bk_receipt: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsContactExport {
    pub items: Vec<AdminSmsContactExportItem>,
    pub total: i64,
    pub bg_no: Option<i64>,
    pub include_no_phone: bool,
    pub with_hyphen: bool,
}

pub fn valid_sms_contact_id(value: i64) -> bool {
    valid_id(value)
}

fn valid_id(value: i64) -> bool {
    value > 0
}

fn bounded_required(value: &str, max: usize) -> bool {
    !value.trim().is_empty() && value.len() <= max
}

fn valid_phone(value: &str) -> bool {
    let digits = value.bytes().filter(u8::is_ascii_digit).count();
    (8..=15).contains(&digits) && value.len() <= 32
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn contact_inputs_fail_closed_on_invalid_ids_phone_and_empty_updates() {
        assert!(!AdminSmsContactUpdate::default().is_valid());
        assert!(
            !AdminSmsContactCreate {
                bg_no: Some(0),
                mb_id: None,
                bk_name: "Fleet".into(),
                bk_hp: "123".into(),
                bk_receipt: Some(1),
                bk_memo: None,
            }
            .is_valid()
        );
        assert!(
            AdminSmsContactCreate {
                bg_no: Some(1),
                mb_id: None,
                bk_name: "Fleet".into(),
                bk_hp: "010-1234-5678".into(),
                bk_receipt: Some(1),
                bk_memo: None,
            }
            .is_valid()
        );
    }

    #[test]
    fn batch_and_import_require_explicit_bounded_targets() {
        assert!(
            AdminSmsContactBatch {
                action: AdminSmsContactBatchAction::Move,
                contact_ids: vec![1, 2],
                target_bg_no: Some(3),
            }
            .is_valid()
        );
        assert!(
            !AdminSmsContactBatch {
                action: AdminSmsContactBatchAction::Delete,
                contact_ids: vec![1, 1],
                target_bg_no: None,
            }
            .is_valid()
        );
        assert!(
            AdminSmsContactImport {
                bg_no: 1,
                dry_run: true,
                contacts: vec![AdminSmsContactImportItem {
                    name: Some("Fleet".into()),
                    phone: Some("01012345678".into()),
                    memo: None,
                    receipt: Some(true),
                }],
            }
            .is_valid()
        );
    }
}
