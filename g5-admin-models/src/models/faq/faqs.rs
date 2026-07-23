use super::insert_optional_string;
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
pub struct AdminFaqListQuery {
    pub page: i32,
    pub per_page: i32,
    pub fm_id: Option<i32>,
}

impl Default for AdminFaqListQuery {
    fn default() -> Self {
        Self {
            page: 1,
            per_page: 20,
            fm_id: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminFaqItem {
    pub fa_id: i32,
    pub fm_id: i32,
    pub fm_subject: Option<String>,
    pub fa_subject: String,
    pub fa_content: String,
    pub fa_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminFaqListResponse {
    pub faqs: Vec<AdminFaqItem>,
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
pub struct AdminFaqDetailResponse {
    pub faq: AdminFaqItem,
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
pub struct AdminFaqCreateInput {
    pub fm_id: i32,
    pub fa_subject: String,
    pub fa_content: String,
    pub fa_order: Option<i32>,
}

impl AdminFaqCreateInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        payload.insert("fm_id".to_string(), Value::from(self.fm_id));
        payload.insert(
            "fa_subject".to_string(),
            Value::String(self.fa_subject.clone()),
        );
        payload.insert(
            "fa_content".to_string(),
            Value::String(self.fa_content.clone()),
        );
        if let Some(order) = self.fa_order {
            payload.insert("fa_order".to_string(), Value::from(order));
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
pub struct AdminFaqUpdateInput {
    pub fa_id: i32,
    pub fm_id: Option<i32>,
    pub fa_subject: Option<String>,
    pub fa_content: Option<String>,
    pub fa_order: Option<i32>,
}

impl AdminFaqUpdateInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        if let Some(master_id) = self.fm_id {
            payload.insert("fm_id".to_string(), Value::from(master_id));
        }
        insert_optional_string(&mut payload, "fa_subject", self.fa_subject.clone());
        insert_optional_string(&mut payload, "fa_content", self.fa_content.clone());
        if let Some(order) = self.fa_order {
            payload.insert("fa_order".to_string(), Value::from(order));
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
pub struct AdminFaqDeleteInput {
    pub fa_id: i32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminFaqListEnvelope {
    pub data: Vec<AdminFaqItem>,
    pub pagination: Pagination,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminFaqListEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminFaqDetailEnvelope {
    pub data: AdminFaqItem,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminFaqDetailEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}
