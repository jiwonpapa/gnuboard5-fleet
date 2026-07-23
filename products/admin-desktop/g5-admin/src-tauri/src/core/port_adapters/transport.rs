use crate::core::ports::{
    AdminApiPort, AuthLoginRecord, MemberProfileRecord, StoredSessionRecord, TokenPairRecord,
};
use crate::error::AppError;
use g5_admin_error_contract::{ResponseTrace, Traced};
use g5_admin_transport::TransportClient;

#[derive(Clone)]
pub(crate) struct AdminApiPortAdapter {
    inner: TransportClient,
}

impl AdminApiPortAdapter {
    pub(crate) fn new(inner: TransportClient) -> Self {
        Self { inner }
    }
}

#[async_trait::async_trait]
impl AdminApiPort for AdminApiPortAdapter {
    async fn set_base_url(&self, raw_base_url: Option<String>) -> Result<(), AppError> {
        TransportClient::set_base_url(&self.inner, raw_base_url)
            .await
            .map_err(AppError::from)
    }

    async fn current_base_url(&self) -> Option<String> {
        TransportClient::current_base_url(&self.inner).await
    }

    async fn login(
        &self,
        request_id: &str,
        input: &AuthLoginRecord,
    ) -> Result<Traced<TokenPairRecord>, AppError> {
        TransportClient::login(&self.inner, request_id, input)
            .await
            .map_err(AppError::from)
    }

    async fn refresh(
        &self,
        request_id: &str,
        session: &StoredSessionRecord,
    ) -> Result<Traced<TokenPairRecord>, AppError> {
        TransportClient::refresh(&self.inner, request_id, session)
            .await
            .map_err(AppError::from)
    }

    async fn logout(
        &self,
        request_id: &str,
        session: &StoredSessionRecord,
    ) -> Result<ResponseTrace, AppError> {
        TransportClient::logout(&self.inner, request_id, session)
            .await
            .map_err(AppError::from)
    }

    async fn get_my_profile(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> Result<Traced<MemberProfileRecord>, AppError> {
        TransportClient::get_my_profile(&self.inner, request_id, access_token)
            .await
            .map_err(AppError::from)
    }
}
