use super::support::{cleanup_file, create_repository, SiteInsert};
use crate::open_connection;
use crate::StoredSession;

#[test]
fn app_lock_round_trip_hashes_and_verifies_passwords() {
    let (repository, db_path) = create_repository("app-lock");

    let record = repository
        .create_app_lock("local-secret")
        .expect("app lock should be created");
    assert!(!record.passkey_enabled);
    assert!(!record.password_verifier.is_empty());

    let loaded = repository
        .load_app_lock()
        .expect("app lock should load")
        .expect("app lock should exist");
    assert!(!loaded.passkey_enabled);
    assert!(repository
        .verify_app_lock("local-secret")
        .expect("password should verify"));
    assert!(!repository
        .verify_app_lock("wrong-secret")
        .expect("wrong password should fail"));

    cleanup_file(&db_path);
}

#[test]
fn site_session_hint_round_trip() {
    let (repository, db_path) = create_repository("site-session-hint");
    let site = repository
        .insert_site(SiteInsert {
            name: "운영".to_string(),
            api_base_url: "https://alpha.example.com/api/v1".to_string(),
            is_default: true,
        })
        .expect("site should insert");

    assert!(!repository
        .site_has_session_hint(&site.id)
        .expect("session hint should default to false"));

    repository
        .set_site_session_hint(&site.id, true)
        .expect("session hint should enable");
    assert!(repository
        .site_has_session_hint(&site.id)
        .expect("session hint should be true"));

    repository
        .set_site_session_hint(&site.id, false)
        .expect("session hint should clear");
    assert!(!repository
        .site_has_session_hint(&site.id)
        .expect("session hint should be removed"));

    cleanup_file(&db_path);
}

#[test]
fn site_session_round_trip_stays_inside_local_database() {
    let (repository, db_path) = create_repository("site-session");
    let site = repository
        .insert_site(SiteInsert {
            name: "운영".to_string(),
            api_base_url: "https://alpha.example.com/api/v1".to_string(),
            is_default: true,
        })
        .expect("site should insert");
    let session = StoredSession {
        mb_id: "admin".to_string(),
        access_token: "access-token".to_string(),
        refresh_token: "refresh-token".to_string(),
        expires_in: 3600,
    };

    assert!(
        repository
            .load_site_session(&site.id)
            .expect("session should load")
            .is_none(),
        "session should default to none"
    );

    repository
        .save_site_session(&site.id, &session)
        .expect("session should save");
    let loaded = repository
        .load_site_session(&site.id)
        .expect("session should reload")
        .expect("session should exist");
    assert_eq!(loaded.mb_id, session.mb_id);
    assert_eq!(loaded.access_token, session.access_token);
    assert_eq!(loaded.refresh_token, session.refresh_token);
    assert_eq!(loaded.expires_in, session.expires_in);

    repository
        .clear_site_session(&site.id)
        .expect("session should clear");
    assert!(
        repository
            .load_site_session(&site.id)
            .expect("cleared session should load")
            .is_none(),
        "session should be removed"
    );

    cleanup_file(&db_path);
}

#[test]
fn totp_secret_round_trip_stays_inside_local_database() {
    let (repository, db_path) = create_repository("totp-secret");

    assert!(repository
        .load_totp_secret()
        .expect("totp secret should load")
        .is_none());

    repository
        .store_totp_secret("OBWGC2LOFVZXI4TJNZTS243FMNZGK5BNGEZDG")
        .expect("totp secret should save");
    assert_eq!(
        repository
            .load_totp_secret()
            .expect("totp secret should reload")
            .as_deref(),
        Some("OBWGC2LOFVZXI4TJNZTS243FMNZGK5BNGEZDG")
    );

    let connection = open_connection(repository.config()).expect("connection should open");
    let stored: String = connection
        .query_row(
            "SELECT value FROM app_settings WHERE key = 'security.totp_secret'",
            [],
            |row| row.get(0),
        )
        .expect("totp app setting should exist");
    assert_eq!(stored, "OBWGC2LOFVZXI4TJNZTS243FMNZGK5BNGEZDG");

    repository
        .clear_totp_secret()
        .expect("totp secret should clear");
    assert!(repository
        .load_totp_secret()
        .expect("cleared totp secret should load")
        .is_none());

    cleanup_file(&db_path);
}
