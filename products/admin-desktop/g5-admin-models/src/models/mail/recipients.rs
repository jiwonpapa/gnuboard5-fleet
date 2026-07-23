use crate::models::member::Pagination;
use crate::models::trace::{ApiTraceMeta, HasApiTraceMeta};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMailRecipientQuery {
    pub page: i32,
    pub per_page: i32,
    pub search: Option<String>,
    pub level_min: Option<i32>,
    pub level_max: Option<i32>,
    pub gr_id: Option<String>,
    pub member_id_from: Option<String>,
    pub member_id_to: Option<String>,
    pub email_contains: Option<String>,
    pub mailling_only: bool,
}

impl Default for AdminMailRecipientQuery {
    fn default() -> Self {
        Self {
            page: 1,
            per_page: 20,
            search: None,
            level_min: None,
            level_max: None,
            gr_id: None,
            member_id_from: None,
            member_id_to: None,
            email_contains: None,
            mailling_only: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMailRecipient {
    pub mb_id: String,
    pub mb_name: Option<String>,
    pub mb_nick: Option<String>,
    pub mb_email: Option<String>,
    pub mb_level: Option<i32>,
    pub mb_mailling: Option<i32>,
    pub mb_datetime: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMailRecipientListResponse {
    pub recipients: Vec<AdminMailRecipient>,
    pub pagination: Pagination,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminMailRecipientListEnvelope {
    pub data: Vec<AdminMailRecipient>,
    pub pagination: Pagination,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminMailRecipientListEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}
