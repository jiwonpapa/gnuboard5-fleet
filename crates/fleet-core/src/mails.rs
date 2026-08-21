use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};

use crate::permissions::Pagination;

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMailListQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
}

impl AdminMailListQuery {
    pub fn is_valid(&self) -> bool {
        valid_page(self.page, self.per_page, 100)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMailTemplate {
    pub ma_id: i64,
    pub ma_subject: String,
    pub ma_content: String,
    pub ma_time: String,
    pub ma_ip: String,
    pub ma_last_option: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMailLastOption {
    pub mb_id1: i64,
    pub mb_id1_from: String,
    pub mb_id1_to: String,
    pub mb_email: String,
    pub mb_mailling: i64,
    pub mb_level_from: i64,
    pub mb_level_to: i64,
    pub gr_id: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMailDetail {
    pub ma_id: i64,
    pub ma_subject: String,
    pub ma_content: String,
    pub ma_time: String,
    pub ma_ip: String,
    pub ma_last_option: String,
    pub last_option: AdminMailLastOption,
    pub preview_html: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMailList {
    pub items: Vec<AdminMailTemplate>,
    pub pagination: Pagination,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMailTemplateWrite {
    pub ma_subject: String,
    pub ma_content: String,
}

impl AdminMailTemplateWrite {
    pub fn is_valid(&self) -> bool {
        bounded_nonempty(&self.ma_subject, 255) && bounded_nonempty(&self.ma_content, 1_000_000)
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMailRecipientQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub search: Option<String>,
    pub level_min: Option<u8>,
    pub level_max: Option<u8>,
    pub gr_id: Option<String>,
    pub member_id_from: Option<String>,
    pub member_id_to: Option<String>,
    pub email_contains: Option<String>,
    #[serde(default)]
    pub mailling_only: bool,
}

impl AdminMailRecipientQuery {
    pub fn is_valid(&self) -> bool {
        valid_page(self.page, self.per_page, 1_000)
            && valid_level_range(self.level_min, self.level_max)
            && optional_bounded(&self.search, 255)
            && optional_identifier(&self.gr_id)
            && optional_member_id(&self.member_id_from)
            && optional_member_id(&self.member_id_to)
            && optional_bounded(&self.email_contains, 255)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMailRecipient {
    pub mb_id: String,
    pub mb_name: String,
    pub mb_nick: String,
    pub mb_email: String,
    pub mb_level: i64,
    pub mb_mailling: i64,
    pub mb_datetime: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMailRecipientList {
    pub items: Vec<AdminMailRecipient>,
    pub pagination: Pagination,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AdminMailTargetType {
    All,
    Level,
    Group,
    Member,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMailSendRequest {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ma_id: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub subject: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    pub target_type: AdminMailTargetType,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub level_min: Option<u8>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub level_max: Option<u8>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub gr_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub member_id_from: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub member_id_to: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub email_contains: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub mb_ids: Vec<String>,
    #[serde(default)]
    pub mailling_only: bool,
    #[serde(default)]
    pub dry_run: bool,
}

impl AdminMailSendRequest {
    pub fn is_valid(&self) -> bool {
        valid_mail_source(self.ma_id, &self.subject, &self.content)
            && valid_level_range(self.level_min, self.level_max)
            && optional_identifier(&self.gr_id)
            && optional_member_id(&self.member_id_from)
            && optional_member_id(&self.member_id_to)
            && optional_bounded(&self.email_contains, 255)
            && unique_member_ids(&self.mb_ids)
            && match self.target_type {
                AdminMailTargetType::Group => {
                    self.gr_id.as_ref().is_some_and(|value| !value.is_empty())
                }
                AdminMailTargetType::Member => !self.mb_ids.is_empty(),
                _ => true,
            }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMailSendTarget {
    pub mb_id: String,
    pub mb_email: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMailSendResult {
    pub ma_id: Option<i64>,
    pub template_used: bool,
    pub target_count: i64,
    pub sent_count: i64,
    pub skipped_count: i64,
    pub mail_enabled: bool,
    pub dry_run: bool,
    pub targets: Vec<AdminMailSendTarget>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMailTestRequest {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ma_id: Option<i64>,
    pub to: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub subject: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
}

impl AdminMailTestRequest {
    pub fn is_valid(&self) -> bool {
        valid_email(&self.to) && valid_mail_source(self.ma_id, &self.subject, &self.content)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminMailTestResult {
    pub ma_id: Option<i64>,
    pub template_used: bool,
    pub mail_enabled: bool,
    pub sent: bool,
    pub to: String,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSystemMailRecipientQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub search: Option<String>,
}

impl AdminSystemMailRecipientQuery {
    pub fn is_valid(&self) -> bool {
        valid_page(self.page, self.per_page, 1_000) && optional_bounded(&self.search, 255)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSystemMailTemplate {
    pub ma_id: i64,
    pub ma_subject: String,
    pub ma_time: String,
    pub ma_ip: String,
    pub ma_last_option: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSystemMailTemplateList {
    pub items: Vec<AdminSystemMailTemplate>,
    pub pagination: Pagination,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSystemMailRecipient {
    pub mb_id: String,
    pub mb_name: String,
    pub mb_nick: String,
    pub mb_email: String,
    pub mb_level: i64,
    pub mb_mailling: i64,
    pub mb_today_login: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSystemMailRecipientList {
    pub items: Vec<AdminSystemMailRecipient>,
    pub pagination: Pagination,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSystemMailTestRequest {
    pub to: String,
    pub subject: String,
    pub content: String,
}

impl AdminSystemMailTestRequest {
    pub fn is_valid(&self) -> bool {
        valid_email(&self.to)
            && bounded_nonempty(&self.subject, 255)
            && bounded_nonempty(&self.content, 1_000_000)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSystemMailTestResult {
    pub sent: bool,
    pub mail_log_id: i64,
    pub to: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSystemMailSendRequest {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ma_id: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub subject: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    pub mb_ids: Vec<String>,
    #[serde(default)]
    pub mailling_only: bool,
    #[serde(default)]
    pub dry_run: bool,
}

impl AdminSystemMailSendRequest {
    pub fn is_valid(&self) -> bool {
        valid_mail_source(self.ma_id, &self.subject, &self.content)
            && unique_member_ids(&self.mb_ids)
            && !self.mb_ids.is_empty()
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSystemMailSendRecipient {
    pub mb_id: String,
    pub mb_email: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSystemMailSendResult {
    pub mail_log_id: i64,
    pub target_count: i64,
    pub sent_count: i64,
    pub skipped_count: i64,
    pub mail_enabled: bool,
    pub dry_run: bool,
    pub recipients: Vec<AdminSystemMailSendRecipient>,
}

pub fn valid_mail_id(mail_id: i64) -> bool {
    mail_id > 0
}

fn valid_page(page: Option<u32>, per_page: Option<u32>, max_per_page: u32) -> bool {
    page.is_none_or(|value| value > 0)
        && per_page.is_none_or(|value| (1..=max_per_page).contains(&value))
}

fn valid_level_range(min: Option<u8>, max: Option<u8>) -> bool {
    min.is_none_or(|value| (1..=10).contains(&value))
        && max.is_none_or(|value| (1..=10).contains(&value))
        && match (min, max) {
            (Some(min), Some(max)) => min <= max,
            _ => true,
        }
}

fn valid_mail_source(
    ma_id: Option<i64>,
    subject: &Option<String>,
    content: &Option<String>,
) -> bool {
    ma_id.is_none_or(valid_mail_id)
        && (ma_id.is_some()
            || (subject
                .as_ref()
                .is_some_and(|value| bounded_nonempty(value, 255))
                && content
                    .as_ref()
                    .is_some_and(|value| bounded_nonempty(value, 1_000_000))))
        && subject
            .as_ref()
            .is_none_or(|value| bounded_nonempty(value, 255))
        && content
            .as_ref()
            .is_none_or(|value| bounded_nonempty(value, 1_000_000))
}

fn bounded_nonempty(value: &str, max: usize) -> bool {
    !value.trim().is_empty() && value.len() <= max
}

fn optional_bounded(value: &Option<String>, max: usize) -> bool {
    value.as_ref().is_none_or(|value| value.len() <= max)
}

fn optional_identifier(value: &Option<String>) -> bool {
    value.as_ref().is_none_or(|value| {
        (1..=20).contains(&value.len())
            && value
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_')
    })
}

fn optional_member_id(value: &Option<String>) -> bool {
    value.as_ref().is_none_or(|value| valid_member_id(value))
}

fn valid_member_id(value: &str) -> bool {
    (3..=20).contains(&value.len())
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_')
}

fn unique_member_ids(values: &[String]) -> bool {
    values.iter().all(|value| valid_member_id(value))
        && values.iter().collect::<BTreeSet<_>>().len() == values.len()
}

fn valid_email(value: &str) -> bool {
    let value = value.trim();
    value.len() <= 254
        && value.split_once('@').is_some_and(|(local, domain)| {
            !local.is_empty()
                && domain.contains('.')
                && !domain.starts_with('.')
                && !domain.ends_with('.')
                && !value.bytes().any(|byte| byte.is_ascii_whitespace())
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mail_template_and_recipient_inputs_fail_closed() {
        assert!(
            AdminMailTemplateWrite {
                ma_subject: "운영 공지".into(),
                ma_content: "본문".into(),
            }
            .is_valid()
        );
        assert!(
            !AdminMailTemplateWrite {
                ma_subject: " ".into(),
                ma_content: "본문".into(),
            }
            .is_valid()
        );
        assert!(
            AdminMailRecipientQuery {
                level_min: Some(2),
                level_max: Some(7),
                gr_id: Some("staff".into()),
                ..Default::default()
            }
            .is_valid()
        );
        assert!(
            !AdminMailRecipientQuery {
                level_min: Some(9),
                level_max: Some(2),
                ..Default::default()
            }
            .is_valid()
        );
    }

    #[test]
    fn send_inputs_preserve_dry_run_and_exact_member_targets() {
        let request = AdminMailSendRequest {
            ma_id: Some(7),
            subject: None,
            content: None,
            target_type: AdminMailTargetType::Member,
            level_min: None,
            level_max: None,
            gr_id: None,
            member_id_from: None,
            member_id_to: None,
            email_contains: None,
            mb_ids: vec!["fleetcert".into()],
            mailling_only: true,
            dry_run: true,
        };
        assert!(request.is_valid());
        assert!(request.dry_run);
        assert!(
            !AdminMailSendRequest {
                mb_ids: vec![],
                ..request
            }
            .is_valid()
        );
    }

    #[test]
    fn system_send_payload_uses_exact_contract_fields() {
        let request = AdminSystemMailSendRequest {
            ma_id: Some(7),
            subject: None,
            content: None,
            mb_ids: vec!["fleetcert".into()],
            mailling_only: true,
            dry_run: true,
        };
        assert!(request.is_valid());
        let payload = serde_json::to_value(&request).expect("serialize system mail");
        assert_eq!(payload["ma_id"], 7);
        assert_eq!(payload["mb_ids"], serde_json::json!(["fleetcert"]));
        assert_eq!(payload["dry_run"], true);
        assert!(payload.get("subject").is_none());
        assert!(payload.get("content").is_none());
    }

    #[test]
    fn test_mail_requires_bounded_email_subject_and_content() {
        assert!(
            AdminSystemMailTestRequest {
                to: "fleet-cert@example.invalid".into(),
                subject: "테스트".into(),
                content: "본문".into(),
            }
            .is_valid()
        );
        assert!(
            !AdminSystemMailTestRequest {
                to: "invalid".into(),
                subject: "테스트".into(),
                content: "본문".into(),
            }
            .is_valid()
        );
    }
}
