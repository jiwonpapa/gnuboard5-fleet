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
pub struct AdminMailListQuery {
    pub page: i32,
    pub per_page: i32,
}

impl Default for AdminMailListQuery {
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
pub struct AdminMailTemplate {
    pub ma_id: i32,
    pub ma_subject: Option<String>,
    pub ma_content: Option<String>,
    pub ma_time: Option<String>,
    pub ma_ip: Option<String>,
    pub ma_last_option: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMailLastOption {
    pub mb_id1: i32,
    pub mb_id1_from: String,
    pub mb_id1_to: String,
    pub mb_email: String,
    pub mb_mailling: i32,
    pub mb_level_from: i32,
    pub mb_level_to: i32,
    pub gr_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMailDetail {
    pub ma_id: i32,
    pub ma_subject: Option<String>,
    pub ma_content: Option<String>,
    pub ma_time: Option<String>,
    pub ma_ip: Option<String>,
    pub ma_last_option: Option<String>,
    pub last_option: AdminMailLastOption,
    pub preview_html: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMailListResponse {
    pub mails: Vec<AdminMailTemplate>,
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
pub struct AdminMailDetailResponse {
    pub mail: AdminMailDetail,
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
pub struct AdminMailTemplateCreateInput {
    pub ma_subject: String,
    pub ma_content: String,
}

impl AdminMailTemplateCreateInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        payload.insert(
            "ma_subject".to_string(),
            Value::String(self.ma_subject.clone()),
        );
        payload.insert(
            "ma_content".to_string(),
            Value::String(self.ma_content.clone()),
        );

        payload
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMailTemplateUpdateInput {
    pub ma_id: i32,
    pub ma_subject: String,
    pub ma_content: String,
}

impl AdminMailTemplateUpdateInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        payload.insert(
            "ma_subject".to_string(),
            Value::String(self.ma_subject.clone()),
        );
        payload.insert(
            "ma_content".to_string(),
            Value::String(self.ma_content.clone()),
        );

        payload
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMailTemplateDeleteInput {
    pub ma_id: i32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminMailListEnvelope {
    pub data: Vec<AdminMailTemplate>,
    pub pagination: Pagination,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminMailListEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminMailDetailEnvelope {
    pub data: AdminMailDetail,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminMailDetailEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}
