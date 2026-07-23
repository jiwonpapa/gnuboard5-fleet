use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::qa_config::{
    AdminQaConfig, AdminQaConfigEnvelope, AdminQaConfigUpdateInput,
};
use g5_admin_models::models::trace::Traced;
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_qa_config(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> Result<Traced<AdminQaConfig>, AppError> {
        let response = self
            .send_json::<(), (), AdminQaConfigEnvelope>(
                request_id,
                Method::GET,
                "/admin/system/qa-config",
                RequestConfig {
                    query: None::<&()>,
                    body: None::<&()>,
                    access_token: Some(access_token),
                    retryable: true,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminQaConfigEnvelope| payload.data))
    }

    pub async fn update_admin_qa_config(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminQaConfigUpdateInput,
    ) -> Result<Traced<AdminQaConfig>, AppError> {
        let body = input.to_update_payload();

        let response = self
            .send_json::<(), _, AdminQaConfigEnvelope>(
                request_id,
                Method::PUT,
                "/admin/system/qa-config",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminQaConfigEnvelope| payload.data))
    }
}
