use crate::models::sms_history::AdminSmsDuplicateSummary;
use crate::models::trace::{ApiTraceMeta, HasApiTraceMeta};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsManualTarget {
    pub name: Option<String>,
    pub phone: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsSendInput {
    pub message: Option<String>,
    pub template_id: Option<i32>,
    pub group_ids: Vec<i32>,
    pub contact_ids: Vec<i32>,
    pub member_levels: Vec<i32>,
    pub manual_targets: Vec<AdminSmsManualTarget>,
    pub booking_at: Option<String>,
    pub wr_reply: Option<String>,
}

impl AdminSmsSendInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        if let Some(message) = &self.message {
            payload.insert("message".to_string(), Value::String(message.clone()));
        }
        if let Some(template_id) = self.template_id {
            payload.insert("template_id".to_string(), Value::from(template_id));
        }
        payload.insert(
            "group_ids".to_string(),
            Value::Array(
                self.group_ids
                    .iter()
                    .map(|value| Value::from(*value))
                    .collect(),
            ),
        );
        payload.insert(
            "contact_ids".to_string(),
            Value::Array(
                self.contact_ids
                    .iter()
                    .map(|value| Value::from(*value))
                    .collect(),
            ),
        );
        payload.insert(
            "member_levels".to_string(),
            Value::Array(
                self.member_levels
                    .iter()
                    .map(|value| Value::from(*value))
                    .collect(),
            ),
        );
        payload.insert(
            "manual_targets".to_string(),
            Value::Array(
                self.manual_targets
                    .iter()
                    .map(|target| {
                        let mut item = Map::new();
                        if let Some(name) = &target.name {
                            item.insert("name".to_string(), Value::String(name.clone()));
                        }
                        item.insert("phone".to_string(), Value::String(target.phone.clone()));
                        Value::Object(item)
                    })
                    .collect(),
            ),
        );
        if let Some(booking_at) = &self.booking_at {
            payload.insert("booking_at".to_string(), Value::String(booking_at.clone()));
        }
        if let Some(reply) = &self.wr_reply {
            payload.insert("wr_reply".to_string(), Value::String(reply.clone()));
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
pub struct AdminSmsSendResult {
    pub write_no: i32,
    pub write_renum: i32,
    pub reply: Option<String>,
    pub message: Option<String>,
    pub booking_at: Option<String>,
    pub total: i32,
    pub success: i32,
    pub failure: i32,
    pub duplicate_summary: Option<AdminSmsDuplicateSummary>,
    pub provider_ready: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsSendResponse {
    pub result: AdminSmsSendResult,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminSmsSendEnvelope {
    pub data: AdminSmsSendResult,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminSmsSendEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}
