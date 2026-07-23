use crate::models::trace::{ApiTraceMeta, HasApiTraceMeta};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsImportContactRow {
    pub name: String,
    pub phone: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsContactImportInput {
    pub bg_no: i32,
    pub dry_run: bool,
    #[cfg_attr(feature = "ts-bindings", ts(type = "Array<number> | null"))]
    pub bytes: Option<Vec<u8>>,
    pub file_name: Option<String>,
    pub mime_type: Option<String>,
    pub contacts: Option<Vec<AdminSmsImportContactRow>>,
}

impl AdminSmsContactImportInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        payload.insert("bg_no".to_string(), Value::from(self.bg_no));
        payload.insert("dry_run".to_string(), Value::Bool(self.dry_run));
        if let Some(contacts) = &self.contacts {
            payload.insert(
                "contacts".to_string(),
                Value::Array(
                    contacts
                        .iter()
                        .map(|contact| {
                            let mut row = Map::new();
                            row.insert("name".to_string(), Value::String(contact.name.clone()));
                            row.insert("phone".to_string(), Value::String(contact.phone.clone()));
                            Value::Object(row)
                        })
                        .collect(),
                ),
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
pub struct AdminSmsContactImportResult {
    pub total_count: i32,
    pub invalid_count: i32,
    pub duplicate_count: i32,
    pub importable_count: i32,
    pub imported_count: i32,
    pub dry_run: bool,
    pub duplicate_phones: Vec<String>,
    pub importable_phones: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsContactImportResponse {
    pub result: AdminSmsContactImportResult,
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
pub struct AdminSmsContactExportQuery {
    pub bg_no: Option<i32>,
    pub include_no_phone: Option<bool>,
    pub with_hyphen: Option<bool>,
}

impl Default for AdminSmsContactExportQuery {
    fn default() -> Self {
        Self {
            bg_no: None,
            include_no_phone: Some(false),
            with_hyphen: Some(true),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsContactExportItem {
    pub bk_name: String,
    pub bk_hp: String,
    pub bg_no: i32,
    pub mb_id: Option<String>,
    pub bk_receipt: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsContactExportResponse {
    pub items: Vec<AdminSmsContactExportItem>,
    pub total: i32,
    pub bg_no: Option<i32>,
    pub include_no_phone: bool,
    pub with_hyphen: bool,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminSmsContactImportEnvelope {
    pub data: AdminSmsContactImportResult,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminSmsContactImportEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminSmsContactExportEnvelope {
    pub data: Vec<AdminSmsContactExportItem>,
    pub meta: AdminSmsContactExportMeta,
}

impl HasApiTraceMeta for AdminSmsContactExportEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta.trace)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminSmsContactExportMeta {
    #[serde(default)]
    pub total: i32,
    #[serde(default)]
    pub bg_no: Option<i32>,
    #[serde(default)]
    pub include_no_phone: bool,
    #[serde(default)]
    pub with_hyphen: bool,
    #[serde(flatten)]
    pub trace: ApiTraceMeta,
}
