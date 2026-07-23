use super::support::{
    build_state, cleanup_temp_dir, current_test_totp_code, file_runtime_config, prepare_temp_dir,
    test_database_config, TEST_TOTP_SECRET, TOTP_ENABLED_KEY,
};
use crate::db::SiteRepository;
use crate::error::AppError;
use crate::site_manager::SiteManager;
use g5_admin_models::models::security::{
    MasterPasswordChangeInput, SecurityIdleTimeoutUpdateInput, SecurityStepUpAuthInput,
};

#[tokio::test]
async fn export_backup_requires_sensitive_action_password() {
    let (temp_dir, _session_guard) = prepare_temp_dir("backup-step-up");

    let site_repository = SiteRepository::new(test_database_config(temp_dir.join("g5-admin.db")));
    site_repository
        .create_app_lock("correct-secret")
        .expect("app lock should be created");
    let site_manager = SiteManager::new(vec![], None).expect("site manager");
    let state = build_state(
        file_runtime_config(None),
        site_repository,
        site_manager,
        true,
    );

    let export_path = temp_dir.join("backup.db");
    let error = state
        .export_backup(
            export_path.to_string_lossy().as_ref(),
            "wrong-secret",
            None,
            "portable-secret",
        )
        .await
        .expect_err("backup export should require correct step-up password");
    assert!(matches!(error, AppError::Auth { .. }));

    cleanup_temp_dir(&temp_dir);
}

#[tokio::test]
async fn security_changes_require_current_totp_when_enabled() {
    let (temp_dir, _session_guard) = prepare_temp_dir("security-step-up-totp");

    let site_repository = SiteRepository::new(test_database_config(temp_dir.join("g5-admin.db")));
    site_repository
        .create_app_lock("correct-secret")
        .expect("app lock should be created");
    site_repository
        .store_totp_secret(TEST_TOTP_SECRET)
        .expect("totp secret should store");
    site_repository
        .set_app_setting(TOTP_ENABLED_KEY, "1")
        .expect("totp enabled flag should persist");
    let site_manager = SiteManager::new(vec![], None).expect("site manager");
    let state = build_state(
        file_runtime_config(None),
        site_repository,
        site_manager,
        true,
    );

    let missing_totp_error = state
        .update_idle_timeout(
            "test-request",
            SecurityIdleTimeoutUpdateInput {
                idle_timeout_minutes: Some(30),
                auth: SecurityStepUpAuthInput {
                    current_password: "correct-secret".to_string(),
                    current_totp_code: None,
                },
            },
        )
        .await
        .expect_err("otp should be required for sensitive security changes");
    match missing_totp_error {
        AppError::Auth { message } => {
            assert!(message.contains("현재 OTP 코드를 입력"));
        }
        other => panic!("expected auth error, got {other:?}"),
    }

    let otp_code = current_test_totp_code();
    let settings = state
        .change_master_password(
            "test-request",
            MasterPasswordChangeInput {
                current_password: "correct-secret".to_string(),
                current_totp_code: Some(otp_code),
                new_password: "next-secret".to_string(),
                new_password_confirm: "next-secret".to_string(),
            },
        )
        .await
        .expect("password change should accept current totp");
    assert!(settings.totp_enabled);

    cleanup_temp_dir(&temp_dir);
}
