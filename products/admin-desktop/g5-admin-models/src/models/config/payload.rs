use super::{insert_extra_strings, insert_string};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminConfigUpdateInput {
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
    #[serde(default)]
    pub extra: BTreeMap<String, String>,
}

impl AdminConfigUpdateInput {
    pub fn to_update_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();

        insert_string(&mut payload, "cf_title", self.cf_title.clone());
        insert_string(&mut payload, "cf_admin", self.cf_admin.clone());
        insert_string(&mut payload, "cf_admin_email", self.cf_admin_email.clone());
        insert_string(
            &mut payload,
            "cf_admin_email_name",
            self.cf_admin_email_name.clone(),
        );
        insert_string(
            &mut payload,
            "cf_register_level",
            self.cf_register_level.clone(),
        );
        insert_string(
            &mut payload,
            "cf_register_point",
            self.cf_register_point.clone(),
        );
        insert_string(&mut payload, "cf_login_point", self.cf_login_point.clone());
        insert_string(&mut payload, "cf_use_point", self.cf_use_point.clone());
        insert_string(&mut payload, "cf_write_point", self.cf_write_point.clone());
        insert_string(
            &mut payload,
            "cf_comment_point",
            self.cf_comment_point.clone(),
        );
        insert_string(
            &mut payload,
            "cf_download_point",
            self.cf_download_point.clone(),
        );
        insert_string(&mut payload, "cf_read_point", self.cf_read_point.clone());
        insert_string(
            &mut payload,
            "cf_memo_send_point",
            self.cf_memo_send_point.clone(),
        );
        insert_string(
            &mut payload,
            "cf_use_email_certify",
            self.cf_use_email_certify.clone(),
        );
        insert_string(
            &mut payload,
            "cf_use_homepage",
            self.cf_use_homepage.clone(),
        );
        insert_string(
            &mut payload,
            "cf_req_homepage",
            self.cf_req_homepage.clone(),
        );
        insert_string(&mut payload, "cf_use_tel", self.cf_use_tel.clone());
        insert_string(&mut payload, "cf_req_tel", self.cf_req_tel.clone());
        insert_string(&mut payload, "cf_use_hp", self.cf_use_hp.clone());
        insert_string(&mut payload, "cf_req_hp", self.cf_req_hp.clone());
        insert_string(&mut payload, "cf_use_addr", self.cf_use_addr.clone());
        insert_string(&mut payload, "cf_req_addr", self.cf_req_addr.clone());
        insert_string(&mut payload, "cf_new_skin", self.cf_new_skin.clone());
        insert_string(&mut payload, "cf_search_skin", self.cf_search_skin.clone());
        insert_string(
            &mut payload,
            "cf_connect_skin",
            self.cf_connect_skin.clone(),
        );
        insert_string(&mut payload, "cf_faq_skin", self.cf_faq_skin.clone());
        insert_string(&mut payload, "cf_editor", self.cf_editor.clone());
        insert_string(&mut payload, "cf_member_skin", self.cf_member_skin.clone());
        insert_string(
            &mut payload,
            "cf_mobile_member_skin",
            self.cf_mobile_member_skin.clone(),
        );
        insert_string(&mut payload, "cf_captcha", self.cf_captcha.clone());
        insert_string(
            &mut payload,
            "cf_social_login_use",
            self.cf_social_login_use.clone(),
        );
        insert_extra_strings(&mut payload, &self.extra);

        payload
    }
}
