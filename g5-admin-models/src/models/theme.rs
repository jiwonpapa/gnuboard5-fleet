use crate::models::trace::{ApiTraceMeta, HasApiTraceMeta};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminThemeConfig {
    pub cf_theme: String,
    pub cf_mobile_theme: String,
    pub cf_theme_installed: bool,
    pub cf_mobile_theme_installed: bool,
    pub installed_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminThemeConfigResponse {
    pub config: AdminThemeConfig,
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
pub struct AdminThemeConfigUpdateInput {
    pub cf_theme: Option<String>,
    pub cf_mobile_theme: Option<String>,
}

impl AdminThemeConfigUpdateInput {
    pub fn to_update_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();

        insert_string(&mut payload, "cf_theme", self.cf_theme.clone());
        insert_string(
            &mut payload,
            "cf_mobile_theme",
            self.cf_mobile_theme.clone(),
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
pub struct AdminTheme {
    pub id: String,
    pub path: String,
    pub theme_name: String,
    pub theme_uri: Option<String>,
    pub maker: Option<String>,
    pub maker_uri: Option<String>,
    pub version: Option<String>,
    pub detail: Option<String>,
    pub license: Option<String>,
    pub license_uri: Option<String>,
    pub readme_path: Option<String>,
    pub theme_config_path: Option<String>,
    pub screenshot_path: Option<String>,
    pub set_default_skin: bool,
    pub preview_board_skin: Option<String>,
    pub preview_mobile_board_skin: Option<String>,
    pub is_active: bool,
    pub is_mobile_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminThemeListResponse {
    pub themes: Vec<AdminTheme>,
    pub total: i32,
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
pub struct AdminThemeDetailResponse {
    pub theme: AdminTheme,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminThemeConfigEnvelope {
    pub data: AdminThemeConfig,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminThemeConfigEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct AdminThemeListMeta {
    #[serde(default)]
    pub total: Option<i32>,
    #[serde(flatten)]
    pub trace: ApiTraceMeta,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminThemeListEnvelope {
    pub data: Vec<AdminTheme>,
    #[serde(default)]
    pub meta: AdminThemeListMeta,
}

impl HasApiTraceMeta for AdminThemeListEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta.trace)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminThemeDetailEnvelope {
    pub data: AdminTheme,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminThemeDetailEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

fn insert_string(payload: &mut Map<String, Value>, key: &str, value: Option<String>) {
    if let Some(value) = value {
        payload.insert(key.to_string(), Value::String(value));
    }
}
