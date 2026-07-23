use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct DebugRuntimeInfo {
    pub active_site_id: Option<String>,
    pub active_site_name: Option<String>,
    pub api_base_url: Option<String>,
    pub database_path: String,
    pub debug_build: bool,
    pub debug_overlay: bool,
    pub session_storage: String,
    pub session_storage_target: String,
    pub log_file_path: String,
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
pub struct DebugLogTailResponse {
    pub lines: Vec<String>,
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
pub struct DebugDevBootstrapStatus {
    pub available: bool,
    pub debug_overlay: bool,
    pub has_master_password: bool,
    pub has_site: bool,
    pub has_site_auth: bool,
    pub site_name: Option<String>,
    pub ssh_profile_count: u32,
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
pub struct DebugDevBootstrapResult {
    pub master_lock_configured: bool,
    pub master_lock_unlocked: bool,
    pub site_id: Option<String>,
    pub site_name: Option<String>,
    pub site_login_mb_id: Option<String>,
    pub site_login_authenticated: bool,
    pub created_ssh_profile_count: u32,
    pub updated_ssh_profile_count: u32,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}
