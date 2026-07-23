use super::{insert_optional_i32, insert_optional_string};
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
pub struct AdminSystemMailListQuery {
    pub page: i32,
    pub per_page: i32,
}

impl Default for AdminSystemMailListQuery {
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
pub struct AdminSystemMailTemplate {
    pub ma_id: i32,
    pub ma_subject: String,
    pub ma_time: String,
    pub ma_ip: String,
    pub ma_last_option: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSystemMailTemplateListResponse {
    pub data: Vec<AdminSystemMailTemplate>,
    pub pagination: Pagination,
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminSystemMailTemplateListResponse {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSystemMailRecipientQuery {
    pub page: i32,
    pub per_page: i32,
    pub search: Option<String>,
}

impl Default for AdminSystemMailRecipientQuery {
    fn default() -> Self {
        Self {
            page: 1,
            per_page: 20,
            search: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSystemMailRecipient {
    pub mb_id: String,
    pub mb_name: String,
    pub mb_nick: String,
    pub mb_email: String,
    pub mb_level: i32,
    pub mb_mailling: i32,
    pub mb_today_login: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSystemMailRecipientListResponse {
    pub data: Vec<AdminSystemMailRecipient>,
    pub pagination: Pagination,
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminSystemMailRecipientListResponse {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSystemMailSendRequest {
    pub ma_id: Option<i32>,
    pub subject: Option<String>,
    pub content: Option<String>,
    pub mb_ids: Vec<String>,
    pub mailling_only: bool,
    pub dry_run: bool,
}

impl AdminSystemMailSendRequest {
    pub fn to_payload(&self) -> Map<String, Value> {
        let mut payload = Map::new();
        insert_optional_i32(&mut payload, "ma_id", self.ma_id);
        insert_optional_string(&mut payload, "subject", self.subject.clone());
        insert_optional_string(&mut payload, "content", self.content.clone());
        payload.insert(
            "mb_ids".to_string(),
            Value::Array(
                self.mb_ids
                    .iter()
                    .map(|member_id| Value::String(member_id.clone()))
                    .collect(),
            ),
        );
        payload.insert("mailling_only".to_string(), Value::Bool(self.mailling_only));
        payload.insert("dry_run".to_string(), Value::Bool(self.dry_run));
        payload
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSystemMailSendRecipient {
    pub mb_id: String,
    pub mb_email: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSystemMailSendResult {
    pub mail_log_id: i32,
    pub target_count: i32,
    pub sent_count: i32,
    pub skipped_count: i32,
    pub mail_enabled: bool,
    pub dry_run: bool,
    pub recipients: Vec<AdminSystemMailSendRecipient>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AdminSystemMailSendResponse {
    pub data: AdminSystemMailSendResult,
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for AdminSystemMailSendResponse {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[cfg(test)]
mod tests {
    use super::AdminSystemMailSendRequest;

    #[test]
    fn system_mail_send_payload_preserves_exact_contract_fields() {
        let payload = AdminSystemMailSendRequest {
            ma_id: Some(7),
            subject: None,
            content: None,
            mb_ids: vec!["neo1".to_string()],
            mailling_only: true,
            dry_run: false,
        }
        .to_payload();

        assert_eq!(payload.get("ma_id"), Some(&serde_json::json!(7)));
        assert_eq!(payload.get("mb_ids"), Some(&serde_json::json!(["neo1"])));
        assert_eq!(payload.get("mailling_only"), Some(&serde_json::json!(true)));
        assert_eq!(payload.get("dry_run"), Some(&serde_json::json!(false)));
        assert!(!payload.contains_key("subject"));
        assert!(!payload.contains_key("content"));
    }
}
