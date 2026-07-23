use crate::models::trace::{ApiTraceMeta, HasApiTraceMeta};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminQaConfig {
    pub qa_id: Option<i32>,
    pub qa_title: Option<String>,
    pub qa_category: Option<String>,
    pub qa_skin: Option<String>,
    pub qa_mobile_skin: Option<String>,
    pub qa_use_email: Option<String>,
    pub qa_req_email: Option<String>,
    pub qa_use_hp: Option<String>,
    pub qa_req_hp: Option<String>,
    pub qa_use_sms: Option<String>,
    pub qa_send_number: Option<String>,
    pub qa_admin_hp: Option<String>,
    pub qa_admin_email: Option<String>,
    pub qa_use_editor: Option<String>,
    pub qa_subject_len: Option<String>,
    pub qa_mobile_subject_len: Option<String>,
    pub qa_page_rows: Option<String>,
    pub qa_mobile_page_rows: Option<String>,
    pub qa_image_width: Option<String>,
    pub qa_upload_size: Option<String>,
    pub qa_insert_content: Option<String>,
    pub qa_include_head: Option<String>,
    pub qa_include_tail: Option<String>,
    pub qa_content_head: Option<String>,
    pub qa_content_tail: Option<String>,
    pub qa_mobile_content_head: Option<String>,
    pub qa_mobile_content_tail: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminQaConfigResponse {
    pub config: AdminQaConfig,
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
pub struct AdminQaConfigUpdateInput {
    pub qa_title: Option<String>,
    pub qa_category: Option<String>,
    pub qa_skin: Option<String>,
    pub qa_mobile_skin: Option<String>,
    pub qa_use_email: Option<String>,
    pub qa_req_email: Option<String>,
    pub qa_use_hp: Option<String>,
    pub qa_req_hp: Option<String>,
    pub qa_use_sms: Option<String>,
    pub qa_send_number: Option<String>,
    pub qa_admin_hp: Option<String>,
    pub qa_admin_email: Option<String>,
    pub qa_use_editor: Option<String>,
    pub qa_subject_len: Option<String>,
    pub qa_mobile_subject_len: Option<String>,
    pub qa_page_rows: Option<String>,
    pub qa_mobile_page_rows: Option<String>,
    pub qa_image_width: Option<String>,
    pub qa_upload_size: Option<String>,
    pub qa_insert_content: Option<String>,
    pub qa_include_head: Option<String>,
    pub qa_include_tail: Option<String>,
    pub qa_content_head: Option<String>,
    pub qa_content_tail: Option<String>,
    pub qa_mobile_content_head: Option<String>,
    pub qa_mobile_content_tail: Option<String>,
}

impl AdminQaConfigUpdateInput {
    pub fn to_update_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();

        insert_string(&mut payload, "qa_title", self.qa_title.clone());
        insert_string(&mut payload, "qa_category", self.qa_category.clone());
        insert_string(&mut payload, "qa_skin", self.qa_skin.clone());
        insert_string(&mut payload, "qa_mobile_skin", self.qa_mobile_skin.clone());
        insert_string(&mut payload, "qa_use_email", self.qa_use_email.clone());
        insert_string(&mut payload, "qa_req_email", self.qa_req_email.clone());
        insert_string(&mut payload, "qa_use_hp", self.qa_use_hp.clone());
        insert_string(&mut payload, "qa_req_hp", self.qa_req_hp.clone());
        insert_string(&mut payload, "qa_use_sms", self.qa_use_sms.clone());
        insert_string(&mut payload, "qa_send_number", self.qa_send_number.clone());
        insert_string(&mut payload, "qa_admin_hp", self.qa_admin_hp.clone());
        insert_string(&mut payload, "qa_admin_email", self.qa_admin_email.clone());
        insert_string(&mut payload, "qa_use_editor", self.qa_use_editor.clone());
        insert_string(&mut payload, "qa_subject_len", self.qa_subject_len.clone());
        insert_string(
            &mut payload,
            "qa_mobile_subject_len",
            self.qa_mobile_subject_len.clone(),
        );
        insert_string(&mut payload, "qa_page_rows", self.qa_page_rows.clone());
        insert_string(
            &mut payload,
            "qa_mobile_page_rows",
            self.qa_mobile_page_rows.clone(),
        );
        insert_string(&mut payload, "qa_image_width", self.qa_image_width.clone());
        insert_string(&mut payload, "qa_upload_size", self.qa_upload_size.clone());
        insert_string(
            &mut payload,
            "qa_insert_content",
            self.qa_insert_content.clone(),
        );
        insert_string(
            &mut payload,
            "qa_include_head",
            self.qa_include_head.clone(),
        );
        insert_string(
            &mut payload,
            "qa_include_tail",
            self.qa_include_tail.clone(),
        );
        insert_string(
            &mut payload,
            "qa_content_head",
            self.qa_content_head.clone(),
        );
        insert_string(
            &mut payload,
            "qa_content_tail",
            self.qa_content_tail.clone(),
        );
        insert_string(
            &mut payload,
            "qa_mobile_content_head",
            self.qa_mobile_content_head.clone(),
        );
        insert_string(
            &mut payload,
            "qa_mobile_content_tail",
            self.qa_mobile_content_tail.clone(),
        );

        payload
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminQaConfigEnvelope {
    pub data: AdminQaConfig,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminQaConfigEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

fn insert_string(payload: &mut Map<String, Value>, key: &str, value: Option<String>) {
    if let Some(value) = value {
        payload.insert(key.to_string(), Value::String(value));
    }
}
