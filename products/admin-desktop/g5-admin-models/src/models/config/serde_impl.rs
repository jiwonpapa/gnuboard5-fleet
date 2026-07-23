use super::{collect_extra_scalars, read_string_like, AdminConfig};
use serde::de::Deserializer;
use serde::Deserialize;
use serde_json::{Map, Value};

impl<'de> Deserialize<'de> for AdminConfig {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let mut raw = Map::<String, Value>::deserialize(deserializer)?;

        Ok(Self {
            cf_title: read_string_like::<D::Error>(&mut raw, "cf_title")?,
            cf_admin: read_string_like::<D::Error>(&mut raw, "cf_admin")?,
            cf_admin_email: read_string_like::<D::Error>(&mut raw, "cf_admin_email")?,
            cf_admin_email_name: read_string_like::<D::Error>(&mut raw, "cf_admin_email_name")?,
            cf_register_level: read_string_like::<D::Error>(&mut raw, "cf_register_level")?,
            cf_register_point: read_string_like::<D::Error>(&mut raw, "cf_register_point")?,
            cf_login_point: read_string_like::<D::Error>(&mut raw, "cf_login_point")?,
            cf_use_point: read_string_like::<D::Error>(&mut raw, "cf_use_point")?,
            cf_write_point: read_string_like::<D::Error>(&mut raw, "cf_write_point")?,
            cf_comment_point: read_string_like::<D::Error>(&mut raw, "cf_comment_point")?,
            cf_download_point: read_string_like::<D::Error>(&mut raw, "cf_download_point")?,
            cf_read_point: read_string_like::<D::Error>(&mut raw, "cf_read_point")?,
            cf_memo_send_point: read_string_like::<D::Error>(&mut raw, "cf_memo_send_point")?,
            cf_use_email_certify: read_string_like::<D::Error>(&mut raw, "cf_use_email_certify")?,
            cf_use_homepage: read_string_like::<D::Error>(&mut raw, "cf_use_homepage")?,
            cf_req_homepage: read_string_like::<D::Error>(&mut raw, "cf_req_homepage")?,
            cf_use_tel: read_string_like::<D::Error>(&mut raw, "cf_use_tel")?,
            cf_req_tel: read_string_like::<D::Error>(&mut raw, "cf_req_tel")?,
            cf_use_hp: read_string_like::<D::Error>(&mut raw, "cf_use_hp")?,
            cf_req_hp: read_string_like::<D::Error>(&mut raw, "cf_req_hp")?,
            cf_use_addr: read_string_like::<D::Error>(&mut raw, "cf_use_addr")?,
            cf_req_addr: read_string_like::<D::Error>(&mut raw, "cf_req_addr")?,
            cf_new_skin: read_string_like::<D::Error>(&mut raw, "cf_new_skin")?,
            cf_search_skin: read_string_like::<D::Error>(&mut raw, "cf_search_skin")?,
            cf_connect_skin: read_string_like::<D::Error>(&mut raw, "cf_connect_skin")?,
            cf_faq_skin: read_string_like::<D::Error>(&mut raw, "cf_faq_skin")?,
            cf_editor: read_string_like::<D::Error>(&mut raw, "cf_editor")?,
            cf_member_skin: read_string_like::<D::Error>(&mut raw, "cf_member_skin")?,
            cf_mobile_member_skin: read_string_like::<D::Error>(&mut raw, "cf_mobile_member_skin")?,
            cf_captcha: read_string_like::<D::Error>(&mut raw, "cf_captcha")?,
            cf_social_login_use: read_string_like::<D::Error>(&mut raw, "cf_social_login_use")?,
            extra: collect_extra_scalars::<D::Error>(&raw)?,
        })
    }
}
