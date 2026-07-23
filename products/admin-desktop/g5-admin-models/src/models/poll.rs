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
pub struct AdminPollListQuery {
    pub page: i32,
    pub per_page: i32,
}

impl Default for AdminPollListQuery {
    fn default() -> Self {
        Self {
            page: 1,
            per_page: 20,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminPoll {
    pub po_id: i32,
    pub po_subject: Option<String>,
    pub po_poll1: Option<String>,
    pub po_poll2: Option<String>,
    pub po_poll3: Option<String>,
    pub po_poll4: Option<String>,
    pub po_poll5: Option<String>,
    pub po_poll6: Option<String>,
    pub po_poll7: Option<String>,
    pub po_poll8: Option<String>,
    pub po_poll9: Option<String>,
    pub po_cnt1: Option<i32>,
    pub po_cnt2: Option<i32>,
    pub po_cnt3: Option<i32>,
    pub po_cnt4: Option<i32>,
    pub po_cnt5: Option<i32>,
    pub po_cnt6: Option<i32>,
    pub po_cnt7: Option<i32>,
    pub po_cnt8: Option<i32>,
    pub po_cnt9: Option<i32>,
    pub po_etc: Option<String>,
    pub po_level: Option<i32>,
    pub po_point: Option<i32>,
    pub po_date: Option<String>,
    pub po_ips: Option<String>,
    pub mb_ids: Option<String>,
    pub po_use: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminPollListResponse {
    pub polls: Vec<AdminPoll>,
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
pub struct AdminPollDetailResponse {
    pub poll: AdminPoll,
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
pub struct AdminPollCreateInput {
    pub po_subject: String,
    pub po_poll1: String,
    pub po_poll2: String,
    pub po_poll3: Option<String>,
    pub po_poll4: Option<String>,
    pub po_poll5: Option<String>,
    pub po_poll6: Option<String>,
    pub po_poll7: Option<String>,
    pub po_poll8: Option<String>,
    pub po_poll9: Option<String>,
    pub po_etc: Option<String>,
    pub po_level: Option<i32>,
    pub po_point: Option<i32>,
    pub po_date: Option<String>,
    pub po_use: Option<i32>,
}

impl AdminPollCreateInput {
    pub fn to_create_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();

        payload.insert(
            "po_subject".to_string(),
            Value::String(self.po_subject.clone()),
        );
        payload.insert("po_poll1".to_string(), Value::String(self.po_poll1.clone()));
        payload.insert("po_poll2".to_string(), Value::String(self.po_poll2.clone()));
        insert_string(&mut payload, "po_poll3", self.po_poll3.clone());
        insert_string(&mut payload, "po_poll4", self.po_poll4.clone());
        insert_string(&mut payload, "po_poll5", self.po_poll5.clone());
        insert_string(&mut payload, "po_poll6", self.po_poll6.clone());
        insert_string(&mut payload, "po_poll7", self.po_poll7.clone());
        insert_string(&mut payload, "po_poll8", self.po_poll8.clone());
        insert_string(&mut payload, "po_poll9", self.po_poll9.clone());
        insert_string(&mut payload, "po_etc", self.po_etc.clone());
        insert_i32(&mut payload, "po_level", self.po_level);
        insert_i32(&mut payload, "po_point", self.po_point);
        insert_string(&mut payload, "po_date", self.po_date.clone());
        insert_i32(&mut payload, "po_use", self.po_use);

        payload
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminPollUpdateInput {
    pub po_id: i32,
    pub po_subject: Option<String>,
    pub po_poll1: Option<String>,
    pub po_poll2: Option<String>,
    pub po_poll3: Option<String>,
    pub po_poll4: Option<String>,
    pub po_poll5: Option<String>,
    pub po_poll6: Option<String>,
    pub po_poll7: Option<String>,
    pub po_poll8: Option<String>,
    pub po_poll9: Option<String>,
    pub po_etc: Option<String>,
    pub po_level: Option<i32>,
    pub po_point: Option<i32>,
    pub po_use: Option<i32>,
}

impl AdminPollUpdateInput {
    pub fn to_update_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();

        insert_string(&mut payload, "po_subject", self.po_subject.clone());
        insert_string(&mut payload, "po_poll1", self.po_poll1.clone());
        insert_string(&mut payload, "po_poll2", self.po_poll2.clone());
        insert_string(&mut payload, "po_poll3", self.po_poll3.clone());
        insert_string(&mut payload, "po_poll4", self.po_poll4.clone());
        insert_string(&mut payload, "po_poll5", self.po_poll5.clone());
        insert_string(&mut payload, "po_poll6", self.po_poll6.clone());
        insert_string(&mut payload, "po_poll7", self.po_poll7.clone());
        insert_string(&mut payload, "po_poll8", self.po_poll8.clone());
        insert_string(&mut payload, "po_poll9", self.po_poll9.clone());
        insert_string(&mut payload, "po_etc", self.po_etc.clone());
        insert_i32(&mut payload, "po_level", self.po_level);
        insert_i32(&mut payload, "po_point", self.po_point);
        insert_i32(&mut payload, "po_use", self.po_use);

        payload
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminPollDeleteInput {
    pub po_id: i32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminPollListEnvelope {
    pub data: Vec<AdminPoll>,
    pub pagination: Pagination,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminPollListEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminPollDetailEnvelope {
    pub data: AdminPoll,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminPollDetailEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

fn insert_string(payload: &mut Map<String, Value>, key: &str, value: Option<String>) {
    if let Some(value) = value {
        payload.insert(key.to_string(), Value::String(value));
    }
}

fn insert_i32(payload: &mut Map<String, Value>, key: &str, value: Option<i32>) {
    if let Some(value) = value {
        payload.insert(key.to_string(), Value::from(value));
    }
}
