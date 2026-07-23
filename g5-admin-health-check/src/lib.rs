use g5_admin_error_contract::ResponseTrace;
use std::time::Duration;
use thiserror::Error;
use uuid::Uuid;

mod probe;

use probe::{build_transport_failure_message, probe_api_candidate, ApiHealthProbeFailure};

const HEALTH_CHECK_CONNECT_TIMEOUT: Duration = Duration::from_secs(3);
const HEALTH_CHECK_REQUEST_TIMEOUT: Duration = Duration::from_secs(4);
const HEALTH_CHECK_RETRY_WINDOW: Duration = Duration::from_secs(15);
const HEALTH_CHECK_RETRY_INTERVAL: Duration = Duration::from_millis(750);

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HealthCheckResult {
    pub reachable: bool,
    pub resolved_url: Option<String>,
    pub message: String,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

#[derive(Debug, Error)]
pub enum HealthCheckError {
    #[error("{message}")]
    Config { request_id: String, message: String },
}

impl HealthCheckError {
    pub fn request_id(&self) -> &str {
        match self {
            Self::Config { request_id, .. } => request_id,
        }
    }
}

pub async fn perform_health_check(raw_url: &str) -> Result<HealthCheckResult, HealthCheckError> {
    perform_health_check_with_policy(
        raw_url,
        HEALTH_CHECK_CONNECT_TIMEOUT,
        HEALTH_CHECK_REQUEST_TIMEOUT,
        HEALTH_CHECK_RETRY_WINDOW,
        HEALTH_CHECK_RETRY_INTERVAL,
    )
    .await
}

async fn perform_health_check_with_policy(
    raw_url: &str,
    connect_timeout: Duration,
    request_timeout: Duration,
    retry_window: Duration,
    retry_interval: Duration,
) -> Result<HealthCheckResult, HealthCheckError> {
    let request_id = next_request_id();
    let trace = ResponseTrace::local(request_id);
    let trimmed = raw_url.trim().trim_end_matches('/').to_string();

    if trimmed.is_empty() {
        return Err(HealthCheckError::Config {
            request_id: trace.request_id,
            message: "API 주소를 입력해 주십시오.".to_string(),
        });
    }

    let client =
        build_health_check_client(connect_timeout, request_timeout, trace.request_id.clone())?;

    let api_candidate = if trimmed.ends_with("/api/v1") {
        trimmed.clone()
    } else {
        format!("{trimmed}/api/v1")
    };
    let health_candidate = format!("{api_candidate}/health");

    match probe_api_candidate(
        &client,
        &health_candidate,
        &api_candidate,
        retry_window,
        retry_interval,
    )
    .await
    {
        Ok(result) => return Ok(result.with_trace(trace)),
        Err(ApiHealthProbeFailure::Transport(error)) => {
            return Ok(HealthCheckResult {
                reachable: false,
                resolved_url: None,
                message: build_transport_failure_message(&error),
                request_id: trace.request_id,
                correlation_id: trace.correlation_id,
                server_request_id: trace.server_request_id,
            });
        }
        Err(ApiHealthProbeFailure::Http) => {}
    }

    match client.get(&trimmed).send().await {
        Ok(response) if response.status().is_success() => Ok(HealthCheckResult {
            reachable: false,
            resolved_url: None,
            message:
                "루트 주소는 응답하지만 /api/v1 경계가 확인되지 않습니다. API 경로를 다시 확인해 주십시오."
                    .to_string(),
            request_id: trace.request_id,
            correlation_id: trace.correlation_id,
            server_request_id: trace.server_request_id,
        }),
        Ok(response) => Ok(HealthCheckResult {
            reachable: false,
            resolved_url: None,
            message: format!(
                "연결 테스트에 실패했습니다. HTTP {} 응답을 받았습니다.",
                response.status().as_u16()
            ),
            request_id: trace.request_id,
            correlation_id: trace.correlation_id,
            server_request_id: trace.server_request_id,
        }),
        Err(error) => Ok(HealthCheckResult {
            reachable: false,
            resolved_url: None,
            message: format!("연결 테스트에 실패했습니다: {error}"),
            request_id: trace.request_id,
            correlation_id: trace.correlation_id,
            server_request_id: trace.server_request_id,
        }),
    }
}

fn build_health_check_client(
    connect_timeout: Duration,
    request_timeout: Duration,
    request_id: String,
) -> Result<reqwest::Client, HealthCheckError> {
    reqwest::Client::builder()
        .connect_timeout(connect_timeout)
        .timeout(request_timeout)
        .build()
        .map_err(|error| HealthCheckError::Config {
            request_id,
            message: format!("failed to build site health client: {error}"),
        })
}

fn next_request_id() -> String {
    Uuid::new_v4().to_string()
}

#[cfg(test)]
mod tests;
