use super::AdminConfig;

#[test]
fn admin_config_accepts_string_number_and_bool_scalars() {
    let parsed: AdminConfig = serde_json::from_str(
        r#"{
                "cf_title": "G5",
                "cf_admin": "admin",
                "cf_register_level": 2,
                "cf_login_point": 100,
                "cf_use_point": 1,
                "cf_use_email_certify": true,
                "cf_login_minutes": 30
            }"#,
    )
    .expect("admin config should deserialize");

    assert_eq!(parsed.cf_title.as_deref(), Some("G5"));
    assert_eq!(parsed.cf_admin.as_deref(), Some("admin"));
    assert_eq!(parsed.cf_register_level.as_deref(), Some("2"));
    assert_eq!(parsed.cf_login_point.as_deref(), Some("100"));
    assert_eq!(parsed.cf_use_point.as_deref(), Some("1"));
    assert_eq!(parsed.cf_use_email_certify.as_deref(), Some("1"));
    assert_eq!(
        parsed.extra.get("cf_login_minutes").map(String::as_str),
        Some("30")
    );
}

#[test]
fn admin_config_rejects_nested_object_field() {
    let error = serde_json::from_str::<AdminConfig>(
        r#"{
                "cf_title": {"bad": "shape"}
            }"#,
    )
    .expect_err("nested object must fail");

    assert!(error.to_string().contains("cf_title"));
}
