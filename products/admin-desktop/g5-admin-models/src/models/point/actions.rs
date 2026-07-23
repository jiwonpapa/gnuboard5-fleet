use crate::models::trace::{ApiTraceMeta, HasApiTraceMeta};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminPointActionInput {
    pub mb_id: String,
    pub point: i32,
    pub po_content: Option<String>,
}

impl AdminPointActionInput {
    pub fn to_payload(&self, action: &str) -> Map<String, Value> {
        let mut payload = Map::new();
        payload.insert("action".to_string(), Value::String(action.to_string()));
        payload.insert("mb_id".to_string(), Value::String(self.mb_id.clone()));
        payload.insert("point".to_string(), Value::from(self.point));
        if let Some(content) = &self.po_content {
            payload.insert("po_content".to_string(), Value::String(content.clone()));
        }

        payload
    }

    pub fn to_legacy_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        payload.insert("mb_id".to_string(), Value::String(self.mb_id.clone()));
        payload.insert("point".to_string(), Value::from(self.point));
        if let Some(content) = &self.po_content {
            payload.insert("po_content".to_string(), Value::String(content.clone()));
        }

        payload
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminPointActionResult {
    pub mb_id: String,
    pub before_point: i32,
    pub changed_point: i32,
    pub after_point: i32,
    pub po_content: String,
    pub processed_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminPointActionResponse {
    pub result: AdminPointActionResult,
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
pub struct AdminPointDeleteInput {
    pub po_ids: Vec<i32>,
}

impl AdminPointDeleteInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        payload.insert(
            "po_ids".to_string(),
            Value::Array(
                self.po_ids
                    .iter()
                    .map(|po_id| Value::from(*po_id))
                    .collect(),
            ),
        );

        payload
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminPointDeleteResult {
    pub requested_count: i32,
    pub deleted_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminPointDeleteResponse {
    pub result: AdminPointDeleteResult,
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
pub struct AdminPointExpireInput {
    pub base_date: Option<String>,
}

impl AdminPointExpireInput {
    pub fn to_payload(&self, action: &str) -> Map<String, Value> {
        let mut payload = Map::new();
        payload.insert("action".to_string(), Value::String(action.to_string()));
        if let Some(base_date) = &self.base_date {
            payload.insert("base_date".to_string(), Value::String(base_date.clone()));
        }

        payload
    }

    pub fn to_legacy_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        if let Some(base_date) = &self.base_date {
            payload.insert("base_date".to_string(), Value::String(base_date.clone()));
        }

        payload
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminPointExpireResult {
    pub base_date: String,
    pub expired_count: i32,
    pub synced_members: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminPointExpireResponse {
    pub result: AdminPointExpireResult,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminPointActionEnvelope {
    pub data: AdminPointActionResult,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminPointActionEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminPointDeleteEnvelope {
    pub data: AdminPointDeleteResult,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminPointDeleteEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminPointExpireEnvelope {
    pub data: AdminPointExpireResult,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminPointExpireEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}
