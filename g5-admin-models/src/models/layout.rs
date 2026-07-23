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
pub struct AdminLayoutListQuery {
    pub page: i32,
    pub per_page: i32,
}

impl Default for AdminLayoutListQuery {
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
pub struct AdminLayoutSummary {
    pub sl_id: Option<i32>,
    pub sl_page_id: String,
    pub sl_title: Option<String>,
    pub sl_active: Option<i32>,
    pub sl_datetime: Option<String>,
    pub sl_updated: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminLayoutDetail {
    pub sl_id: Option<i32>,
    pub sl_page_id: String,
    pub sl_title: Option<String>,
    pub sl_schema: Option<String>,
    pub sl_active: Option<i32>,
    pub sl_datetime: Option<String>,
    pub sl_updated: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminLayoutListResponse {
    pub layouts: Vec<AdminLayoutSummary>,
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
pub struct AdminLayoutDetailResponse {
    pub layout: AdminLayoutDetail,
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
pub struct AdminLayoutSaveInput {
    pub page_id: String,
    pub title: Option<String>,
    pub widgets_json: String,
}

impl AdminLayoutSaveInput {
    pub fn to_payload(&self) -> Result<Map<String, Value>, String> {
        let widgets: Value = serde_json::from_str(&self.widgets_json)
            .map_err(|error| format!("widgets_json 파싱 실패: {error}"))?;
        if !widgets.is_array() {
            return Err("widgets_json은 JSON 배열이어야 합니다.".to_string());
        }

        let mut payload = Map::new();
        if let Some(title) = normalize_optional_string(self.title.clone()) {
            payload.insert("title".to_string(), Value::String(title));
        }
        payload.insert("widgets".to_string(), widgets);

        Ok(payload)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminLayoutWidgetCreateInput {
    pub page_id: String,
    pub widget_json: String,
}

impl AdminLayoutWidgetCreateInput {
    pub fn to_payload(&self) -> Result<Map<String, Value>, String> {
        let widget: Value = serde_json::from_str(&self.widget_json)
            .map_err(|error| format!("widget_json 파싱 실패: {error}"))?;
        let object = widget
            .as_object()
            .cloned()
            .ok_or_else(|| "widget_json은 JSON 객체여야 합니다.".to_string())?;

        Ok(object)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminLayoutWidgetUpdateInput {
    pub page_id: String,
    pub widget_id: String,
    pub r#type: Option<String>,
    pub title: Option<String>,
    pub order: Option<i32>,
    pub config_json: Option<String>,
    pub style_json: Option<String>,
}

impl AdminLayoutWidgetUpdateInput {
    pub fn to_payload(&self) -> Result<Map<String, Value>, String> {
        let mut payload = Map::new();

        if let Some(widget_type) = normalize_optional_string(self.r#type.clone()) {
            payload.insert("type".to_string(), Value::String(widget_type));
        }
        if let Some(title) = normalize_optional_string(self.title.clone()) {
            payload.insert("title".to_string(), Value::String(title));
        }
        if let Some(order) = self.order {
            payload.insert("order".to_string(), Value::from(order));
        }
        if let Some(config_json) = normalize_optional_string(self.config_json.clone()) {
            let config: Value = serde_json::from_str(&config_json)
                .map_err(|error| format!("config_json 파싱 실패: {error}"))?;
            let config_object = config
                .as_object()
                .cloned()
                .ok_or_else(|| "config_json은 JSON 객체여야 합니다.".to_string())?;
            payload.insert("config".to_string(), Value::Object(config_object));
        }
        if let Some(style_json) = normalize_optional_string(self.style_json.clone()) {
            let style: Value = serde_json::from_str(&style_json)
                .map_err(|error| format!("style_json 파싱 실패: {error}"))?;
            let style_object = style
                .as_object()
                .cloned()
                .ok_or_else(|| "style_json은 JSON 객체여야 합니다.".to_string())?;
            payload.insert("style".to_string(), Value::Object(style_object));
        }

        Ok(payload)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminLayoutWidgetDeleteInput {
    pub page_id: String,
    pub widget_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminLayoutReorderInput {
    pub page_id: String,
    pub widget_ids: Vec<String>,
}

impl AdminLayoutReorderInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        payload.insert(
            "widget_ids".to_string(),
            Value::Array(self.widget_ids.iter().cloned().map(Value::String).collect()),
        );

        payload
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminLayoutListEnvelope {
    pub data: Vec<AdminLayoutSummary>,
    pub pagination: Pagination,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminLayoutListEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminLayoutDetailEnvelope {
    pub data: AdminLayoutDetail,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminLayoutDetailEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

pub type AdminLayoutActionResponse = AdminLayoutDetailResponse;

fn normalize_optional_string(value: Option<String>) -> Option<String> {
    value.and_then(|value| {
        let normalized = value.trim().to_string();
        if normalized.is_empty() {
            None
        } else {
            Some(normalized)
        }
    })
}
