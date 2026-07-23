mod auth;
mod error;
mod member_profile;
mod problem;
mod request;
mod request_headers;
mod request_io;

use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;

pub use error::{ApiClientError, ApiFailure};

const CONNECT_TIMEOUT_SECS: u64 = 5;
const REQUEST_TIMEOUT_SECS: u64 = 15;

pub struct RequestConfig<'a, Q: ?Sized, B: ?Sized> {
    pub query: Option<&'a Q>,
    pub body: Option<&'a B>,
    pub access_token: Option<&'a str>,
    pub retryable: bool,
}

#[derive(Debug, Clone)]
pub struct MultipartFileUpload {
    pub field_name: String,
    pub file_name: String,
    pub mime_type: String,
    pub bytes: Vec<u8>,
}

pub(crate) struct ApiTextResponse {
    pub body_text: String,
    pub header_correlation_id: Option<String>,
    pub header_server_request_id: Option<String>,
}

pub type RequestContractValidator = fn(
    method: &str,
    target: &str,
    media_type: Option<&str>,
    query: Option<&serde_json::Value>,
    body: Option<&serde_json::Value>,
) -> Result<(), String>;

pub type ResponseContractValidator = fn(
    method: &str,
    target: &str,
    status: u16,
    media_type: Option<&str>,
    body_text: &str,
) -> Result<(), String>;

#[derive(Debug, Clone, Copy)]
pub struct WireContractValidator {
    pub validate_request: RequestContractValidator,
    pub validate_response: ResponseContractValidator,
}

#[derive(Clone)]
pub struct TransportClient {
    base_url: Arc<RwLock<Option<String>>>,
    client: reqwest::Client,
    wire_contract: Option<WireContractValidator>,
}

impl TransportClient {
    pub fn new(raw_base_url: Option<impl Into<String>>) -> Result<Self, ApiClientError> {
        Self::new_with_wire_contract_and_resolve(raw_base_url, None, None)
    }

    pub fn new_with_wire_contract(
        raw_base_url: Option<impl Into<String>>,
        wire_contract: Option<WireContractValidator>,
    ) -> Result<Self, ApiClientError> {
        Self::new_with_wire_contract_and_resolve(raw_base_url, wire_contract, None)
    }

    pub fn new_with_wire_contract_and_resolve(
        raw_base_url: Option<impl Into<String>>,
        wire_contract: Option<WireContractValidator>,
        resolve: Option<(&str, SocketAddr)>,
    ) -> Result<Self, ApiClientError> {
        let mut client_builder = reqwest::Client::builder()
            .connect_timeout(Duration::from_secs(CONNECT_TIMEOUT_SECS))
            .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS));
        if let Some((host, address)) = resolve {
            client_builder = client_builder.resolve(host, address);
        }
        let client = client_builder
            .build()
            .map_err(|error| ApiClientError::Config {
                message: format!("failed to build reqwest client: {error}"),
            })?;

        let base_url = raw_base_url
            .map(|value| normalize_base_url(value.into()))
            .transpose()?;
        if let Some(current_base_url) = base_url.as_deref() {
            tracing::info!(
                component = "g5_admin::transport",
                operation = "bootstrap",
                target = "api_base_url",
                base_url = %current_base_url,
                "initialized API transport client"
            );
        }

        Ok(Self {
            base_url: Arc::new(RwLock::new(base_url)),
            client,
            wire_contract,
        })
    }

    pub async fn set_base_url(&self, raw_base_url: Option<String>) -> Result<(), ApiClientError> {
        *self.base_url.write().await = raw_base_url.map(normalize_base_url).transpose()?;
        Ok(())
    }

    pub async fn current_base_url(&self) -> Option<String> {
        self.base_url.read().await.clone()
    }
}

fn normalize_base_url(raw_base_url: String) -> Result<String, ApiClientError> {
    let base_url = raw_base_url.trim().trim_end_matches('/').to_string();
    if base_url.is_empty() {
        return Err(ApiClientError::Config {
            message: "API base URL must not be empty".to_string(),
        });
    }

    Ok(base_url)
}
