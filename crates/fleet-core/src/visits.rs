use serde::{Deserialize, Serialize};

use crate::permissions::Pagination;

#[derive(Clone, Copy, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AdminVisitStatsType {
    #[default]
    Date,
    Hour,
    Week,
    Month,
    Year,
    Browser,
    Os,
    Device,
    Domain,
    Search,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminVisitStatsQuery {
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    #[serde(rename = "type")]
    pub stats_type: Option<AdminVisitStatsType>,
    pub limit: Option<u32>,
}

impl AdminVisitStatsQuery {
    pub fn is_valid(&self) -> bool {
        self.limit.is_none_or(|value| (1..=1_000).contains(&value))
            && valid_date_range(self.date_from.as_deref(), self.date_to.as_deref())
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminVisitStatsSummary {
    pub total_visits: i64,
    pub active_days: i64,
    pub first_date: String,
    pub last_date: String,
    pub visit_rows: i64,
    pub unique_ips: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminVisitStatItem {
    pub stat_key: String,
    pub visit_count: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminVisitStats {
    #[serde(rename = "type")]
    pub stats_type: AdminVisitStatsType,
    pub summary: AdminVisitStatsSummary,
    pub items: Vec<AdminVisitStatItem>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminVisitSearchQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub ip: Option<String>,
    pub referer: Option<String>,
    pub agent: Option<String>,
}

impl AdminVisitSearchQuery {
    pub fn is_valid(&self) -> bool {
        self.page.is_none_or(|value| (1..=100_000).contains(&value))
            && self.per_page.is_none_or(|value| (1..=100).contains(&value))
            && valid_date_range(self.date_from.as_deref(), self.date_to.as_deref())
            && valid_optional_filter(self.ip.as_deref(), 45)
            && valid_optional_filter(self.referer.as_deref(), 2_048)
            && valid_optional_filter(self.agent.as_deref(), 1_024)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminVisitLogItem {
    pub vi_id: i64,
    pub ip: String,
    pub date: String,
    pub time: String,
    pub referer: String,
    pub agent: String,
    pub browser: String,
    pub os: String,
    pub device: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminVisitSearchResult {
    pub items: Vec<AdminVisitLogItem>,
    pub pagination: Pagination,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminVisitDelete {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub before: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub date_from: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub date_to: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ip: Option<String>,
}

impl AdminVisitDelete {
    pub fn is_valid(&self) -> bool {
        (self.before.is_some()
            || self.date_from.is_some()
            || self.date_to.is_some()
            || self.ip.is_some())
            && self.before.as_deref().is_none_or(valid_date)
            && valid_date_range(self.date_from.as_deref(), self.date_to.as_deref())
            && valid_optional_filter(self.ip.as_deref(), 45)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminVisitDeleteResult {
    pub deleted_rows: i64,
    pub before: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub ip: Option<String>,
}

fn valid_optional_filter(value: Option<&str>, max_len: usize) -> bool {
    value.is_none_or(|value| !value.trim().is_empty() && value.len() <= max_len)
}

fn valid_date_range(date_from: Option<&str>, date_to: Option<&str>) -> bool {
    date_from.is_none_or(valid_date)
        && date_to.is_none_or(valid_date)
        && match (date_from, date_to) {
            (Some(from), Some(to)) => from <= to,
            _ => true,
        }
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
    fn preserves_legacy_stats_and_search_defaults() {
        assert!(AdminVisitStatsQuery::default().is_valid());
        assert!(AdminVisitSearchQuery::default().is_valid());
        assert!(
            AdminVisitStatsQuery {
                stats_type: Some(AdminVisitStatsType::Device),
                limit: Some(30),
                ..Default::default()
            }
            .is_valid()
        );
    }

    #[test]
    fn rejects_unsafe_or_ambiguous_inputs() {
        assert!(
            !AdminVisitSearchQuery {
                per_page: Some(101),
                ..Default::default()
            }
            .is_valid()
        );
        assert!(
            !AdminVisitStatsQuery {
                date_from: Some("2026-08-20".into()),
                date_to: Some("2026-08-01".into()),
                ..Default::default()
            }
            .is_valid()
        );
        assert!(!AdminVisitDelete::default().is_valid());
        assert!(
            AdminVisitDelete {
                before: Some("2026-08-01".into()),
                ..Default::default()
            }
            .is_valid()
        );
    }
}
