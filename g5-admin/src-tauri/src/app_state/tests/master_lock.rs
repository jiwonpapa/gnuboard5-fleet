use super::support::{
    build_state, cleanup_temp_dir, current_test_totp_code, file_runtime_config, prepare_temp_dir,
    test_database_config, TEST_TOTP_SECRET, TOTP_ENABLED_KEY,
};
use crate::db::SiteRepository;
use crate::error::AppError;
use crate::site_manager::SiteManager;
use g5_admin_models::models::master_lock::{
    MasterLockSetupInput, MasterLockTotpInput, MasterLockUnlockInput,
};
use g5_admin_models::models::site::SiteAddInput;

#[tokio::test]
async fn master_lock_setup_unlocks_without_creating_a_default_site() {
    let (temp_dir, _session_guard) = prepare_temp_dir("master-lock-setup");

    let site_repository = SiteRepository::new(test_database_config(temp_dir.join("g5-admin.db")));
    let site_manager = SiteManager::new(vec![], None).expect("site manager");
    let state = build_state(
        file_runtime_config(Some("https://legacy.example.com/api/v1")),
        site_repository,
        site_manager,
        false,
    );

    let initial_status = state
        .master_lock_status("test-request")
        .await
        .expect("initial status should load");
    assert!(!initial_status.is_configured);
    assert!(!initial_status.is_unlocked);

    let setup_status = state
        .setup_master_lock(
            "test-request",
            MasterLockSetupInput {
                password: "local-secret".to_string(),
                password_confirm: "local-secret".to_string(),
            },
        )
        .await
        .expect("master lock should set up");
    assert!(setup_status.is_configured);
    assert!(setup_status.is_unlocked);

    let catalog = state
        .site_catalog("test-request")
        .await
        .expect("catalog should still be empty after setup");
    assert!(catalog.needs_onboarding);
    assert!(catalog.sites.is_empty());

    cleanup_temp_dir(&temp_dir);
}

#[tokio::test]
async fn master_lock_rejects_wrong_password() {
    let (temp_dir, _session_guard) = prepare_temp_dir("master-lock-unlock");

    let site_repository = SiteRepository::new(test_database_config(temp_dir.join("g5-admin.db")));
    site_repository
        .create_app_lock("correct-secret")
        .expect("app lock should be created");
    let site_manager = SiteManager::new(vec![], None).expect("site manager");
    let state = build_state(
        file_runtime_config(None),
        site_repository,
        site_manager,
        false,
    );

    let error = state
        .unlock_master_lock(
            "test-request",
            MasterLockUnlockInput {
                password: "wrong-secret".to_string(),
            },
        )
        .await
        .expect_err("wrong password should fail");
    assert!(matches!(error, AppError::Auth { .. }));

    cleanup_temp_dir(&temp_dir);
}

#[tokio::test]
async fn lock_master_drops_unlock_state_until_next_unlock() {
    let (temp_dir, _session_guard) = prepare_temp_dir("master-lock-lock");

    let site_repository = SiteRepository::new(test_database_config(temp_dir.join("g5-admin.db")));
    site_repository
        .create_app_lock("correct-secret")
        .expect("app lock should be created");
    let site_manager = SiteManager::new(vec![], None).expect("site manager");
    let state = build_state(
        file_runtime_config(None),
        site_repository,
        site_manager,
        false,
    );

    state
        .unlock_master_lock(
            "test-request",
            MasterLockUnlockInput {
                password: "correct-secret".to_string(),
            },
        )
        .await
        .expect("unlock should succeed");
    state
        .add_site(SiteAddInput {
            name: "Alpha".to_string(),
            api_base_url: "https://alpha.example.com/api/v1".to_string(),
        })
        .await
        .expect("site should add");

    let locked_status = state
        .lock_master("test-request")
        .await
        .expect("lock should succeed");
    assert!(locked_status.is_configured);
    assert!(!locked_status.is_unlocked);
    assert_eq!(state.admin_api().current_base_url().await, None);

    let catalog_error = state
        .site_catalog("test-request")
        .await
        .expect_err("catalog should reject while locked");
    assert!(matches!(catalog_error, AppError::Auth { .. }));

    let unlocked_status = state
        .unlock_master_lock(
            "test-request",
            MasterLockUnlockInput {
                password: "correct-secret".to_string(),
            },
        )
        .await
        .expect("unlock after lock should succeed");
    assert!(unlocked_status.is_unlocked);
    assert_eq!(
        state.admin_api().current_base_url().await.as_deref(),
        Some("https://alpha.example.com/api/v1")
    );

    cleanup_temp_dir(&temp_dir);
}

#[tokio::test]
async fn unlock_master_lock_requires_totp_when_enabled() {
    let (temp_dir, _session_guard) = prepare_temp_dir("master-lock-totp");

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
        false,
    );

    let pending_status = state
        .unlock_master_lock(
            "test-request",
            MasterLockUnlockInput {
                password: "correct-secret".to_string(),
            },
        )
        .await
        .expect("password phase should succeed");
    assert!(!pending_status.is_unlocked);
    assert!(pending_status.totp_enabled);
    assert!(pending_status.requires_totp);

    let otp_code = current_test_totp_code();
    let unlocked_status = state
        .verify_master_lock_totp("test-request", MasterLockTotpInput { code: otp_code })
        .await
        .expect("otp phase should unlock");
    assert!(unlocked_status.is_unlocked);
    assert!(!unlocked_status.requires_totp);

    cleanup_temp_dir(&temp_dir);
}

#[tokio::test]
async fn unlock_master_lock_applies_temporary_lockout_after_repeated_failures() {
    let (temp_dir, _session_guard) = prepare_temp_dir("master-lock-lockout");

    let site_repository = SiteRepository::new(test_database_config(temp_dir.join("g5-admin.db")));
    site_repository
        .create_app_lock("correct-secret")
        .expect("app lock should be created");
    let site_manager = SiteManager::new(vec![], None).expect("site manager");
    let state = build_state(
        file_runtime_config(None),
        site_repository,
        site_manager,
        false,
    );

    for attempt in 0..5 {
        let error = state
            .unlock_master_lock(
                "test-request",
                MasterLockUnlockInput {
                    password: format!("wrong-secret-{attempt}"),
                },
            )
            .await
            .expect_err("wrong password should fail");
        assert!(matches!(error, AppError::Auth { .. }));
    }

    let locked_error = state
        .unlock_master_lock(
            "test-request",
            MasterLockUnlockInput {
                password: "correct-secret".to_string(),
            },
        )
        .await
        .expect_err("temporary lockout should reject immediate retry");
    match locked_error {
        AppError::Auth { message } => {
            assert!(message.contains("잠금 해제 시도 횟수를 초과했습니다."));
        }
        other => panic!("expected auth error, got {other:?}"),
    }

    cleanup_temp_dir(&temp_dir);
}
