use crate::models::trace::{ApiTraceMeta, HasApiTraceMeta};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminQaBulkDeleteInput {
    pub qa_ids: Vec<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminQaBulkDeleteResult {
    pub deleted_count: i32,
    pub qa_ids: Vec<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminQaBulkDeleteResponse {
    pub result: AdminQaBulkDeleteResult,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminQaBulkDeleteEnvelope {
    pub data: AdminQaBulkDeleteResult,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminQaBulkDeleteEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}
