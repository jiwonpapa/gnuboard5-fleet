use crate::models::member::MemberProfile;
use crate::models::trace::{ApiTraceMeta, HasApiTraceMeta, ResponseTrace};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AuthLoginInput {
    pub mb_id: String,
    pub mb_password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AuthSessionState {
    pub authenticated: bool,
    pub member: Option<MemberProfile>,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

impl AuthSessionState {
    pub fn authenticated(trace: ResponseTrace, member: MemberProfile) -> Self {
        Self {
            authenticated: true,
            member: Some(member),
            request_id: trace.request_id,
            correlation_id: trace.correlation_id,
            server_request_id: trace.server_request_id,
        }
    }

    pub fn unauthenticated(trace: ResponseTrace) -> Self {
        Self {
            authenticated: false,
            member: None,
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
pub struct CommandMessage {
    pub message: String,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenEnvelope {
    pub data: TokenPair,
    #[serde(default)]
    pub meta: ApiTraceMeta,
}

impl HasApiTraceMeta for TokenEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenPair {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogoutRequest {
    pub refresh_token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredSession {
    pub mb_id: String,
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: u64,
}

impl StoredSession {
    pub fn new(mb_id: String, tokens: TokenPair) -> Self {
        Self {
            mb_id,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_in: tokens.expires_in,
        }
    }

    pub fn with_tokens(self, tokens: TokenPair) -> Self {
        Self {
            mb_id: self.mb_id,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_in: tokens.expires_in,
        }
    }
}
