use crate::models::trace::{ApiTraceMeta, HasApiTraceMeta};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminPushMessageInput {
    pub title: String,
    pub body: String,
    pub r#type: Option<String>,
    pub target: Option<String>,
    pub member_ids: Option<Vec<String>>,
}

impl AdminPushMessageInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        payload.insert(
            "title".to_string(),
            Value::String(self.title.trim().to_string()),
        );
        payload.insert(
            "body".to_string(),
            Value::String(self.body.trim().to_string()),
        );
        if let Some(push_type) = normalize_optional_string(self.r#type.clone()) {
            payload.insert("type".to_string(), Value::String(push_type));
        }
        if let Some(target) = normalize_optional_string(self.target.clone()) {
            payload.insert("target".to_string(), Value::String(target));
        }
        if let Some(member_ids) = &self.member_ids {
            payload.insert(
                "member_ids".to_string(),
                Value::Array(
                    member_ids
                        .iter()
                        .filter_map(|member_id| {
                            let normalized = member_id.trim();
                            if normalized.is_empty() {
                                None
                            } else {
                                Some(Value::String(normalized.to_string()))
                            }
                        })
                        .collect(),
                ),
            );
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
pub struct AdminPushMessageResult {
    pub requested_by: Option<String>,
    pub target_count: i32,
    pub queued: i32,
    pub failed: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminPushMessageResponse {
    pub result: AdminPushMessageResult,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminPushMessageEnvelope {
    pub data: AdminPushMessageResult,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminPushMessageEnvelope {
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
