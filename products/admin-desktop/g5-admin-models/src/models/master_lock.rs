use crate::models::trace::ResponseTrace;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct MasterLockStatus {
    pub is_configured: bool,
    pub is_unlocked: bool,
    pub passkey_enabled: bool,
    pub totp_enabled: bool,
    pub requires_totp: bool,
    pub unlock_retry_after_seconds: Option<u64>,
    pub unlock_locked_until_epoch: Option<u64>,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

impl MasterLockStatus {
    #[allow(
        clippy::too_many_arguments,
        reason = "the constructor mirrors the complete serialized lock status contract"
    )]
    pub fn from_parts(
        trace: ResponseTrace,
        is_configured: bool,
        is_unlocked: bool,
        passkey_enabled: bool,
        totp_enabled: bool,
        requires_totp: bool,
        unlock_retry_after_seconds: Option<u64>,
        unlock_locked_until_epoch: Option<u64>,
    ) -> Self {
        Self {
            is_configured,
            is_unlocked,
            passkey_enabled,
            totp_enabled,
            requires_totp,
            unlock_retry_after_seconds,
            unlock_locked_until_epoch,
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
pub struct MasterLockSetupInput {
    pub password: String,
    pub password_confirm: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct MasterLockUnlockInput {
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct MasterLockTotpInput {
    pub code: String,
}
