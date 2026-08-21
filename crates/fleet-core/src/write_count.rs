use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AdminWriteCountPeriod {
    Hour,
    #[default]
    Day,
    Week,
    Month,
    Year,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminWriteCountStatsQuery {
    pub period: Option<AdminWriteCountPeriod>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub bo_table: Option<String>,
}

impl AdminWriteCountStatsQuery {
    pub fn is_valid(&self) -> bool {
        valid_date_range(self.date_from.as_deref(), self.date_to.as_deref())
            && self.bo_table.as_deref().is_none_or(valid_board_table)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminWriteCountItem {
    pub bucket: String,
    pub write_count: i64,
    pub comment_count: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminWriteCountSummary {
    pub write_total: i64,
    pub comment_total: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminWriteCountStats {
    pub period: AdminWriteCountPeriod,
    pub date_from: String,
    pub date_to: String,
    pub bo_table: Option<String>,
    pub summary: AdminWriteCountSummary,
    pub items: Vec<AdminWriteCountItem>,
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

fn valid_board_table(value: &str) -> bool {
    (1..=20).contains(&value.len())
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_')
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preserves_legacy_period_and_optional_filters() {
        assert!(AdminWriteCountStatsQuery::default().is_valid());
        assert!(
            AdminWriteCountStatsQuery {
                period: Some(AdminWriteCountPeriod::Week),
                date_from: Some("2026-08-01".into()),
                date_to: Some("2026-08-21".into()),
                bo_table: Some("notice_2026".into()),
            }
            .is_valid()
        );
    }

    #[test]
    fn rejects_reverse_dates_and_unsafe_board_tables() {
        assert!(
            !AdminWriteCountStatsQuery {
                date_from: Some("2026-08-21".into()),
                date_to: Some("2026-08-01".into()),
                ..Default::default()
            }
            .is_valid()
        );
        assert!(
            !AdminWriteCountStatsQuery {
                bo_table: Some("notice;drop".into()),
                ..Default::default()
            }
            .is_valid()
        );
    }
}
