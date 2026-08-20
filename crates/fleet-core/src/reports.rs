use serde::{Deserialize, Serialize};

use crate::permissions::Pagination;

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AdminReportStatus {
    Pending,
    Approved,
    Rejected,
    Hold,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AdminReportTargetType {
    Post,
    Comment,
    Member,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminReportListQuery {
    pub status: Option<AdminReportStatus>,
    pub target_type: Option<AdminReportTargetType>,
    pub page: Option<u32>,
    pub per_page: Option<u32>,
}

impl AdminReportListQuery {
    pub fn is_valid(&self) -> bool {
        self.page.is_none_or(|value| (1..=100_000).contains(&value))
            && self.per_page.is_none_or(|value| (1..=100).contains(&value))
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminReportItem {
    pub rp_id: i64,
    pub mb_id: Option<String>,
    pub rp_target_type: Option<String>,
    pub rp_target_id: Option<String>,
    pub rp_reason: Option<String>,
    pub rp_detail: Option<String>,
    pub rp_status: Option<String>,
    pub rp_admin_memo: Option<String>,
    pub rp_datetime: Option<String>,
    pub rp_processed_at: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminReportList {
    pub items: Vec<AdminReportItem>,
    pub pagination: Pagination,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminReportStats {
    pub pending: i64,
    pub approved: i64,
    pub rejected: i64,
    pub hold: i64,
    pub total: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminReportUpdate {
    pub status: AdminReportStatus,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub admin_memo: Option<String>,
}

impl AdminReportUpdate {
    pub fn is_valid(&self) -> bool {
        self.admin_memo
            .as_deref()
            .is_none_or(|value| value.len() <= 65_535)
    }
}

pub fn valid_report_id(report_id: i64) -> bool {
    report_id > 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn report_filters_preserve_contract_bounds() {
        assert!(AdminReportListQuery::default().is_valid());
        assert!(
            AdminReportListQuery {
                status: Some(AdminReportStatus::Pending),
                target_type: Some(AdminReportTargetType::Post),
                page: Some(1),
                per_page: Some(100),
            }
            .is_valid()
        );
        assert!(
            !AdminReportListQuery {
                per_page: Some(101),
                ..Default::default()
            }
            .is_valid()
        );
    }

    #[test]
    fn report_updates_reject_invalid_targets_and_oversized_memos() {
        assert!(!valid_report_id(0));
        assert!(valid_report_id(41));
        assert!(
            AdminReportUpdate {
                status: AdminReportStatus::Approved,
                admin_memo: Some("검토 완료".into()),
            }
            .is_valid()
        );
        assert!(
            !AdminReportUpdate {
                status: AdminReportStatus::Hold,
                admin_memo: Some("x".repeat(65_536)),
            }
            .is_valid()
        );
    }
}
