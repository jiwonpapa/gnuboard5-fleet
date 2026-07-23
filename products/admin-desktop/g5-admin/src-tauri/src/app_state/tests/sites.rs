use super::support::{
    build_state, cleanup_temp_dir, file_runtime_config, prepare_temp_dir, test_database_config,
};
use crate::core::store_records::model_site_from_record;
use crate::db::{SiteInsert, SiteRepository};
use crate::site_manager::site_manager_from_model_sites;
use g5_admin_models::models::auth::StoredSession;
use g5_admin_models::models::auth::TokenPair;
use g5_admin_models::models::security::SecurityStepUpAuthInput;
use g5_admin_models::models::site::{SiteDeleteInput, SiteSessionStatus};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Notify;
use tokio::time::timeout;

#[tokio::test]
async fn delete_site_records_global_activity_after_site_row_is_removed() {
    let (temp_dir, _session_guard) = prepare_temp_dir("site-delete");

    let site_repository = SiteRepository::new(test_database_config(temp_dir.join("g5-admin.db")));
    let site = site_repository
        .insert_site(SiteInsert {
            name: "테스트 사이트".to_string(),
            api_base_url: "https://example.test/api/v1".to_string(),
            is_default: true,
        })
        .expect("site should insert");
    site_repository
        .create_app_lock("local-secret")
        .expect("app lock should be created");
    let site_manager = site_manager_from_model_sites(
        vec![model_site_from_record(site.clone())],
        Some(site.id.clone()),
    )
    .expect("site manager");
    let state = build_state(
        file_runtime_config(None),
        site_repository,
        site_manager,
        true,
    );

    state
        .delete_site(SiteDeleteInput {
            site_id: site.id.clone(),
            auth: SecurityStepUpAuthInput {
                current_password: "local-secret".to_string(),
                current_totp_code: None,
            },
        })
        .await
        .expect("site delete should succeed");

    let catalog = state
        .site_catalog("test-request")
        .await
        .expect("catalog should load");
    assert!(catalog.needs_onboarding);
    assert!(catalog.sites.is_empty());

    let activities = state
        .activity_list("test-request", None, 10)
        .await
        .expect("activity list should load");
    let delete_activity = activities
        .activities
        .iter()
        .find(|item| item.action == "site.delete")
        .expect("delete activity should be recorded");
    assert_eq!(delete_activity.site_id, None);
    assert!(delete_activity
        .detail
        .as_deref()
        .is_some_and(|detail| detail.contains("테스트 사이트")));

    cleanup_temp_dir(&temp_dir);
}

#[tokio::test]
async fn site_catalog_uses_local_session_hint_without_probing_token_store() {
    let (temp_dir, _session_guard) = prepare_temp_dir("site-catalog-session-hint");

    let site_repository = SiteRepository::new(test_database_config(temp_dir.join("g5-admin.db")));
    let site = site_repository
        .insert_site(SiteInsert {
            name: "운영 사이트".to_string(),
            api_base_url: "https://example.test/api/v1".to_string(),
            is_default: true,
        })
        .expect("site should insert");
    site_repository
        .create_app_lock("local-secret")
        .expect("app lock should be created");
    site_repository
        .set_site_session_hint(&site.id, true)
        .expect("session hint should persist");
    let site_manager = site_manager_from_model_sites(
        vec![model_site_from_record(site.clone())],
        Some(site.id.clone()),
    )
    .expect("site manager");
    let state = build_state(
        file_runtime_config(None),
        site_repository,
        site_manager,
        true,
    );

    let catalog = state
        .site_catalog("test-request")
        .await
        .expect("catalog should load");

    assert_eq!(catalog.sites.len(), 1);
    assert!(matches!(
        catalog.sites[0].status,
        SiteSessionStatus::Authenticated
    ));

    cleanup_temp_dir(&temp_dir);
}

