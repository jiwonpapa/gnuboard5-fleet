use crate::models::trace::{ApiTraceMeta, HasApiTraceMeta};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminConfig {
    pub cf_title: Option<String>,
    pub cf_admin: Option<String>,
    pub cf_admin_email: Option<String>,
    pub cf_admin_email_name: Option<String>,
    pub cf_register_level: Option<String>,
    pub cf_register_point: Option<String>,
    pub cf_login_point: Option<String>,
    pub cf_use_point: Option<String>,
    pub cf_write_point: Option<String>,
    pub cf_comment_point: Option<String>,
    pub cf_download_point: Option<String>,
    pub cf_read_point: Option<String>,
    pub cf_memo_send_point: Option<String>,
    pub cf_use_email_certify: Option<String>,
    pub cf_use_homepage: Option<String>,
    pub cf_req_homepage: Option<String>,
    pub cf_use_tel: Option<String>,
    pub cf_req_tel: Option<String>,
    pub cf_use_hp: Option<String>,
    pub cf_req_hp: Option<String>,
    pub cf_use_addr: Option<String>,
    pub cf_req_addr: Option<String>,
    pub cf_new_skin: Option<String>,
    pub cf_search_skin: Option<String>,
    pub cf_connect_skin: Option<String>,
    pub cf_faq_skin: Option<String>,
    pub cf_editor: Option<String>,
    pub cf_member_skin: Option<String>,
    pub cf_mobile_member_skin: Option<String>,
    pub cf_captcha: Option<String>,
    pub cf_social_login_use: Option<String>,
    pub extra: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminConfigResponse {
    pub config: AdminConfig,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminConfigEnvelope {
    pub data: AdminConfig,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminConfigEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}
