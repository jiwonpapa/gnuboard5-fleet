use super::{insert_optional_i32, insert_optional_string};
use crate::models::trace::{ApiTraceMeta, HasApiTraceMeta};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMailSendInput {
    pub ma_id: Option<i32>,
    pub subject: Option<String>,
    pub content: Option<String>,
    pub target_type: String,
    pub level_min: Option<i32>,
    pub level_max: Option<i32>,
    pub gr_id: Option<String>,
    pub member_id_from: Option<String>,
    pub member_id_to: Option<String>,
    pub email_contains: Option<String>,
    pub mb_ids: Vec<String>,
    pub mailling_only: bool,
    pub dry_run: bool,
}

impl AdminMailSendInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        payload.insert(
            "target_type".to_string(),
            Value::String(self.target_type.clone()),
        );
        insert_optional_i32(&mut payload, "ma_id", self.ma_id);
        insert_optional_string(&mut payload, "subject", self.subject.clone());
        insert_optional_string(&mut payload, "content", self.content.clone());
        insert_optional_i32(&mut payload, "level_min", self.level_min);
        insert_optional_i32(&mut payload, "level_max", self.level_max);
        insert_optional_string(&mut payload, "gr_id", self.gr_id.clone());
        insert_optional_string(&mut payload, "member_id_from", self.member_id_from.clone());
        insert_optional_string(&mut payload, "member_id_to", self.member_id_to.clone());
        insert_optional_string(&mut payload, "email_contains", self.email_contains.clone());
        if !self.mb_ids.is_empty() {
            payload.insert(
                "mb_ids".to_string(),
                Value::Array(
                    self.mb_ids
                        .iter()
                        .map(|member_id| Value::String(member_id.clone()))
                        .collect(),
                ),
            );
        }
        payload.insert("mailling_only".to_string(), Value::Bool(self.mailling_only));
        payload.insert("dry_run".to_string(), Value::Bool(self.dry_run));

        payload
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMailSendTarget {
    pub mb_id: String,
    pub mb_email: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMailSendResult {
    pub ma_id: Option<i32>,
    pub template_used: bool,
    pub target_count: i32,
    pub sent_count: i32,
    pub skipped_count: i32,
    pub mail_enabled: bool,
    pub dry_run: bool,
    pub targets: Vec<AdminMailSendTarget>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMailSendResponse {
    pub result: AdminMailSendResult,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminMailSendEnvelope {
    pub data: AdminMailSendResult,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminMailSendEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}
