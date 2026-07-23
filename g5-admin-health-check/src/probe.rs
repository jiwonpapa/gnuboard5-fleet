use crate::HealthCheckResult;
use g5_admin_error_contract::ResponseTrace;
use reqwest::StatusCode;
use std::time::Duration;
use tokio::time::{sleep, Instant};

pub(super) async fn probe_api_candidate(
    client: &reqwest::Client,
    health_candidate: &str,
    resolved_api_url: &str,
    retry_window: Duration,
    retry_interval: Duration,
) -> Result<HealthProbeResult, ApiHealthProbeFailure> {
    let started_at = Instant::now();

    loop {
        match client.get(health_candidate).send().await {
            Ok(response) if response.status().is_success() => {
                return Ok(HealthProbeResult {
                    reachable: true,
                    resolved_url: Some(resolved_api_url.to_string()),
                    message: "연결 테스트에 성공했습니다.".to_string(),
                });
            }
            Ok(response) if response.status() == StatusCode::UNAUTHORIZED => {
                return Ok(HealthProbeResult {
                    reachable: true,
                    resolved_url: Some(resolved_api_url.to_string()),
                    message: "API 경계까지는 도달했습니다. 인증은 로그인 단계에서 확인됩니다."
                        .to_string(),
                });
            }
            Ok(_) => return Err(ApiHealthProbeFailure::Http),
            Err(error) => {
                let error_text = error.to_string();
                let within_retry_window = started_at.elapsed() < retry_window;
                if !within_retry_window || !should_retry_transport_error(&error) {
                    return Err(ApiHealthProbeFailure::Transport(error_text));
                }
                sleep(retry_interval).await;
            }
        }
    }
}

fn should_retry_transport_error(error: &reqwest::Error) -> bool {
    error.is_connect() || error.is_timeout() || error.is_request()
}

pub(super) fn build_transport_failure_message(detail: &str) -> String {
    format!(
        "연결 테스트에 실패했습니다. 운영체제가 네트워크 접근이나 방화벽 확인을 묻는 경우 먼저 허용해 주십시오. 마지막 오류: {detail}"
    )
}

pub(super) struct HealthProbeResult {
    reachable: bool,
    resolved_url: Option<String>,
    message: String,
}

impl HealthProbeResult {
    pub(super) fn with_trace(self, trace: ResponseTrace) -> HealthCheckResult {
        HealthCheckResult {
            reachable: self.reachable,
            resolved_url: self.resolved_url,
            message: self.message,
            request_id: trace.request_id,
            correlation_id: trace.correlation_id,
            server_request_id: trace.server_request_id,
        }
    }
}

pub(super) enum ApiHealthProbeFailure {
    Http,
    Transport(String),
}
