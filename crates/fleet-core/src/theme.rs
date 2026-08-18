use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminThemeConfig {
    pub cf_theme: String,
    pub cf_mobile_theme: String,
    pub cf_theme_installed: bool,
    pub cf_mobile_theme_installed: bool,
    pub installed_count: i64,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminThemeUpdate {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cf_theme: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cf_mobile_theme: Option<String>,
}

impl AdminThemeUpdate {
    pub fn is_valid(&self) -> bool {
        (self.cf_theme.is_some() || self.cf_mobile_theme.is_some())
            && self.cf_theme.as_deref().is_none_or(valid_theme_id_or_empty)
            && self
                .cf_mobile_theme
                .as_deref()
                .is_none_or(valid_theme_id_or_empty)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminTheme {
    pub id: String,
    pub path: String,
    pub theme_name: String,
    pub theme_uri: String,
    pub maker: String,
    pub maker_uri: String,
    pub version: String,
    pub detail: String,
    pub license: String,
    pub license_uri: String,
    pub readme_path: Option<String>,
    pub theme_config_path: Option<String>,
    pub screenshot_path: Option<String>,
    pub set_default_skin: bool,
    pub preview_board_skin: String,
    pub preview_mobile_board_skin: String,
    pub is_active: bool,
    pub is_mobile_active: bool,
    pub theme_config: BTreeMap<String, Value>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminThemeList {
    pub items: Vec<AdminTheme>,
    pub total: i64,
}

pub fn valid_theme_id(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 255
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
}

pub fn valid_theme_id_or_empty(value: &str) -> bool {
    value.is_empty() || valid_theme_id(value)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn theme_update_requires_a_valid_changed_field() {
        assert!(!AdminThemeUpdate::default().is_valid());
        assert!(
            AdminThemeUpdate {
                cf_theme: Some("basic".into()),
                cf_mobile_theme: Some(String::new()),
            }
            .is_valid()
        );
        assert!(
            !AdminThemeUpdate {
                cf_theme: Some("../escape".into()),
                cf_mobile_theme: None,
            }
            .is_valid()
        );
    }

    #[test]
    fn theme_id_is_fail_closed() {
        assert!(valid_theme_id("theme-basic_2"));
        assert!(!valid_theme_id(""));
        assert!(!valid_theme_id("theme/basic"));
        assert!(!valid_theme_id("한글테마"));
    }
}
