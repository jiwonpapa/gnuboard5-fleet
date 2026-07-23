use super::*;
use tokio::sync::RwLock;

#[derive(Default)]
struct FakeAdminApi {
    base_url: RwLock<Option<String>>,
}

#[async_trait::async_trait]
impl AdminApiPort for FakeAdminApi {
    async fn set_base_url(&self, raw_base_url: Option<String>) -> Result<(), AppError> {
        *self.base_url.write().await = raw_base_url;
        Ok(())
    }

    async fn current_base_url(&self) -> Option<String> {
        self.base_url.read().await.clone()
    }

    async fn login(
        &self,
        _request_id: &str,
        _input: &AuthLoginRecord,
    ) -> Result<Traced<TokenPairRecord>, AppError> {
        Err(AppError::Config {
            message: "fake login is not implemented".to_string(),
        })
    }

    async fn refresh(
        &self,
        _request_id: &str,
        _session: &StoredSessionRecord,
    ) -> Result<Traced<TokenPairRecord>, AppError> {
        Err(AppError::Config {
            message: "fake refresh is not implemented".to_string(),
        })
    }

    async fn logout(
        &self,
        _request_id: &str,
        _session: &StoredSessionRecord,
    ) -> Result<ResponseTrace, AppError> {
        Err(AppError::Config {
            message: "fake logout is not implemented".to_string(),
        })
    }

    async fn get_my_profile(
        &self,
        _request_id: &str,
        _access_token: &str,
    ) -> Result<Traced<MemberProfileRecord>, AppError> {
        Err(AppError::Config {
            message: "fake profile is not implemented".to_string(),
        })
    }
}

#[tokio::test]
async fn admin_api_port_tracks_current_base_url() {
    let api = FakeAdminApi::default();

    api.set_base_url(Some("https://example.com/api".to_string()))
        .await
        .expect("set base url");

    assert_eq!(
        api.current_base_url().await.as_deref(),
        Some("https://example.com/api")
    );
}
