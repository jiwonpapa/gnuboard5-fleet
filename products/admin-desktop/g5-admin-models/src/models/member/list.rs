use super::Pagination;
use crate::models::trace::{ApiTraceMeta, HasApiTraceMeta};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMemberListQuery {
    pub page: i32,
    pub per_page: i32,
    pub search: Option<String>,
    pub search_field: Option<String>,
}

impl Default for AdminMemberListQuery {
    fn default() -> Self {
        Self {
            page: 1,
            per_page: 20,
            search: None,
            search_field: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMemberListItem {
    pub mb_id: String,
    pub mb_name: Option<String>,
    pub mb_nick: Option<String>,
    pub mb_email: Option<String>,
    pub mb_level: Option<i32>,
    pub mb_point: Option<i32>,
    pub mb_datetime: Option<String>,
    pub mb_today_login: Option<String>,
    pub mb_leave_date: Option<String>,
    pub mb_intercept_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMemberListResponse {
    pub members: Vec<AdminMemberListItem>,
    pub pagination: Pagination,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminMemberListEnvelope {
    pub data: Vec<AdminMemberListItem>,
    pub pagination: Pagination,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminMemberListEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}
