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
pub struct AdminVisitStatsQuery {
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub r#type: Option<String>,
    pub limit: Option<i32>,
}

impl Default for AdminVisitStatsQuery {
    fn default() -> Self {
        Self {
            date_from: None,
            date_to: None,
            r#type: Some("date".to_string()),
            limit: Some(30),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminVisitStatsSummary {
    pub total_visits: i32,
    pub active_days: i32,
    pub first_date: Option<String>,
    pub last_date: Option<String>,
    pub visit_rows: i32,
    pub unique_ips: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminVisitStatItem {
    pub stat_key: String,
    pub visit_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminVisitStatsResponse {
    pub r#type: String,
    pub summary: AdminVisitStatsSummary,
    pub items: Vec<AdminVisitStatItem>,
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
pub struct AdminVisitSearchQuery {
    pub page: i32,
    pub per_page: i32,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub ip: Option<String>,
    pub referer: Option<String>,
    pub agent: Option<String>,
}

impl Default for AdminVisitSearchQuery {
    fn default() -> Self {
        Self {
            page: 1,
            per_page: 50,
            date_from: None,
            date_to: None,
            ip: None,
            referer: None,
            agent: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminVisitLogItem {
    pub vi_id: i32,
    pub vi_ip: Option<String>,
    pub vi_date: Option<String>,
    pub vi_time: Option<String>,
    pub vi_referer: Option<String>,
    pub vi_agent: Option<String>,
    pub vi_browser: Option<String>,
    pub vi_os: Option<String>,
    pub vi_device: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminVisitSearchResponse {
    pub visits: Vec<AdminVisitLogItem>,
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
pub struct AdminVisitDeleteInput {
    pub before: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub ip: Option<String>,
}

impl AdminVisitDeleteInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        insert_string(&mut payload, "before", self.before.clone());
        insert_string(&mut payload, "date_from", self.date_from.clone());
        insert_string(&mut payload, "date_to", self.date_to.clone());
        insert_string(&mut payload, "ip", self.ip.clone());

        payload
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminVisitDeleteResult {
    pub deleted_rows: i32,
    pub before: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub ip: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminVisitDeleteResponse {
    pub result: AdminVisitDeleteResult,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminVisitStatsEnvelope {
    pub data: AdminVisitStatsPayload,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminVisitStatsEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminVisitStatsPayload {
    pub r#type: String,
    pub summary: AdminVisitStatsSummary,
    pub items: Vec<AdminVisitStatItem>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminVisitSearchEnvelope {
    pub data: Vec<AdminVisitLogItem>,
    pub pagination: Pagination,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminVisitSearchEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminVisitDeleteEnvelope {
    pub data: AdminVisitDeleteResult,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminVisitDeleteEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

fn insert_string(payload: &mut Map<String, Value>, key: &str, value: Option<String>) {
    if let Some(value) = value {
        payload.insert(key.to_string(), Value::String(value));
    }
}
