use crate::models::trace::{ApiTraceMeta, HasApiTraceMeta};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminWriteCountStatsQuery {
    pub period: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub bo_table: Option<String>,
}

impl Default for AdminWriteCountStatsQuery {
    fn default() -> Self {
        Self {
            period: Some("day".to_string()),
            date_from: None,
            date_to: None,
            bo_table: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminWriteCountItem {
    pub bucket: String,
    pub write_count: i32,
    pub comment_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminWriteCountSummary {
    pub write_total: i32,
    pub comment_total: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminWriteCountStatsResponse {
    pub period: String,
    pub date_from: String,
    pub date_to: String,
    pub bo_table: Option<String>,
    pub summary: AdminWriteCountSummary,
    pub items: Vec<AdminWriteCountItem>,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminWriteCountStatsEnvelope {
    pub data: AdminWriteCountStatsData,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminWriteCountStatsEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminWriteCountStatsData {
    pub period: String,
    pub date_from: String,
    pub date_to: String,
    pub bo_table: Option<String>,
    pub summary: AdminWriteCountSummary,
    pub items: Vec<AdminWriteCountItem>,
}
