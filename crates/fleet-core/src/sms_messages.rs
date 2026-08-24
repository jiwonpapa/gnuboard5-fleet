use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};

use crate::permissions::Pagination;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsDuplicateSummary {
    pub total: i64,
    pub phones: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsMessageBatch {
    pub wr_no: i64,
    pub wr_renum: i64,
    pub wr_reply: Option<String>,
    pub wr_message: Option<String>,
    pub wr_booking: Option<String>,
    pub wr_total: i64,
    pub wr_re_total: i64,
    pub wr_success: i64,
    pub wr_failure: i64,
    pub wr_datetime: Option<String>,
    pub wr_memo: Option<String>,
    pub duplicate_summary: Option<AdminSmsDuplicateSummary>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsRetryBatch {
    pub wr_no: i64,
    pub wr_renum: i64,
    pub wr_total: i64,
    pub wr_success: i64,
    pub wr_failure: i64,
    pub wr_datetime: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsDelivery {
    pub hs_no: i64,
    pub wr_no: Option<i64>,
    pub wr_renum: Option<i64>,
    pub bg_no: Option<i64>,
    pub bg_name: Option<String>,
    pub mb_id: Option<String>,
    pub bk_no: Option<i64>,
    pub hs_name: Option<String>,
    pub hs_hp: Option<String>,
    pub hs_datetime: Option<String>,
    pub hs_flag: Option<i64>,
    pub hs_code: Option<String>,
    pub hs_memo: Option<String>,
    pub hs_log: Option<String>,
    pub wr_message: Option<String>,
    pub wr_datetime: Option<String>,
    pub wr_booking: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsMessageBatchList {
    pub batches: Vec<AdminSmsMessageBatch>,
    pub pagination: Pagination,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsMessageBatchListQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub search: Option<String>,
}

impl AdminSmsMessageBatchListQuery {
    pub fn is_valid(&self) -> bool {
        valid_page(self.page, self.per_page) && valid_search(&self.search)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsMessageBatchDetail {
    pub wr_no: i64,
    pub wr_renum: i64,
    pub wr_reply: Option<String>,
    pub wr_message: Option<String>,
    pub wr_booking: Option<String>,
    pub wr_total: i64,
    pub wr_re_total: i64,
    pub wr_success: i64,
    pub wr_failure: i64,
    pub wr_datetime: Option<String>,
    pub wr_memo: Option<String>,
    pub duplicate_summary: Option<AdminSmsDuplicateSummary>,
    pub retry_batches: Vec<AdminSmsRetryBatch>,
    pub deliveries: Vec<AdminSmsDelivery>,
    pub deliveries_pagination: Pagination,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsMessageBatchDetailQuery {
    pub wr_renum: Option<i64>,
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub search_field: Option<String>,
    pub search: Option<String>,
}

impl AdminSmsMessageBatchDetailQuery {
    pub fn is_valid(&self) -> bool {
        self.wr_renum.is_none_or(|value| value >= 0)
            && valid_page(self.page, self.per_page)
            && self
                .search_field
                .as_deref()
                .is_none_or(|value| matches!(value, "name" | "hp"))
            && valid_search(&self.search)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsDeliveryList {
    pub deliveries: Vec<AdminSmsDelivery>,
    pub pagination: Pagination,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsDeliveryListQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub search_field: Option<String>,
    pub search: Option<String>,
}

impl AdminSmsDeliveryListQuery {
    pub fn is_valid(&self) -> bool {
        valid_page(self.page, self.per_page)
            && self
                .search_field
                .as_deref()
                .is_none_or(|value| matches!(value, "name" | "hp" | "bk_no"))
            && valid_search(&self.search)
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsResendRequest {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub wr_renum: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub booking_at: Option<String>,
}

impl AdminSmsResendRequest {
    pub fn is_valid(&self) -> bool {
        self.wr_renum.is_none_or(|value| value >= 0) && valid_optional_text(&self.booking_at, 64)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsManualTarget {
    #[serde(default, alias = "bk_name", skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(alias = "bk_hp")]
    pub phone: String,
}

impl AdminSmsManualTarget {
    pub fn is_valid(&self) -> bool {
        valid_optional_text(&self.name, 255)
            && (3..=32).contains(&self.phone.len())
            && self.phone.chars().all(|value| value.is_ascii_digit())
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsMessageCreateRequest {
    #[serde(default, alias = "wr_message", skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(default, alias = "fo_no", skip_serializing_if = "Option::is_none")]
    pub template_id: Option<i64>,
    #[serde(default, alias = "wr_reply", skip_serializing_if = "Option::is_none")]
    pub reply: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub booking_at: Option<String>,
    #[serde(default)]
    pub group_ids: Vec<i64>,
    #[serde(default)]
    pub contact_ids: Vec<i64>,
    #[serde(default)]
    pub member_levels: Vec<i64>,
    #[serde(default)]
    pub manual_targets: Vec<AdminSmsManualTarget>,
}

impl AdminSmsMessageCreateRequest {
    pub fn is_valid(&self) -> bool {
        (self
            .message
            .as_ref()
            .is_some_and(|value| bounded_required(value, 65_535))
            || self.template_id.is_some_and(|value| value > 0))
            && valid_optional_text(&self.reply, 32)
            && valid_optional_text(&self.booking_at, 64)
            && valid_unique_positive(&self.group_ids)
            && valid_unique_positive(&self.contact_ids)
            && valid_unique_positive(&self.member_levels)
            && self
                .manual_targets
                .iter()
                .all(AdminSmsManualTarget::is_valid)
            && (!self.group_ids.is_empty()
                || !self.contact_ids.is_empty()
                || !self.member_levels.is_empty()
                || !self.manual_targets.is_empty())
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsSendResult {
    pub write_no: i64,
    pub write_renum: i64,
    pub reply: Option<String>,
    pub message: Option<String>,
    pub booking_at: Option<String>,
    pub total: i64,
    pub success: i64,
    pub failure: i64,
    pub duplicate_summary: Option<AdminSmsDuplicateSummary>,
    pub provider_ready: bool,
}

pub fn valid_sms_message_batch_id(value: i64) -> bool {
    value > 0
}

fn valid_page(page: Option<u32>, per_page: Option<u32>) -> bool {
    page.is_none_or(|value| value > 0) && per_page.is_none_or(|value| (1..=100).contains(&value))
}

fn valid_search(value: &Option<String>) -> bool {
    value.as_ref().is_none_or(|value| value.len() <= 255)
}

fn valid_optional_text(value: &Option<String>, max: usize) -> bool {
    value
        .as_ref()
        .is_none_or(|value| !value.trim().is_empty() && value.len() <= max)
}

fn bounded_required(value: &str, max: usize) -> bool {
    !value.trim().is_empty() && value.len() <= max
}

fn valid_unique_positive(values: &[i64]) -> bool {
    values.iter().all(|value| *value > 0)
        && values.iter().copied().collect::<BTreeSet<_>>().len() == values.len()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn send_requires_content_and_at_least_one_valid_target() {
        let valid = AdminSmsMessageCreateRequest {
            message: Some("운영 공지".into()),
            reply: Some("021234567".into()),
            manual_targets: vec![AdminSmsManualTarget {
                name: Some("홍길동".into()),
                phone: "01012345678".into(),
            }],
            ..Default::default()
        };
        assert!(valid.is_valid());
        assert!(!AdminSmsMessageCreateRequest::default().is_valid());
        assert!(
            !AdminSmsMessageCreateRequest {
                contact_ids: vec![1, 1],
                ..valid
            }
            .is_valid()
        );
    }

    #[test]
    fn history_queries_and_resend_reject_invalid_contract_values() {
        assert!(AdminSmsMessageBatchListQuery::default().is_valid());
        assert!(
            !AdminSmsMessageBatchDetailQuery {
                search_field: Some("memo".into()),
                ..Default::default()
            }
            .is_valid()
        );
        assert!(
            !AdminSmsResendRequest {
                wr_renum: Some(-1),
                booking_at: None,
            }
            .is_valid()
        );
    }
}
