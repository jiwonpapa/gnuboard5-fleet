use super::*;

#[test]
fn config_classification_builds_user_actionable_payload() {
    let payload = config_classification().into_payload(
        "missing config".to_string(),
        None,
        ResponseTrace::local("req-config".to_string()),
        None,
        None,
        None,
    );

    assert_eq!(payload.code, "config_error");
    assert_eq!(payload.request_id, "req-config");
    assert_eq!(payload.error_category, "config");
    assert!(payload.user_actionable);
    assert!(!payload.retryable);
}

#[test]
fn api_classification_uses_503_retryable_fallback() {
    let payload = api_classification(503, None, None, None, None, None, None).into_payload(
        "service unavailable".to_string(),
        None,
        ResponseTrace::local("req-api".to_string()),
        Some(503),
        Some("/admin/test".to_string()),
        None,
    );

    assert_eq!(payload.code, "api_503");
    assert_eq!(payload.owner, "infra");
    assert!(payload.retryable);
    assert!(!payload.user_actionable);
}
