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
pub struct AdminSmsContactSummary {
    pub total_count: i32,
    pub receipt_count: i32,
    pub reject_count: i32,
    pub member_count: i32,
    pub non_member_count: i32,
    pub last_synced_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsContactListQuery {
    pub page: i32,
    pub per_page: i32,
    pub bg_no: Option<i32>,
    pub search_field: Option<String>,
    pub search: Option<String>,
    pub with_phone_only: Option<bool>,
}

impl Default for AdminSmsContactListQuery {
    fn default() -> Self {
        Self {
            page: 1,
            per_page: 20,
            bg_no: None,
            search_field: None,
            search: None,
            with_phone_only: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsContactItem {
    pub bk_no: i32,
    pub bg_no: i32,
    pub bg_name: Option<String>,
    pub mb_id: Option<String>,
    pub bk_name: String,
    pub bk_hp: String,
    pub bk_receipt: i32,
    pub bk_datetime: Option<String>,
    pub bk_memo: Option<String>,
    pub receipt_label: Option<String>,
    pub member_type: Option<String>,
    pub member_sync_skipped: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsContactListResponse {
    pub contacts: Vec<AdminSmsContactItem>,
    pub pagination: Pagination,
    pub summary: AdminSmsContactSummary,
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
pub struct AdminSmsContactDetailResponse {
    pub contact: AdminSmsContactItem,
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
pub struct AdminSmsContactCreateInput {
    pub bg_no: i32,
    pub mb_id: Option<String>,
    pub bk_name: String,
    pub bk_hp: String,
    pub bk_receipt: i32,
    pub bk_memo: Option<String>,
}

impl AdminSmsContactCreateInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        payload.insert("bg_no".to_string(), Value::from(self.bg_no));
        if let Some(member_id) = &self.mb_id {
            payload.insert("mb_id".to_string(), Value::String(member_id.clone()));
        }
        payload.insert("bk_name".to_string(), Value::String(self.bk_name.clone()));
        payload.insert("bk_hp".to_string(), Value::String(self.bk_hp.clone()));
        payload.insert("bk_receipt".to_string(), Value::from(self.bk_receipt));
        if let Some(memo) = &self.bk_memo {
            payload.insert("bk_memo".to_string(), Value::String(memo.clone()));
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
pub struct AdminSmsContactUpdateInput {
    pub bk_no: i32,
    pub bg_no: Option<i32>,
    pub bk_name: Option<String>,
    pub bk_hp: Option<String>,
    pub bk_receipt: Option<i32>,
    pub bk_memo: Option<String>,
}

impl AdminSmsContactUpdateInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        if let Some(group_id) = self.bg_no {
            payload.insert("bg_no".to_string(), Value::from(group_id));
        }
        if let Some(name) = &self.bk_name {
            payload.insert("bk_name".to_string(), Value::String(name.clone()));
        }
        if let Some(phone) = &self.bk_hp {
            payload.insert("bk_hp".to_string(), Value::String(phone.clone()));
        }
        if let Some(receipt) = self.bk_receipt {
            payload.insert("bk_receipt".to_string(), Value::from(receipt));
        }
        if let Some(memo) = &self.bk_memo {
            payload.insert("bk_memo".to_string(), Value::String(memo.clone()));
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
pub struct AdminSmsContactDeleteInput {
    pub bk_no: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsContactBatchInput {
    pub action: String,
    pub contact_ids: Vec<i32>,
    pub target_bg_no: Option<i32>,
}

impl AdminSmsContactBatchInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        payload.insert("action".to_string(), Value::String(self.action.clone()));
        payload.insert(
            "contact_ids".to_string(),
            Value::Array(
                self.contact_ids
                    .iter()
                    .map(|contact_id| Value::from(*contact_id))
                    .collect(),
            ),
        );
        if let Some(group_id) = self.target_bg_no {
            payload.insert("target_bg_no".to_string(), Value::from(group_id));
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
pub struct AdminSmsContactBatchResult {
    pub action: String,
    pub affected: i32,
    pub target_bg_no: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsContactBatchResponse {
    pub result: AdminSmsContactBatchResult,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminSmsContactListEnvelope {
    pub data: Vec<AdminSmsContactItem>,
    pub pagination: Pagination,
    pub meta: AdminSmsContactListMeta,
}

impl HasApiTraceMeta for AdminSmsContactListEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta.trace)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminSmsContactListMeta {
    #[serde(default)]
    pub total_count: i32,
    #[serde(default)]
    pub receipt_count: i32,
    #[serde(default)]
    pub reject_count: i32,
    #[serde(default)]
    pub member_count: i32,
    #[serde(default)]
    pub non_member_count: i32,
    #[serde(default)]
    pub last_synced_at: Option<String>,
    #[serde(flatten)]
    pub trace: ApiTraceMeta,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminSmsContactDetailEnvelope {
    pub data: AdminSmsContactItem,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminSmsContactDetailEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminSmsContactBatchEnvelope {
    pub data: AdminSmsContactBatchResult,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminSmsContactBatchEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}
