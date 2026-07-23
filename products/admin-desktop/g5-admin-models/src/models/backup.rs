use crate::models::security::SecurityStepUpAuthInput;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct SiteBackupExportInput {
    pub path: String,
    pub auth: SecurityStepUpAuthInput,
    pub backup_password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct SiteBackupImportInput {
    pub path: String,
    pub auth: SecurityStepUpAuthInput,
    pub backup_password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct SiteBackupExportResult {
    pub path: String,
    pub site_count: usize,
    pub copied_bytes: u64,
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
pub struct SiteBackupImportResult {
    pub path: String,
    pub imported_site_count: usize,
    pub reused_site_count: usize,
    pub copied_setting_count: usize,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}
