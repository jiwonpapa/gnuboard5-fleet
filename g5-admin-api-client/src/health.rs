use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::health::HealthResponse;
use g5_admin_models::models::trace::Traced;
use reqwest::Method;

impl ApiClient {
    pub async fn get_health(&self, request_id: &str) -> Result<Traced<HealthResponse>, AppError> {
        self.transport
            .send_json::<(), (), HealthResponse>(
                request_id,
                Method::GET,
                "/health",
                RequestConfig {
                    query: None::<&()>,
                    body: None::<&()>,
                    access_token: None,
                    retryable: true,
                },
            )
            .await
    }
}
