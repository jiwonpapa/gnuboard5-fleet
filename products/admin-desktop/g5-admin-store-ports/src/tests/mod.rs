use super::*;

#[derive(Default)]
struct FakeSessionStore;

#[async_trait::async_trait]
impl SessionStorePort for FakeSessionStore {
    async fn load_active_site_session(&self) -> Result<Option<StoredSessionRecord>, AppError> {
        Ok(None)
    }

    async fn save_active_site_session(
        &self,
        _session: &StoredSessionRecord,
    ) -> Result<(), AppError> {
        Ok(())
    }

    async fn clear_active_site_session(&self) -> Result<(), AppError> {
        Ok(())
    }

    async fn clear_session_for_site(&self, _site_id: &str) -> Result<(), AppError> {
        Ok(())
    }

    async fn set_active_site_id(&self, _site_id: Option<String>) {}

    async fn active_site_id(&self) -> Option<String> {
        Some("site-1".to_string())
    }
}

#[tokio::test]
async fn session_store_contract_tracks_active_site() {
    let store = FakeSessionStore;

    assert_eq!(store.active_site_id().await.as_deref(), Some("site-1"));
    assert!(store
        .load_active_site_session()
        .await
        .expect("load")
        .is_none());
}
