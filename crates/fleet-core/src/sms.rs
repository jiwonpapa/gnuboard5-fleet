use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
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

impl AdminSmsConfig {
    pub fn browser_safe(mut self) -> Self {
        self.cf_icode_pw = None;
        self.cf_icode_token_key = None;
        self
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsConfigUpdate {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cf_sms_use: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cf_sms_type: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cf_icode_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cf_icode_pw: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cf_icode_server_ip: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cf_icode_server_port: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cf_icode_token_key: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cf_phone: Option<String>,
}

impl AdminSmsConfigUpdate {
    pub fn is_valid(&self) -> bool {
        self.field_count() > 0
            && self
                .cf_sms_use
                .as_deref()
                .is_none_or(|value| matches!(value, "" | "icode"))
            && self
                .cf_sms_type
                .as_deref()
                .is_none_or(|value| matches!(value, "" | "LMS"))
            && optional_bounded(&self.cf_icode_id, 255)
            && optional_bounded(&self.cf_icode_pw, 1_024)
            && optional_bounded(&self.cf_icode_server_ip, 255)
            && optional_bounded(&self.cf_icode_token_key, 4_096)
            && self
                .cf_icode_server_port
                .as_deref()
                .is_none_or(valid_server_port)
            && self.cf_phone.as_deref().is_none_or(valid_callback_phone)
    }

    fn field_count(&self) -> usize {
        [
            self.cf_sms_use.as_ref(),
            self.cf_sms_type.as_ref(),
            self.cf_icode_id.as_ref(),
            self.cf_icode_pw.as_ref(),
            self.cf_icode_server_ip.as_ref(),
            self.cf_icode_server_port.as_ref(),
            self.cf_icode_token_key.as_ref(),
            self.cf_phone.as_ref(),
        ]
        .into_iter()
        .flatten()
        .count()
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsMemberSyncSummary {
    pub total_members: i64,
    pub leave_members: i64,
    pub phone_empty: i64,
    pub phone_valid: i64,
    pub phone_invalid: i64,
    pub receipt_enabled: i64,
    pub receipt_disabled: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSmsMemberSyncResult {
    pub datetime: Option<String>,
    pub summary: AdminSmsMemberSyncSummary,
}

fn optional_bounded(value: &Option<String>, max: usize) -> bool {
    value.as_ref().is_none_or(|value| value.len() <= max)
}

fn valid_server_port(value: &str) -> bool {
    !value.is_empty()
        && value.bytes().all(|byte| byte.is_ascii_digit())
        && value.parse::<u16>().is_ok_and(|port| port > 0)
}

fn valid_callback_phone(value: &str) -> bool {
    let digits = value
        .bytes()
        .filter(u8::is_ascii_digit)
        .map(char::from)
        .collect::<String>();
    if digits.len() < 8 || digits.len() > 12 {
        return false;
    }
    if digits.starts_with("1588") && digits.len() != 8 {
        return false;
    }
    if digits.starts_with("02") && !matches!(digits.len(), 9 | 10) {
        return false;
    }
    if digits.starts_with("030") && !matches!(digits.len(), 10 | 11) {
        return false;
    }
    if digits.starts_with("010000") || digits.starts_with("02000") {
        return false;
    }
    digits.starts_with("02")
        || digits.starts_with("030")
        || digits.starts_with("070")
        || digits.starts_with("080")
        || digits.starts_with("007")
        || digits.starts_with("010")
        || digits.starts_with("011")
        || digits.starts_with("013")
        || digits.starts_with("015")
        || digits.starts_with("016")
        || digits.starts_with("017")
        || digits.starts_with("018")
        || digits.starts_with("019")
        || digits.starts_with("031")
        || digits.starts_with("032")
        || digits.starts_with("033")
        || digits.starts_with("041")
        || digits.starts_with("042")
        || digits.starts_with("043")
        || digits.starts_with("044")
        || digits.starts_with("051")
        || digits.starts_with("052")
        || digits.starts_with("053")
        || digits.starts_with("054")
        || digits.starts_with("055")
        || digits.starts_with("061")
        || digits.starts_with("062")
        || digits.starts_with("063")
        || digits.starts_with("064")
        || digits.starts_with("15")
        || digits.starts_with("16")
        || digits.starts_with("18")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn config_update_requires_a_valid_changed_field() {
        assert!(!AdminSmsConfigUpdate::default().is_valid());
        assert!(
            AdminSmsConfigUpdate {
                cf_phone: Some("02-1234-5678".into()),
                ..Default::default()
            }
            .is_valid()
        );
        assert!(
            !AdminSmsConfigUpdate {
                cf_icode_server_port: Some("not-a-port".into()),
                ..Default::default()
            }
            .is_valid()
        );
        assert!(
            !AdminSmsConfigUpdate {
                cf_sms_use: Some("other".into()),
                ..Default::default()
            }
            .is_valid()
        );
    }

    #[test]
    fn browser_config_never_exposes_provider_secrets() {
        let config = AdminSmsConfig {
            cf_title: Some("Fleet".into()),
            cf_sms_use: Some("icode".into()),
            cf_sms_type: Some("LMS".into()),
            cf_icode_id: Some("provider-user".into()),
            cf_icode_pw: Some("password".into()),
            cf_icode_server_ip: Some("121.78.96.124".into()),
            cf_icode_server_port: Some("7295".into()),
            cf_icode_token_key: Some("token".into()),
            cf_phone: Some("02-1234-5678".into()),
            cf_datetime: None,
            provider_ready: true,
            uses_token_key: true,
            uses_legacy_credentials: true,
            storage_ready: true,
            missing_tables: vec![],
        }
        .browser_safe();
        assert_eq!(config.cf_icode_pw, None);
        assert_eq!(config.cf_icode_token_key, None);
        assert!(config.uses_token_key);
    }
}
