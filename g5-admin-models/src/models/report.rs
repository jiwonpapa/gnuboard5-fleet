use crate::models::member::Pagination;
use crate::models::trace::{ApiTraceMeta, HasApiTraceMeta};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminReportListQuery {
    pub page: i32,
    pub per_page: i32,
    pub status: Option<String>,
    pub target_type: Option<String>,
}

impl Default for AdminReportListQuery {
    fn default() -> Self {
        Self {
            page: 1,
            per_page: 20,
            status: None,
            target_type: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminReportItem {
    pub rp_id: i32,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminReportListResponse {
    pub reports: Vec<AdminReportItem>,
    pub pagination: Pagination,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminReportDetailResponse {
    pub report: AdminReportItem,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminReportStats {
    pub pending: i32,
    pub approved: i32,
    pub rejected: i32,
    pub hold: i32,
    pub total: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminReportStatsResponse {
    pub stats: AdminReportStats,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminReportUpdateInput {
    pub report_id: i32,
    pub status: String,
    pub admin_memo: Option<String>,
}

impl AdminReportUpdateInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        payload.insert(
            "status".to_string(),
            Value::String(self.status.trim().to_string()),
        );
        if let Some(admin_memo) = normalize_optional_string(self.admin_memo.clone()) {
            payload.insert("admin_memo".to_string(), Value::String(admin_memo));
        }

        payload
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminReportListEnvelope {
    pub data: Vec<AdminReportItem>,
    pub pagination: Pagination,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminReportListEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminReportEnvelope {
    pub data: AdminReportItem,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminReportEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminReportStatsEnvelope {
    pub data: AdminReportStats,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminReportStatsEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

fn normalize_optional_string(value: Option<String>) -> Option<String> {
    value.and_then(|value| {
        let normalized = value.trim().to_string();
        if normalized.is_empty() {
            None
        } else {
            Some(normalized)
        }
    })
}
