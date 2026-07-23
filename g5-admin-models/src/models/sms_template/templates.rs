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
pub struct AdminSmsTemplateListQuery {
    pub page: i32,
    pub per_page: i32,
    pub fg_no: Option<i32>,
    pub search_field: Option<String>,
    pub search: Option<String>,
}

impl Default for AdminSmsTemplateListQuery {
    fn default() -> Self {
        Self {
            page: 1,
            per_page: 20,
            fg_no: None,
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
pub struct AdminSmsTemplateItem {
    pub fo_no: i32,
    pub fg_no: i32,
    pub fg_member: i32,
    pub fg_name: Option<String>,
    pub fo_name: String,
    pub fo_content: String,
    pub fo_datetime: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsTemplateListResponse {
    pub templates: Vec<AdminSmsTemplateItem>,
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
pub struct AdminSmsTemplateDetailResponse {
    pub template: AdminSmsTemplateItem,
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
pub struct AdminSmsTemplateCreateInput {
    pub fg_no: i32,
    pub fo_name: String,
    pub fo_content: String,
}

impl AdminSmsTemplateCreateInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        payload.insert("fg_no".to_string(), Value::from(self.fg_no));
        payload.insert("fo_name".to_string(), Value::String(self.fo_name.clone()));
        payload.insert(
            "fo_content".to_string(),
            Value::String(self.fo_content.clone()),
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
pub struct AdminSmsTemplateUpdateInput {
    pub fo_no: i32,
    pub fg_no: Option<i32>,
    pub fo_name: Option<String>,
    pub fo_content: Option<String>,
}

impl AdminSmsTemplateUpdateInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        if let Some(group_id) = self.fg_no {
            payload.insert("fg_no".to_string(), Value::from(group_id));
        }
        if let Some(name) = &self.fo_name {
            payload.insert("fo_name".to_string(), Value::String(name.clone()));
        }
        if let Some(content) = &self.fo_content {
            payload.insert("fo_content".to_string(), Value::String(content.clone()));
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
pub struct AdminSmsTemplateDeleteInput {
    pub fo_no: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsTemplateBatchInput {
    pub action: String,
    pub template_ids: Vec<i32>,
    pub target_fg_no: Option<i32>,
}

impl AdminSmsTemplateBatchInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        payload.insert("action".to_string(), Value::String(self.action.clone()));
        payload.insert(
            "template_ids".to_string(),
            Value::Array(
                self.template_ids
                    .iter()
                    .map(|template_id| Value::from(*template_id))
                    .collect(),
            ),
        );
        if let Some(group_id) = self.target_fg_no {
            payload.insert("target_fg_no".to_string(), Value::from(group_id));
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
pub struct AdminSmsTemplateBatchResult {
    pub action: String,
    pub affected: i32,
    pub target_fg_no: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsTemplateBatchResponse {
    pub result: AdminSmsTemplateBatchResult,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminSmsTemplateListEnvelope {
    pub data: Vec<AdminSmsTemplateItem>,
    pub pagination: Pagination,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminSmsTemplateListEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminSmsTemplateDetailEnvelope {
    pub data: AdminSmsTemplateItem,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminSmsTemplateDetailEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminSmsTemplateBatchEnvelope {
    pub data: AdminSmsTemplateBatchResult,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminSmsTemplateBatchEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}
