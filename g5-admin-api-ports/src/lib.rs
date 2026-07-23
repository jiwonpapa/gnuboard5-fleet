use g5_admin_app_error::AppError;
use g5_admin_error_contract::{ResponseTrace, Traced};
use g5_admin_port_types::{
    AuthLoginRecord, MemberProfileRecord, StoredSessionRecord, TokenPairRecord,
};

#[async_trait::async_trait]
pub trait AdminApiPort: Send + Sync {
    async fn set_base_url(&self, raw_base_url: Option<String>) -> Result<(), AppError>;
    async fn current_base_url(&self) -> Option<String>;
    async fn login(
        &self,
        request_id: &str,
        input: &AuthLoginRecord,
    ) -> Result<Traced<TokenPairRecord>, AppError>;
    async fn refresh(
        &self,
        request_id: &str,
        session: &StoredSessionRecord,
    ) -> Result<Traced<TokenPairRecord>, AppError>;
    async fn logout(
        &self,
        request_id: &str,
        session: &StoredSessionRecord,
    ) -> Result<ResponseTrace, AppError>;
    async fn get_my_profile(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> Result<Traced<MemberProfileRecord>, AppError>;
}

#[cfg(test)]
mod tests;
