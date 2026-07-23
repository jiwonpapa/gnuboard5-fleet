use crate::models::trace::{ApiTraceMeta, HasApiTraceMeta};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsConfig {
    pub cf_title: Option<String>,
    pub cf_sms_use: Option<String>,
    pub cf_sms_type: Option<String>,
    pub cf_icode_id: Option<String>,
    pub cf_icode_pw: Option<String>,
    pub cf_icode_server_ip: Option<String>,
    pub cf_icode_server_port: Option<String>,
    pub cf_icode_token_key: Option<String>,
    pub cf_phone: Option<String>,
    pub cf_datetime: Option<String>,
    pub provider_ready: bool,
    pub uses_token_key: bool,
    pub uses_legacy_credentials: bool,
    pub storage_ready: bool,
    pub missing_tables: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsConfigResponse {
    pub config: AdminSmsConfig,
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
pub struct AdminSmsConfigUpdateInput {
    pub cf_sms_use: Option<String>,
    pub cf_sms_type: Option<String>,
    pub cf_icode_id: Option<String>,
    pub cf_icode_pw: Option<String>,
    pub cf_icode_server_ip: Option<String>,
    pub cf_icode_server_port: Option<String>,
    pub cf_icode_token_key: Option<String>,
    pub cf_phone: Option<String>,
}

impl AdminSmsConfigUpdateInput {
    pub fn to_update_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();

        insert_string(&mut payload, "cf_sms_use", self.cf_sms_use.clone());
        insert_string(&mut payload, "cf_sms_type", self.cf_sms_type.clone());
        insert_string(&mut payload, "cf_icode_id", self.cf_icode_id.clone());
        insert_string(&mut payload, "cf_icode_pw", self.cf_icode_pw.clone());
        insert_string(
            &mut payload,
            "cf_icode_server_ip",
            self.cf_icode_server_ip.clone(),
        );
        insert_string(
            &mut payload,
            "cf_icode_server_port",
            self.cf_icode_server_port.clone(),
        );
        insert_string(
            &mut payload,
            "cf_icode_token_key",
            self.cf_icode_token_key.clone(),
        );
        insert_string(&mut payload, "cf_phone", self.cf_phone.clone());

        payload
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsMemberSyncSummary {
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub total_members: u32,
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub leave_members: u32,
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub phone_empty: u32,
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub phone_valid: u32,
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub phone_invalid: u32,
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub receipt_enabled: u32,
    #[cfg_attr(feature = "ts-bindings", ts(type = "number"))]
    pub receipt_disabled: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsMemberSyncResult {
    pub datetime: Option<String>,
    pub summary: AdminSmsMemberSyncSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSmsMemberSyncResponse {
    pub result: AdminSmsMemberSyncResult,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminSmsConfigEnvelope {
    pub data: AdminSmsConfig,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminSmsConfigEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminSmsMemberSyncEnvelope {
    pub data: AdminSmsMemberSyncResult,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminSmsMemberSyncEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

fn insert_string(payload: &mut Map<String, Value>, key: &str, value: Option<String>) {
    if let Some(value) = value {
        payload.insert(key.to_string(), Value::String(value));
    }
}
