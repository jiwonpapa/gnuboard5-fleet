use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSystemPhpInfo {
    pub php_version: String,
    pub sapi: String,
    pub loaded_ini: Option<String>,
    pub scanned_ini: Option<String>,
    pub extension_count: i64,
    pub html: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSystemPhpInfoSummary {
    pub php_version: String,
    pub sapi: String,
    pub loaded_ini_configured: bool,
    pub scanned_ini_configured: bool,
    pub extension_count: i64,
    pub raw_html_withheld: bool,
}

impl AdminSystemPhpInfo {
    pub fn into_browser_safe_summary(self) -> AdminSystemPhpInfoSummary {
        AdminSystemPhpInfoSummary {
            php_version: self.php_version,
            sapi: self.sapi,
            loaded_ini_configured: self
                .loaded_ini
                .is_some_and(|value| !value.trim().is_empty()),
            scanned_ini_configured: self
                .scanned_ini
                .is_some_and(|value| !value.trim().is_empty()),
            extension_count: self.extension_count,
            raw_html_withheld: true,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSystemBrowscapStatus {
    pub available: bool,
    pub plugin_path: String,
    pub cache_directory: String,
    pub cache_file: String,
    pub cache_exists: bool,
    pub php_version: String,
    pub pending_visit_count: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated: Option<bool>,
    pub cache_mtime: Option<String>,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSystemBrowscapConvertRequest {
    pub rows: Option<u32>,
}

impl AdminSystemBrowscapConvertRequest {
    pub fn is_valid(&self) -> bool {
        self.rows.is_none_or(|rows| rows > 0)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSystemBrowscapConvertResult {
    pub rows: i64,
    pub total_pending_before: i64,
    pub processed_count: i64,
    pub remaining_count: i64,
    pub completed: bool,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum AdminSystemMaintenanceTask {
    CacheFiles,
    CaptchaFiles,
    MemberListFiles,
    SessionFiles,
    ThumbnailFiles,
}

impl AdminSystemMaintenanceTask {
    pub fn operation_id(self) -> &'static str {
        match self {
            Self::CacheFiles => "adminSystemPurgeCacheFiles",
            Self::CaptchaFiles => "adminSystemPurgeCaptchaFiles",
            Self::MemberListFiles => "adminSystemPurgeMemberListFiles",
            Self::SessionFiles => "adminSystemPurgeSessionFiles",
            Self::ThumbnailFiles => "adminSystemPurgeThumbnailFiles",
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AdminSystemMaintenanceResult {
    pub task: String,
    pub status: String,
    pub directory: String,
    pub deleted_count: i64,
    pub deleted_paths: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub social_log_deleted_count: Option<i64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn phpinfo_summary_never_contains_raw_html_or_paths() {
        let summary = AdminSystemPhpInfo {
            php_version: "8.3.0".into(),
            sapi: "fpm-fcgi".into(),
            loaded_ini: Some("/secret/php.ini".into()),
            scanned_ini: None,
            extension_count: 42,
            html: "<tr><td>AWS_SECRET_ACCESS_KEY</td><td>secret</td></tr>".into(),
        }
        .into_browser_safe_summary();

        let encoded = serde_json::to_string(&summary).unwrap();
        assert!(!encoded.contains("AWS_SECRET_ACCESS_KEY"));
        assert!(!encoded.contains("/secret/php.ini"));
        assert!(summary.loaded_ini_configured);
        assert!(summary.raw_html_withheld);
    }

    #[test]
    fn maintenance_tasks_map_to_canonical_operations() {
        assert_eq!(
            AdminSystemMaintenanceTask::SessionFiles.operation_id(),
            "adminSystemPurgeSessionFiles"
        );
        assert!(AdminSystemBrowscapConvertRequest { rows: Some(1) }.is_valid());
        assert!(!AdminSystemBrowscapConvertRequest { rows: Some(0) }.is_valid());
    }
}
