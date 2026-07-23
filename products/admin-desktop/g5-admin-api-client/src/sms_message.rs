use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::sms_message::{
    AdminSmsSendEnvelope, AdminSmsSendInput, AdminSmsSendResult,
};
use g5_admin_models::models::trace::Traced;
use reqwest::Method;

impl ApiClient {
    pub async fn send_admin_sms_message(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminSmsSendInput,
    ) -> Result<Traced<AdminSmsSendResult>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminSmsSendEnvelope>(
                request_id,
                Method::POST,
                "/admin/sms/messages",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminSmsSendEnvelope| payload.data))
    }
}
