use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct ApiTraceMeta {
    #[serde(default)]
    pub request_id: Option<String>,
    #[serde(default)]
    pub correlation_id: Option<String>,
    #[serde(default)]
    pub server_request_id: Option<String>,
    #[serde(default)]
    pub server_time: Option<String>,
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub error_code: Option<String>,
    #[serde(default)]
    pub error_category: Option<String>,
    #[serde(default)]
    pub fault_domain: Option<String>,
    #[serde(default)]
    pub owner: Option<String>,
    #[serde(default)]
    pub retryable: Option<bool>,
    #[serde(default)]
    pub user_actionable: Option<bool>,
}

pub trait HasApiTraceMeta {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta>;
}

#[derive(Debug, Clone, Default)]
pub struct ResponseTrace {
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Clone)]
pub struct Traced<T> {
    pub value: T,
    pub trace: ResponseTrace,
}

impl<T> Traced<T> {
    pub fn new(value: T, trace: ResponseTrace) -> Self {
        Self { value, trace }
    }

    pub fn map<U, F>(self, map: F) -> Traced<U>
    where
        F: FnOnce(T) -> U,
    {
        Traced {
            value: map(self.value),
            trace: self.trace,
        }
    }

    pub fn into_parts(self) -> (T, ResponseTrace) {
        (self.value, self.trace)
    }
}

impl ResponseTrace {
    pub fn local(correlation_id: impl Into<String>) -> Self {
        let correlation_id = correlation_id.into();

        Self {
            request_id: correlation_id.clone(),
            correlation_id,
            server_request_id: None,
        }
    }

    pub fn from_api(
        default_correlation_id: impl Into<String>,
        header_correlation_id: Option<String>,
        header_server_request_id: Option<String>,
        meta: Option<&ApiTraceMeta>,
    ) -> Self {
        let default_correlation_id = default_correlation_id.into();
        let correlation_id = meta
            .and_then(|meta| {
                meta.correlation_id
                    .clone()
                    .or_else(|| meta.request_id.clone())
            })
            .or(header_correlation_id)
            .unwrap_or_else(|| default_correlation_id.clone());
        let server_request_id = meta
            .and_then(|meta| meta.server_request_id.clone())
            .or(header_server_request_id);

        Self {
            request_id: correlation_id.clone(),
            correlation_id,
            server_request_id,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct ErrorGuide {
    pub action: Option<String>,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProblemMeta {
    #[serde(default)]
    pub request_id: Option<String>,
    #[serde(default)]
    pub correlation_id: Option<String>,
    #[serde(default)]
    pub server_request_id: Option<String>,
    #[serde(default)]
    pub error_code: Option<String>,
    #[serde(default)]
    pub error_category: Option<String>,
    #[serde(default)]
    pub fault_domain: Option<String>,
    #[serde(default)]
    pub owner: Option<String>,
    #[serde(default)]
    pub retryable: Option<bool>,
    #[serde(default)]
    pub user_actionable: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProblemDetails {
    pub r#type: String,
    pub status: u16,
    pub title: String,
    pub detail: String,
    #[serde(default)]
    pub instance: Option<String>,
    #[serde(default)]
    pub request_id: Option<String>,
    #[serde(default)]
    pub correlation_id: Option<String>,
    #[serde(default)]
    pub server_request_id: Option<String>,
    #[serde(default)]
    pub error_code: Option<String>,
    #[serde(default)]
    pub error_category: Option<String>,
    #[serde(default)]
    pub fault_domain: Option<String>,
    #[serde(default)]
    pub owner: Option<String>,
    #[serde(default)]
    pub retryable: Option<bool>,
    #[serde(default)]
    pub user_actionable: Option<bool>,
    #[serde(default)]
    pub guide: Option<ErrorGuide>,
    #[serde(default)]
    pub meta: Option<ProblemMeta>,
    #[serde(default)]
    pub errors: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct AppErrorPayload {
    pub code: String,
    pub message: String,
    pub guide: Option<ErrorGuide>,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
    pub status: Option<u16>,
    pub target: Option<String>,
    pub detail: Option<String>,
    pub error_category: String,
    pub fault_domain: String,
    pub owner: String,
    pub retryable: bool,
    pub user_actionable: bool,
}

impl AppErrorPayload {
    pub fn trace(&self) -> ResponseTrace {
        ResponseTrace {
            request_id: self.request_id.clone(),
            correlation_id: self.correlation_id.clone(),
            server_request_id: self.server_request_id.clone(),
        }
    }
}
