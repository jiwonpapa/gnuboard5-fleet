use super::{ApiErrorContext, AppError};
use g5_admin_error_contract::ResponseTrace;

#[test]
fn config_error_into_payload_keeps_local_trace_and_user_actionability() {
    let payload = AppError::Config {
        message: "missing config".to_string(),
    }
    .into_payload("req-config");

    assert_eq!(payload.code, "config_error");
    assert_eq!(payload.request_id, "req-config");
    assert_eq!(payload.correlation_id, "req-config");
    assert!(payload.user_actionable);
    assert!(!payload.retryable);
    assert_eq!(
        payload.guide.and_then(|guide| guide.action),
        Some("입력값, 로컬 경로, SSH/SFTP 연결 전제조건을 확인하세요.".to_string())
    );
}

#[test]
fn host_verification_error_into_payload_uses_ssh_specific_guide() {
    let payload = AppError::HostVerification {
        message: "unknown host key".to_string(),
    }
    .into_payload("req-host");

    assert_eq!(payload.code, "ssh_host_verification_error");
    assert_eq!(payload.request_id, "req-host");
    assert_eq!(payload.target.as_deref(), Some("ssh-runtime"));
    assert_eq!(payload.error_category, "security");
    assert_eq!(
        payload.guide.and_then(|guide| guide.reason),
        Some("SSH 서버 신뢰 확인이 아직 ~/.ssh/known_hosts에 반영되지 않았습니다.".to_string())
    );
}

#[test]
fn api_error_into_payload_uses_server_trace_and_status_fallback() {
    let payload = AppError::Api(Box::new(ApiErrorContext {
        target: "/admin/test".to_string(),
        status: 503,
        title: "service unavailable".to_string(),
        detail: "please retry".to_string(),
        trace: ResponseTrace {
            request_id: "req-api".to_string(),
            correlation_id: "corr-api".to_string(),
            server_request_id: Some("srv-api".to_string()),
        },
        error_code: None,
        error_category: None,
        fault_domain: None,
        owner: None,
        retryable: None,
        user_actionable: None,
        guide: None,
    }))
    .into_payload("ignored");

    assert_eq!(payload.code, "api_503");
    assert_eq!(payload.request_id, "req-api");
    assert_eq!(payload.correlation_id, "corr-api");
    assert_eq!(payload.server_request_id.as_deref(), Some("srv-api"));
    assert_eq!(payload.owner, "infra");
    assert!(payload.retryable);
    assert!(!payload.user_actionable);
}
