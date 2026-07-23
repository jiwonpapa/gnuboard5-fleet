use super::*;

#[test]
fn request_validator_rejects_missing_required_board_fields() {
    let body = serde_json::json!({"bo_table": "notice"});
    let error = validate_active_request(
        "POST",
        "/admin/boards",
        Some("application/json"),
        None,
        Some(&body),
    )
    .expect_err("missing fields must fail");
    assert!(error.to_string().contains("bo_subject"));
}

#[test]
fn request_validator_accepts_exact_system_mail_payload() {
    let body = serde_json::json!({
        "ma_id": 1,
        "mb_ids": ["admin"],
        "subject": "subject",
        "content": "content"
    });
    validate_active_request(
        "POST",
        "/admin/system/mails/send",
        Some("application/json"),
        None,
        Some(&body),
    )
    .expect("exact mail payload");
}

#[test]
fn request_validator_treats_optional_null_query_as_omitted() {
    let query = serde_json::json!({
        "page": 1,
        "per_page": 20,
        "search": null,
        "search_field": null
    });

    validate_active_request("GET", "/admin/members", None, Some(&query), None)
        .expect("optional null query parameters must be treated as omitted");
}

#[test]
fn response_validator_rejects_wrong_required_field_type() {
    let body = serde_json::json!({
        "status": "ok",
        "version": "1",
        "timestamp": "not-an-integer",
        "meta": {}
    })
    .to_string();
    let error = validate_active_response("GET", "/health", 200, Some("application/json"), &body)
        .expect_err("strict additional properties must fail");
    assert!(error.to_string().contains("timestamp"));
}

#[test]
fn response_validator_accepts_runtime_mysql_mail_datetime() {
    let body = serde_json::json!({
        "data": [{
            "mb_id": "admin",
            "mb_name": "GnuBoard5 Admin",
            "mb_nick": "admin",
            "mb_email": "admin@example.com",
            "mb_level": 10,
            "mb_mailling": 1,
            "mb_datetime": "2026-07-22 10:36:17"
        }],
        "pagination": {},
        "meta": {}
    })
    .to_string();

    validate_active_response(
        "GET",
        "/admin/mails/recipients",
        200,
        Some("application/json"),
        &body,
    )
    .expect("runtime MySQL datetime must satisfy the generated OpenAPI pattern");
}

#[test]
fn response_validator_rejects_malformed_rfc7807_error() {
    let body = serde_json::json!({
        "status": 500,
        "title": "broken"
    })
    .to_string();
    let error = validate_active_response(
        "GET",
        "/health",
        500,
        Some("application/json; charset=utf-8"),
        &body,
    )
    .expect_err("malformed RFC7807 body must fail before error mapping");
    assert!(error.to_string().contains("detail"));
}
