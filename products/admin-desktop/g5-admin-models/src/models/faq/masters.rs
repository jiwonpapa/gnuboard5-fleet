use super::insert_optional_string;
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
pub struct AdminFaqImage {
    pub exists: bool,
    pub relative_path: String,
    pub url: String,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub mime: Option<String>,
    pub size: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminFaqMasterSummary {
    pub fm_id: i32,
    pub fm_subject: String,
    pub fm_order: i32,
    pub faq_count: i32,
    pub header_image: AdminFaqImage,
    pub footer_image: AdminFaqImage,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminFaqMasterDetail {
    pub fm_id: i32,
    pub fm_subject: String,
    pub fm_head_html: String,
    pub fm_tail_html: String,
    pub fm_mobile_head_html: String,
    pub fm_mobile_tail_html: String,
    pub fm_order: i32,
    pub faq_count: i32,
    pub header_image: AdminFaqImage,
    pub footer_image: AdminFaqImage,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminFaqMasterListQuery {
    pub page: i32,
    pub per_page: i32,
}

impl Default for AdminFaqMasterListQuery {
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
pub struct AdminFaqMasterListResponse {
    pub masters: Vec<AdminFaqMasterSummary>,
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
pub struct AdminFaqMasterDetailResponse {
    pub master: AdminFaqMasterDetail,
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
pub struct AdminFaqMasterCreateInput {
    pub fm_subject: String,
    pub fm_head_html: Option<String>,
    pub fm_tail_html: Option<String>,
    pub fm_mobile_head_html: Option<String>,
    pub fm_mobile_tail_html: Option<String>,
    pub fm_order: i32,
}

impl AdminFaqMasterCreateInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        payload.insert(
            "fm_subject".to_string(),
            Value::String(self.fm_subject.clone()),
        );
        payload.insert("fm_order".to_string(), Value::from(self.fm_order));
        insert_optional_string(&mut payload, "fm_head_html", self.fm_head_html.clone());
        insert_optional_string(&mut payload, "fm_tail_html", self.fm_tail_html.clone());
        insert_optional_string(
            &mut payload,
            "fm_mobile_head_html",
            self.fm_mobile_head_html.clone(),
        );
        insert_optional_string(
            &mut payload,
            "fm_mobile_tail_html",
            self.fm_mobile_tail_html.clone(),
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
pub struct AdminFaqMasterUpdateInput {
    pub fm_id: i32,
    pub fm_subject: Option<String>,
    pub fm_head_html: Option<String>,
    pub fm_tail_html: Option<String>,
    pub fm_mobile_head_html: Option<String>,
    pub fm_mobile_tail_html: Option<String>,
    pub fm_order: Option<i32>,
}

impl AdminFaqMasterUpdateInput {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        insert_optional_string(&mut payload, "fm_subject", self.fm_subject.clone());
        insert_optional_string(&mut payload, "fm_head_html", self.fm_head_html.clone());
        insert_optional_string(&mut payload, "fm_tail_html", self.fm_tail_html.clone());
        insert_optional_string(
            &mut payload,
            "fm_mobile_head_html",
            self.fm_mobile_head_html.clone(),
        );
        insert_optional_string(
            &mut payload,
            "fm_mobile_tail_html",
            self.fm_mobile_tail_html.clone(),
        );
        if let Some(order) = self.fm_order {
            payload.insert("fm_order".to_string(), Value::from(order));
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
pub struct AdminFaqMasterDeleteInput {
    pub fm_id: i32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminFaqMasterListEnvelope {
    pub data: Vec<AdminFaqMasterSummary>,
    pub pagination: Pagination,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminFaqMasterListEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminFaqMasterDetailEnvelope {
    pub data: AdminFaqMasterDetail,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminFaqMasterDetailEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}
