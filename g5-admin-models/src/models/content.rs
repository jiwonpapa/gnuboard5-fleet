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
pub struct AdminContentListQuery {
    pub page: i32,
    pub per_page: i32,
    pub search: Option<String>,
}

impl Default for AdminContentListQuery {
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
pub struct AdminContentItem {
    pub co_id: String,
    pub co_subject: String,
    pub co_html: i32,
    pub co_content: String,
    pub co_mobile_content: String,
    pub co_include_head: Option<String>,
    pub co_include_tail: Option<String>,
    pub co_tag_filter_use: Option<i32>,
    pub co_skin: Option<String>,
    pub co_mobile_skin: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminContentListResponse {
    pub contents: Vec<AdminContentItem>,
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
pub struct AdminContentDetailResponse {
    pub content: AdminContentItem,
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
pub struct AdminContentCreateInput {
    pub co_id: String,
    pub co_subject: String,
    pub co_html: i32,
    pub co_content: String,
    pub co_mobile_content: Option<String>,
    pub co_include_head: Option<String>,
    pub co_include_tail: Option<String>,
    pub co_tag_filter_use: Option<i32>,
    pub co_skin: Option<String>,
    pub co_mobile_skin: Option<String>,
}

impl AdminContentCreateInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        payload.insert("co_id".to_string(), Value::String(self.co_id.clone()));
        payload.insert(
            "co_subject".to_string(),
            Value::String(self.co_subject.clone()),
        );
        payload.insert("co_html".to_string(), Value::from(self.co_html));
        payload.insert(
            "co_content".to_string(),
            Value::String(self.co_content.clone()),
        );
        if let Some(mobile_content) = &self.co_mobile_content {
            payload.insert(
                "co_mobile_content".to_string(),
                Value::String(mobile_content.clone()),
            );
        }
        if let Some(include_head) = &self.co_include_head {
            payload.insert(
                "co_include_head".to_string(),
                Value::String(include_head.clone()),
            );
        }
        if let Some(include_tail) = &self.co_include_tail {
            payload.insert(
                "co_include_tail".to_string(),
                Value::String(include_tail.clone()),
            );
        }
        if let Some(tag_filter_use) = self.co_tag_filter_use {
            payload.insert("co_tag_filter_use".to_string(), Value::from(tag_filter_use));
        }
        if let Some(skin) = &self.co_skin {
            payload.insert("co_skin".to_string(), Value::String(skin.clone()));
        }
        if let Some(mobile_skin) = &self.co_mobile_skin {
            payload.insert(
                "co_mobile_skin".to_string(),
                Value::String(mobile_skin.clone()),
            );
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
pub struct AdminContentUpdateInput {
    pub co_id: String,
    pub co_subject: Option<String>,
    pub co_html: Option<i32>,
    pub co_content: Option<String>,
    pub co_mobile_content: Option<String>,
    pub co_include_head: Option<String>,
    pub co_include_tail: Option<String>,
    pub co_tag_filter_use: Option<i32>,
    pub co_skin: Option<String>,
    pub co_mobile_skin: Option<String>,
}

impl AdminContentUpdateInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        if let Some(subject) = &self.co_subject {
            payload.insert("co_subject".to_string(), Value::String(subject.clone()));
        }
        if let Some(html) = self.co_html {
            payload.insert("co_html".to_string(), Value::from(html));
        }
        if let Some(content) = &self.co_content {
            payload.insert("co_content".to_string(), Value::String(content.clone()));
        }
        if let Some(mobile_content) = &self.co_mobile_content {
            payload.insert(
                "co_mobile_content".to_string(),
                Value::String(mobile_content.clone()),
            );
        }
        if let Some(include_head) = &self.co_include_head {
            payload.insert(
                "co_include_head".to_string(),
                Value::String(include_head.clone()),
            );
        }
        if let Some(include_tail) = &self.co_include_tail {
            payload.insert(
                "co_include_tail".to_string(),
                Value::String(include_tail.clone()),
            );
        }
        if let Some(tag_filter_use) = self.co_tag_filter_use {
            payload.insert("co_tag_filter_use".to_string(), Value::from(tag_filter_use));
        }
        if let Some(skin) = &self.co_skin {
            payload.insert("co_skin".to_string(), Value::String(skin.clone()));
        }
        if let Some(mobile_skin) = &self.co_mobile_skin {
            payload.insert(
                "co_mobile_skin".to_string(),
                Value::String(mobile_skin.clone()),
            );
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
pub struct AdminContentDeleteInput {
    pub co_id: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminContentListEnvelope {
    pub data: Vec<AdminContentItem>,
    pub pagination: Pagination,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminContentListEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminContentDetailEnvelope {
    pub data: AdminContentItem,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminContentDetailEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}
