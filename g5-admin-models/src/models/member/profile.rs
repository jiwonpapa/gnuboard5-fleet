use crate::models::trace::{ApiTraceMeta, HasApiTraceMeta};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct MemberProfile {
    pub mb_id: String,
    pub mb_name: Option<String>,
    pub mb_nick: Option<String>,
    pub mb_email: Option<String>,
    pub mb_level: Option<i32>,
    pub mb_point: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct MemberProfileResponse {
    pub member: MemberProfile,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemberEnvelope {
    pub data: MemberProfile,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for MemberEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}
