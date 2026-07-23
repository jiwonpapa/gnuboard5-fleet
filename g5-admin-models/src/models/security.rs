use crate::models::trace::ResponseTrace;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct SecuritySettings {
    pub fast_unlock_available: bool,
    pub fast_unlock_enabled: bool,
    pub idle_timeout_minutes: Option<u32>,
    pub totp_enabled: bool,
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
pub struct FastUnlockStatus {
    pub available: bool,
    pub enabled: bool,
    pub label: String,
    pub error: Option<String>,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

impl FastUnlockStatus {
    pub fn from_parts(
        trace: ResponseTrace,
        available: bool,
        enabled: bool,
        label: String,
        error: Option<String>,
    ) -> Self {
        Self {
            available,
            enabled,
            label,
            error,
            request_id: trace.request_id,
            correlation_id: trace.correlation_id,
            server_request_id: trace.server_request_id,
        }
    }
}

impl SecuritySettings {
    pub fn from_parts(
        trace: ResponseTrace,
        idle_timeout_minutes: Option<u32>,
        totp_enabled: bool,
    ) -> Self {
        Self {
            fast_unlock_available: false,
            fast_unlock_enabled: false,
            idle_timeout_minutes,
            totp_enabled,
            request_id: trace.request_id,
            correlation_id: trace.correlation_id,
            server_request_id: trace.server_request_id,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct SecurityStepUpAuthInput {
    pub current_password: String,
    pub current_totp_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct MasterPasswordChangeInput {
    pub current_password: String,
    pub current_totp_code: Option<String>,
    pub new_password: String,
    pub new_password_confirm: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct SecurityIdleTimeoutUpdateInput {
    pub idle_timeout_minutes: Option<u32>,
    pub auth: SecurityStepUpAuthInput,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct TotpSetupStartInput {
    pub current_password: String,
    pub current_totp_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct TotpEnrollmentChallenge {
    pub manual_entry_key: String,
    pub otpauth_uri: String,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

impl TotpEnrollmentChallenge {
    pub fn from_parts(trace: ResponseTrace, manual_entry_key: String, otpauth_uri: String) -> Self {
        Self {
            manual_entry_key,
            otpauth_uri,
            request_id: trace.request_id,
            correlation_id: trace.correlation_id,
            server_request_id: trace.server_request_id,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct TotpVerifyEnableInput {
    pub code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct TotpDisableInput {
    pub current_password: String,
    pub current_totp_code: Option<String>,
}
