use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::config::{AdminConfig, AdminConfigEnvelope, AdminConfigUpdateInput};
use g5_admin_models::models::trace::Traced;
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_config(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> Result<Traced<AdminConfig>, AppError> {
        let response = self
            .send_json::<(), (), AdminConfigEnvelope>(
                request_id,
                Method::GET,
                "/admin/config",
                RequestConfig {
                    query: None::<&()>,
                    body: None::<&()>,
                    access_token: Some(access_token),
                    retryable: true,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminConfigEnvelope| payload.data))
    }

    pub async fn update_admin_config(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminConfigUpdateInput,
    ) -> Result<Traced<AdminConfig>, AppError> {
        let body = input.to_update_payload();

        let response = self
            .send_json::<(), _, AdminConfigEnvelope>(
                request_id,
                Method::PUT,
                "/admin/config",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminConfigEnvelope| payload.data))
    }
}
