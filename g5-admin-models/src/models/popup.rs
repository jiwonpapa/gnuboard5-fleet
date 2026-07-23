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
pub struct AdminPopupListQuery {
    pub page: i32,
    pub per_page: i32,
}

impl Default for AdminPopupListQuery {
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
pub struct AdminPopup {
    pub nw_id: i32,
    pub nw_division: Option<String>,
    pub nw_device: Option<String>,
    pub nw_begin_time: Option<String>,
    pub nw_end_time: Option<String>,
    pub nw_disable_hours: Option<i32>,
    pub nw_left: Option<i32>,
    pub nw_top: Option<i32>,
    pub nw_height: Option<i32>,
    pub nw_width: Option<i32>,
    pub nw_subject: Option<String>,
    pub nw_content: Option<String>,
    pub nw_content_html: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminPopupListResponse {
    pub popups: Vec<AdminPopup>,
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
pub struct AdminPopupDetailResponse {
    pub popup: AdminPopup,
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
pub struct AdminPopupCreateInput {
    pub nw_division: Option<String>,
    pub nw_device: Option<String>,
    pub nw_begin_time: Option<String>,
    pub nw_end_time: Option<String>,
    pub nw_disable_hours: Option<i32>,
    pub nw_left: Option<i32>,
    pub nw_top: Option<i32>,
    pub nw_height: Option<i32>,
    pub nw_width: Option<i32>,
    pub nw_subject: String,
    pub nw_content: String,
    pub nw_content_html: Option<i32>,
}

impl AdminPopupCreateInput {
    pub fn to_create_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();

        insert_string(&mut payload, "nw_division", self.nw_division.clone());
        insert_string(&mut payload, "nw_device", self.nw_device.clone());
        insert_string(&mut payload, "nw_begin_time", self.nw_begin_time.clone());
        insert_string(&mut payload, "nw_end_time", self.nw_end_time.clone());
        insert_i32(&mut payload, "nw_disable_hours", self.nw_disable_hours);
        insert_i32(&mut payload, "nw_left", self.nw_left);
        insert_i32(&mut payload, "nw_top", self.nw_top);
        insert_i32(&mut payload, "nw_height", self.nw_height);
        insert_i32(&mut payload, "nw_width", self.nw_width);
        payload.insert(
            "nw_subject".to_string(),
            Value::String(self.nw_subject.clone()),
        );
        payload.insert(
            "nw_content".to_string(),
            Value::String(self.nw_content.clone()),
        );
        insert_i32(&mut payload, "nw_content_html", self.nw_content_html);

        payload
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminPopupUpdateInput {
    pub nw_id: i32,
    pub nw_division: Option<String>,
    pub nw_device: Option<String>,
    pub nw_begin_time: Option<String>,
    pub nw_end_time: Option<String>,
    pub nw_disable_hours: Option<i32>,
    pub nw_left: Option<i32>,
    pub nw_top: Option<i32>,
    pub nw_height: Option<i32>,
    pub nw_width: Option<i32>,
    pub nw_subject: Option<String>,
    pub nw_content: Option<String>,
    pub nw_content_html: Option<i32>,
}

impl AdminPopupUpdateInput {
    pub fn to_update_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();

        insert_string(&mut payload, "nw_division", self.nw_division.clone());
        insert_string(&mut payload, "nw_device", self.nw_device.clone());
        insert_string(&mut payload, "nw_begin_time", self.nw_begin_time.clone());
        insert_string(&mut payload, "nw_end_time", self.nw_end_time.clone());
        insert_i32(&mut payload, "nw_disable_hours", self.nw_disable_hours);
        insert_i32(&mut payload, "nw_left", self.nw_left);
        insert_i32(&mut payload, "nw_top", self.nw_top);
        insert_i32(&mut payload, "nw_height", self.nw_height);
        insert_i32(&mut payload, "nw_width", self.nw_width);
        insert_string(&mut payload, "nw_subject", self.nw_subject.clone());
        insert_string(&mut payload, "nw_content", self.nw_content.clone());
        insert_i32(&mut payload, "nw_content_html", self.nw_content_html);

        payload
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminPopupDeleteInput {
    pub nw_id: i32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminPopupListEnvelope {
    pub data: Vec<AdminPopup>,
    pub pagination: Pagination,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminPopupListEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminPopupDetailEnvelope {
    pub data: AdminPopup,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminPopupDetailEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

fn insert_string(payload: &mut Map<String, Value>, key: &str, value: Option<String>) {
    if let Some(value) = value {
        payload.insert(key.to_string(), Value::String(value));
    }
}

fn insert_i32(payload: &mut Map<String, Value>, key: &str, value: Option<i32>) {
    if let Some(value) = value {
        payload.insert(key.to_string(), Value::from(value));
    }
}
