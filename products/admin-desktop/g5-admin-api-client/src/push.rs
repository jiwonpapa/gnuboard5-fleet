use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::push::{
    AdminPushMessageEnvelope, AdminPushMessageInput, AdminPushMessageResult,
};
use g5_admin_models::models::trace::Traced;
use reqwest::Method;

impl ApiClient {
    pub async fn create_admin_push_message(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPushMessageInput,
    ) -> Result<Traced<AdminPushMessageResult>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminPushMessageEnvelope>(
                request_id,
                Method::POST,
                "/admin/push/messages",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminPushMessageEnvelope| payload.data))
    }

    pub async fn send_admin_push_message(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPushMessageInput,
    ) -> Result<Traced<AdminPushMessageResult>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminPushMessageEnvelope>(
                request_id,
                Method::POST,
                "/admin/push/send",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminPushMessageEnvelope| payload.data))
    }
}
