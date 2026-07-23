use crate::models::member::Pagination;
use crate::models::trace::{ApiTraceMeta, HasApiTraceMeta};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminBoardListQuery {
    pub page: i32,
    pub per_page: i32,
    pub gr_id: Option<String>,
    pub search: Option<String>,
}

impl Default for AdminBoardListQuery {
    fn default() -> Self {
        Self {
            page: 1,
            per_page: 20,
            gr_id: None,
            search: None,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminBoard {
    pub bo_table: String,
    pub bo_subject: Option<String>,
    pub gr_id: Option<String>,
    pub bo_read_level: Option<i32>,
    pub bo_write_level: Option<i32>,
    pub bo_comment_level: Option<i32>,
    pub bo_download_level: Option<i32>,
    pub bo_use_category: Option<i32>,
    pub bo_category_list: Option<String>,
    pub bo_count_write: Option<i32>,
    pub bo_count_comment: Option<i32>,
    pub bo_use_secret: Option<i32>,
    pub bo_upload_count: Option<i32>,
    pub bo_upload_size: Option<i32>,
    pub extra: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminBoardListResponse {
    pub boards: Vec<AdminBoard>,
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
pub struct AdminBoardDetailResponse {
    pub board: AdminBoard,
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
pub struct AdminBoardNewPostDeleteResult {
    pub deleted: Option<i32>,
    pub bn_ids: Option<Vec<i32>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminBoardNewPostDeleteResponse {
    pub result: AdminBoardNewPostDeleteResult,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminBoardListEnvelope {
    pub data: Vec<AdminBoard>,
    pub pagination: Pagination,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminBoardListEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminBoardDetailEnvelope {
    pub data: AdminBoard,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminBoardDetailEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminBoardNewPostDeleteEnvelope {
    pub data: AdminBoardNewPostDeleteResult,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminBoardNewPostDeleteEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}
