use g5_fleet_store::FleetStore;
use sqlx::{
    Connection,
    sqlite::{SqliteConnectOptions, SqliteConnection},
};

#[tokio::test]
async fn audit_log_rejects_update_and_delete_after_append() {
    let data = tempfile::tempdir().expect("data");
    let store = FleetStore::initialize(data.path(), "audit-security-test")
        .await
        .expect("store");
    store
        .append_audit(
            Some("request-1"),
            None,
            None,
            "security.test",
            "success",
            &serde_json::json!({"redacted":true}),
        )
        .await
        .expect("append");

    let mut connection = SqliteConnection::connect_with(
        &SqliteConnectOptions::new().filename(store.database_path()),
    )
    .await
    .expect("connection");
    let update = sqlx::query("UPDATE audit_log SET outcome = 'failed' WHERE audit_id = 1")
        .execute(&mut connection)
        .await;
    let delete = sqlx::query("DELETE FROM audit_log WHERE audit_id = 1")
        .execute(&mut connection)
        .await;
    assert!(update.is_err());
    assert!(delete.is_err());
    assert_eq!(store.readback().await.expect("readback").audit_entries, 1);
}

#[tokio::test]
async fn installation_state_stays_incomplete_until_atomic_totp_completion() {
    let data = tempfile::tempdir().expect("data");
    let store = FleetStore::initialize(data.path(), "install-security-test")
        .await
        .expect("store");
    assert_eq!(
        store
            .installation_security_state()
            .await
            .expect("state")
            .state,
        "setup_required"
    );
    assert_eq!(store.readback().await.expect("readback").users, 0);
}
