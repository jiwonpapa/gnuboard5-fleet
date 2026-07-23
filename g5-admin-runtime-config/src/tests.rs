use super::{DatabaseMasterStorageMode, RuntimeConfig, RuntimeSshAuthType, SessionStorageMode};

#[test]
fn trims_trailing_slash_from_base_url() {
    let config = RuntimeConfig::from_parts(
        Some("https://gnurestapi.cc/api/v1/".to_string()),
        true,
        SessionStorageMode::File,
        DatabaseMasterStorageMode::File,
        None,
        "test",
    )
    .expect("config should parse");

    assert_eq!(
        config.legacy_api_base_url.as_deref(),
        Some("https://gnurestapi.cc/api/v1")
    );
    assert!(config.debug_overlay);
    assert_eq!(config.session_storage, SessionStorageMode::File);
    assert_eq!(config.db_master_storage, DatabaseMasterStorageMode::File);
}

#[test]
fn rejects_empty_base_url() {
    let error = RuntimeConfig::from_parts(
        Some("   ".to_string()),
        false,
        SessionStorageMode::File,
        DatabaseMasterStorageMode::File,
        None,
        "test",
    )
    .expect_err("must fail");

    assert!(error
        .to_string()
        .contains("must not resolve to an empty API base URL"));
}

#[test]
fn allows_missing_legacy_base_url() {
    let config = RuntimeConfig::from_parts(
        None,
        false,
        SessionStorageMode::File,
        DatabaseMasterStorageMode::File,
        None,
        "test",
    )
    .expect("config should parse");

    assert_eq!(config.legacy_api_base_url, None);
    assert!(!config.debug_overlay);
    assert_eq!(config.session_storage, SessionStorageMode::File);
    assert_eq!(config.db_master_storage, DatabaseMasterStorageMode::File);
}

#[test]
fn carries_dev_bootstrap_when_present() {
    let config = RuntimeConfig::from_parts(
        None,
        true,
        SessionStorageMode::File,
        DatabaseMasterStorageMode::File,
        Some(super::DevBootstrapConfig {
            master_password: Some("dev-secret".to_string()),
            site: Some(super::DevBootstrapSiteConfig {
                name: "로컬 개발".to_string(),
                api_base_url: "https://dev.example.com/api/v1".to_string(),
            }),
            site_auth: Some(super::DevBootstrapSiteAuthConfig {
                mb_id: "dev_admin".to_string(),
                mb_password: "dev-password".to_string(),
            }),
            ssh_profiles: vec![super::DevBootstrapSshProfileConfig {
                name: "개발 SSH".to_string(),
                host: "dev.example.com".to_string(),
                port: 22,
                username: "deploy".to_string(),
                auth_type: RuntimeSshAuthType::Password,
                key_path: None,
                password: Some("secret".to_string()),
                key_passphrase: None,
            }],
        }),
        "test",
    )
    .expect("config should parse");

    let bootstrap = config
        .dev_bootstrap
        .expect("dev bootstrap should be retained");
    assert_eq!(bootstrap.master_password.as_deref(), Some("dev-secret"));
    assert_eq!(
        bootstrap.site.as_ref().map(|site| site.name.as_str()),
        Some("로컬 개발")
    );
    assert_eq!(
        bootstrap
            .site_auth
            .as_ref()
            .map(|site_auth| site_auth.mb_id.as_str()),
        Some("dev_admin")
    );
    assert_eq!(bootstrap.ssh_profiles.len(), 1);
}
