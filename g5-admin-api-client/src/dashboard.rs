use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::dashboard::AdminDashboardResponse;
use g5_admin_models::models::trace::Traced;
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_dashboard(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> Result<Traced<AdminDashboardResponse>, AppError> {
        self.send_json::<(), (), AdminDashboardResponse>(
            request_id,
            Method::GET,
            "/admin/dashboard",
            RequestConfig {
                query: None::<&()>,
                body: None::<&()>,
                access_token: Some(access_token),
                retryable: true,
            },
        )
        .await
    }
}
