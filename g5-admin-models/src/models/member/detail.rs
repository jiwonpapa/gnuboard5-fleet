use super::{insert_i32, insert_string};
use crate::models::trace::{ApiTraceMeta, HasApiTraceMeta};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMemberDetail {
    pub mb_id: String,
    pub mb_1: Option<String>,
    pub mb_2: Option<String>,
    pub mb_3: Option<String>,
    pub mb_4: Option<String>,
    pub mb_5: Option<String>,
    pub mb_6: Option<String>,
    pub mb_7: Option<String>,
    pub mb_8: Option<String>,
    pub mb_9: Option<String>,
    pub mb_10: Option<String>,
    pub mb_name: Option<String>,
    pub mb_nick: Option<String>,
    pub mb_email: Option<String>,
    pub mb_level: Option<i32>,
    pub mb_point: Option<i32>,
    pub mb_mailling: Option<i32>,
    pub mb_sms: Option<i32>,
    pub mb_marketing_agree: Option<i32>,
    pub mb_thirdparty_agree: Option<i32>,
    pub mb_agree_log: Option<String>,
    pub mb_homepage: Option<String>,
    pub mb_hp: Option<String>,
    pub mb_tel: Option<String>,
    pub mb_zip: Option<String>,
    pub mb_addr1: Option<String>,
    pub mb_addr2: Option<String>,
    pub mb_addr3: Option<String>,
    pub mb_addr_jibeon: Option<String>,
    pub mb_memo: Option<String>,
    pub mb_profile: Option<String>,
    pub mb_signature: Option<String>,
    pub mb_adult: Option<i32>,
    pub mb_certify: Option<String>,
    pub mb_open: Option<i32>,
    pub mb_datetime: Option<String>,
    pub mb_today_login: Option<String>,
    pub mb_leave_date: Option<String>,
    pub mb_intercept_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMemberDetailResponse {
    pub member: AdminMemberDetail,
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
pub struct AdminMemberLevelUpdateInput {
    pub mb_id: String,
    pub mb_level: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMemberUpdateInput {
    pub mb_id: String,
    pub mb_1: Option<String>,
    pub mb_2: Option<String>,
    pub mb_3: Option<String>,
    pub mb_4: Option<String>,
    pub mb_5: Option<String>,
    pub mb_6: Option<String>,
    pub mb_7: Option<String>,
    pub mb_8: Option<String>,
    pub mb_9: Option<String>,
    pub mb_10: Option<String>,
    pub mb_name: Option<String>,
    pub mb_nick: Option<String>,
    pub mb_email: Option<String>,
    pub mb_homepage: Option<String>,
    pub mb_hp: Option<String>,
    pub mb_tel: Option<String>,
    pub mb_zip: Option<String>,
    pub mb_addr1: Option<String>,
    pub mb_addr2: Option<String>,
    pub mb_addr3: Option<String>,
    pub mb_addr_jibeon: Option<String>,
    pub mb_memo: Option<String>,
    pub mb_profile: Option<String>,
    pub mb_signature: Option<String>,
    pub mb_password: Option<String>,
    pub mb_certify: Option<String>,
    pub mb_leave_date: Option<String>,
    pub mb_intercept_date: Option<String>,
    pub mb_mailling: Option<i32>,
    pub mb_sms: Option<i32>,
    pub mb_marketing_agree: Option<i32>,
    pub mb_thirdparty_agree: Option<i32>,
    pub mb_adult: Option<i32>,
    pub mb_open: Option<i32>,
}

impl AdminMemberUpdateInput {
    pub fn to_patch_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();

        insert_string(&mut payload, "mb_1", self.mb_1.clone());
        insert_string(&mut payload, "mb_2", self.mb_2.clone());
        insert_string(&mut payload, "mb_3", self.mb_3.clone());
        insert_string(&mut payload, "mb_4", self.mb_4.clone());
        insert_string(&mut payload, "mb_5", self.mb_5.clone());
        insert_string(&mut payload, "mb_6", self.mb_6.clone());
        insert_string(&mut payload, "mb_7", self.mb_7.clone());
        insert_string(&mut payload, "mb_8", self.mb_8.clone());
        insert_string(&mut payload, "mb_9", self.mb_9.clone());
        insert_string(&mut payload, "mb_10", self.mb_10.clone());
        insert_string(&mut payload, "mb_name", self.mb_name.clone());
        insert_string(&mut payload, "mb_nick", self.mb_nick.clone());
        insert_string(&mut payload, "mb_email", self.mb_email.clone());
        insert_string(&mut payload, "mb_homepage", self.mb_homepage.clone());
        insert_string(&mut payload, "mb_hp", self.mb_hp.clone());
        insert_string(&mut payload, "mb_tel", self.mb_tel.clone());
        insert_string(&mut payload, "mb_zip", self.mb_zip.clone());
        insert_string(&mut payload, "mb_addr1", self.mb_addr1.clone());
        insert_string(&mut payload, "mb_addr2", self.mb_addr2.clone());
        insert_string(&mut payload, "mb_addr3", self.mb_addr3.clone());
        insert_string(&mut payload, "mb_addr_jibeon", self.mb_addr_jibeon.clone());
        insert_string(&mut payload, "mb_memo", self.mb_memo.clone());
        insert_string(&mut payload, "mb_profile", self.mb_profile.clone());
        insert_string(&mut payload, "mb_signature", self.mb_signature.clone());
        insert_string(&mut payload, "mb_password", self.mb_password.clone());
        insert_string(&mut payload, "mb_certify", self.mb_certify.clone());
        insert_string(&mut payload, "mb_leave_date", self.mb_leave_date.clone());
        insert_string(
            &mut payload,
            "mb_intercept_date",
            self.mb_intercept_date.clone(),
        );
        insert_i32(&mut payload, "mb_mailling", self.mb_mailling);
        insert_i32(&mut payload, "mb_sms", self.mb_sms);
        insert_i32(&mut payload, "mb_marketing_agree", self.mb_marketing_agree);
        insert_i32(
            &mut payload,
            "mb_thirdparty_agree",
            self.mb_thirdparty_agree,
        );
        insert_i32(&mut payload, "mb_adult", self.mb_adult);
        insert_i32(&mut payload, "mb_open", self.mb_open);

        payload
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMemberDeleteInput {
    pub mb_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMemberMediaUploadInput {
    pub mb_id: String,
    pub file_name: String,
    pub mime_type: Option<String>,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMemberMediaResult {
    pub mb_id: String,
    pub storage: String,
    pub relative_path: Option<String>,
    pub url: Option<String>,
    pub size: Option<i32>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub mime: Option<String>,
    pub deleted: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminMemberMediaResponse {
    pub media: AdminMemberMediaResult,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminMemberDetailEnvelope {
    pub data: AdminMemberDetail,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminMemberDetailEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminMemberMediaEnvelope {
    pub data: AdminMemberMediaResult,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminMemberMediaEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}
