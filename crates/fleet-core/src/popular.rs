use serde::{Deserialize, Serialize};

use crate::permissions::Pagination;

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPopularListQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
}

impl AdminPopularListQuery {
    pub fn is_valid(&self) -> bool {
        valid_page(self.page, self.per_page)
            && valid_date_range(self.date_from.as_deref(), self.date_to.as_deref())
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPopularItem {
    pub pp_word: String,
    pub pp_date: String,
    pub pp_cnt: i64,
    pub pp_rank: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPopularList {
    pub items: Vec<AdminPopularItem>,
    pub pagination: Pagination,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPopularRankQuery {
    pub limit: Option<u32>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
}

impl AdminPopularRankQuery {
    pub fn is_valid(&self) -> bool {
        self.limit.is_none_or(|value| (1..=100).contains(&value))
            && valid_date_range(self.date_from.as_deref(), self.date_to.as_deref())
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPopularRankItem {
    pub rank: i64,
    pub pp_word: String,
    pub hit_count: i64,
    pub first_date: String,
    pub last_date: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPopularRankList {
    pub items: Vec<AdminPopularRankItem>,
    pub pagination: Pagination,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPopularReset {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub date_from: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub date_to: Option<String>,
}

impl AdminPopularReset {
    pub fn is_valid(&self) -> bool {
        valid_date_range(self.date_from.as_deref(), self.date_to.as_deref())
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminPopularResetResult {
    pub deleted_rows: i64,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
}

fn valid_page(page: Option<u32>, per_page: Option<u32>) -> bool {
    page.is_none_or(|value| (1..=100_000).contains(&value))
        && per_page.is_none_or(|value| (1..=100).contains(&value))
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
    fn validates_legacy_list_and_rank_defaults() {
        assert!(AdminPopularListQuery::default().is_valid());
        assert!(AdminPopularRankQuery::default().is_valid());
        assert!(
            AdminPopularRankQuery {
                limit: Some(20),
                date_from: Some("2026-08-01".into()),
                date_to: Some("2026-08-20".into()),
            }
            .is_valid()
        );
    }

    #[test]
    fn rejects_reverse_ranges_and_out_of_bounds_values() {
        assert!(
            !AdminPopularListQuery {
                date_from: Some("2026-08-20".into()),
                date_to: Some("2026-08-01".into()),
                ..Default::default()
            }
            .is_valid()
        );
        assert!(
            !AdminPopularRankQuery {
                limit: Some(101),
                ..Default::default()
            }
            .is_valid()
        );
        assert!(
            !AdminPopularReset {
                date_from: Some("20260801".into()),
                date_to: None,
            }
            .is_valid()
        );
    }
}
