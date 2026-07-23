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
pub struct AdminSmsDuplicateSummary {
    pub total: i32,
    pub phones: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsMessageBatchListQuery {
    pub page: i32,
    pub per_page: i32,
    pub search: Option<String>,
}

impl Default for AdminSmsMessageBatchListQuery {
    fn default() -> Self {
        Self {
            page: 1,
            per_page: 20,
            search: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsMessageBatchItem {
    pub wr_no: i32,
    pub wr_renum: i32,
    pub wr_reply: Option<String>,
    pub wr_message: Option<String>,
    pub wr_booking: Option<String>,
    pub wr_total: i32,
    pub wr_re_total: i32,
    pub wr_success: i32,
    pub wr_failure: i32,
    pub wr_datetime: Option<String>,
    pub wr_memo: Option<String>,
    pub duplicate_summary: Option<AdminSmsDuplicateSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsMessageBatchListResponse {
    pub batches: Vec<AdminSmsMessageBatchItem>,
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
pub struct AdminSmsRetryBatchItem {
    pub wr_no: i32,
    pub wr_renum: i32,
    pub wr_total: i32,
    pub wr_success: i32,
    pub wr_failure: i32,
    pub wr_datetime: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsDeliveryItem {
    pub hs_no: i32,
    pub wr_no: Option<i32>,
    pub wr_renum: Option<i32>,
    pub bg_no: Option<i32>,
    pub bg_name: Option<String>,
    pub mb_id: Option<String>,
    pub bk_no: Option<i32>,
    pub hs_name: Option<String>,
    pub hs_hp: Option<String>,
    pub hs_datetime: Option<String>,
    pub hs_flag: Option<i32>,
    pub hs_code: Option<String>,
    pub hs_memo: Option<String>,
    pub hs_log: Option<String>,
    pub wr_message: Option<String>,
    pub wr_datetime: Option<String>,
    pub wr_booking: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsMessageBatchDetailQuery {
    pub wr_no: i32,
    pub wr_renum: Option<i32>,
    pub page: i32,
    pub per_page: i32,
    pub search_field: Option<String>,
    pub search: Option<String>,
}

impl Default for AdminSmsMessageBatchDetailQuery {
    fn default() -> Self {
        Self {
            wr_no: 0,
            wr_renum: Some(0),
            page: 1,
            per_page: 20,
            search_field: None,
            search: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsMessageBatchDetail {
    pub wr_no: i32,
    pub wr_renum: i32,
    pub wr_reply: Option<String>,
    pub wr_message: Option<String>,
    pub wr_booking: Option<String>,
    pub wr_total: i32,
    pub wr_re_total: i32,
    pub wr_success: i32,
    pub wr_failure: i32,
    pub wr_datetime: Option<String>,
    pub wr_memo: Option<String>,
    pub duplicate_summary: Option<AdminSmsDuplicateSummary>,
    pub retry_batches: Vec<AdminSmsRetryBatchItem>,
    pub deliveries: Vec<AdminSmsDeliveryItem>,
    pub deliveries_pagination: Pagination,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsMessageBatchDetailResponse {
    pub batch: AdminSmsMessageBatchDetail,
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
pub struct AdminSmsDeliveryListQuery {
    pub page: i32,
    pub per_page: i32,
    pub search_field: Option<String>,
    pub search: Option<String>,
}

impl Default for AdminSmsDeliveryListQuery {
    fn default() -> Self {
        Self {
            page: 1,
            per_page: 20,
            search_field: None,
            search: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsDeliveryListResponse {
    pub deliveries: Vec<AdminSmsDeliveryItem>,
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
pub struct AdminSmsBatchResendInput {
    pub wr_no: i32,
    pub wr_renum: Option<i32>,
    pub booking_at: Option<String>,
}

impl AdminSmsBatchResendInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        if let Some(renum) = self.wr_renum {
            payload.insert("wr_renum".to_string(), Value::from(renum));
        }
        if let Some(booking_at) = &self.booking_at {
            payload.insert("booking_at".to_string(), Value::String(booking_at.clone()));
        }
        payload
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminSmsMessageBatchListEnvelope {
    pub data: Vec<AdminSmsMessageBatchItem>,
    pub pagination: Pagination,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminSmsMessageBatchListEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminSmsMessageBatchDetailEnvelope {
    pub data: AdminSmsMessageBatchDetail,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminSmsMessageBatchDetailEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminSmsDeliveryListEnvelope {
    pub data: Vec<AdminSmsDeliveryItem>,
    pub pagination: Pagination,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminSmsDeliveryListEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}