#[tokio::test]
async fn active_request_context_keeps_site_base_url_and_token_atomic_during_switch() {
    let (temp_dir, _session_guard) = prepare_temp_dir("site-request-context-atomic");
    let site_repository = SiteRepository::new(test_database_config(temp_dir.join("g5-admin.db")));
    let site_a = site_repository
        .insert_site(SiteInsert {
            name: "사이트 A".to_string(),
            api_base_url: "https://a.example.test/api/v1".to_string(),
            is_default: true,
        })
        .expect("site A");
    let site_b = site_repository
        .insert_site(SiteInsert {
            name: "사이트 B".to_string(),
            api_base_url: "https://b.example.test/api/v1".to_string(),
            is_default: false,
        })
        .expect("site B");
    let model_a = model_site_from_record(site_a.clone());
    let model_b = model_site_from_record(site_b.clone());
    let site_manager = site_manager_from_model_sites(
        vec![model_a.clone(), model_b.clone()],
        Some(site_a.id.clone()),
    )
    .expect("site manager");
    let state = build_state(
        file_runtime_config(None),
        site_repository,
        site_manager,
        true,
    );

    state
        .site_catalog_service()
        .sync_active_site_runtime(Some(&model_a))
        .await
        .expect("activate A");
    state
        .session_service()
        .save_active_site_session(&StoredSession::new(
            "admin-a".to_string(),
            TokenPair {
                access_token: "token-a".to_string(),
                refresh_token: "refresh-a".to_string(),
                expires_in: 3600,
            },
        ))
        .await
        .expect("save A session");
    state
        .site_catalog_service()
        .sync_active_site_runtime(Some(&model_b))
        .await
        .expect("activate B");
    state
        .session_service()
        .save_active_site_session(&StoredSession::new(
            "admin-b".to_string(),
            TokenPair {
                access_token: "token-b".to_string(),
                refresh_token: "refresh-b".to_string(),
                expires_in: 3600,
            },
        ))
        .await
        .expect("save B session");
    state
        .site_catalog_service()
        .sync_active_site_runtime(Some(&model_a))
        .await
        .expect("reactivate A");

    let entered = Arc::new(Notify::new());
    let release = Arc::new(Notify::new());
    let reader_state = state.clone();
    let reader_entered = Arc::clone(&entered);
    let reader_release = Arc::clone(&release);
    let reader = tokio::spawn(async move {
        let context = reader_state
            .acquire_active_request_context()
            .await
            .expect("capture A context");
        let session = reader_state
            .session_service()
            .load_active_site_session()
            .await
            .expect("load A session")
            .expect("A session");
        let snapshot = (
            context.site_id().map(str::to_string),
            context.base_url().map(str::to_string),
            session.access_token,
        );
        reader_entered.notify_one();
        reader_release.notified().await;
        snapshot
    });
    entered.notified().await;

    let writer_state = state.clone();
    let writer_site = model_b.clone();
    let mut writer = tokio::spawn(async move {
        writer_state
            .site_catalog_service()
            .sync_active_site_runtime(Some(&writer_site))
            .await
    });
    assert!(timeout(Duration::from_millis(50), &mut writer)
        .await
        .is_err());
    release.notify_one();

    let snapshot_a = reader.await.expect("reader task");
    writer
        .await
        .expect("writer task")
        .expect("switch to B after reader release");
    assert_eq!(
        snapshot_a,
        (
            Some(site_a.id.clone()),
            Some(model_a.api_base_url.clone()),
            "token-a".to_string(),
        )
    );

    let context_b = state
        .acquire_active_request_context()
        .await
        .expect("capture B context");
    let session_b = state
        .session_service()
        .load_active_site_session()
        .await
        .expect("load B session")
        .expect("B session");
    assert_eq!(context_b.site_id(), Some(site_b.id.as_str()));
    assert_eq!(context_b.base_url(), Some(model_b.api_base_url.as_str()));
    assert_eq!(session_b.access_token, "token-b");

    cleanup_temp_dir(&temp_dir);
}
