use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::mail_test::{
    AdminMailTestEnvelope, AdminMailTestInput, AdminMailTestResult,
};
use g5_admin_models::models::trace::Traced;
use reqwest::Method;

impl ApiClient {
    pub async fn send_admin_mail_test(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminMailTestInput,
    ) -> Result<Traced<AdminMailTestResult>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminMailTestEnvelope>(
                request_id,
                Method::POST,
                "/admin/system/mails/test",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminMailTestEnvelope| payload.data))
    }

    pub async fn send_admin_mail_test_legacy_mails(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminMailTestInput,
    ) -> Result<Traced<AdminMailTestResult>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminMailTestEnvelope>(
                request_id,
                Method::POST,
                "/admin/mails/test",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminMailTestEnvelope| payload.data))
    }

    pub async fn send_admin_mail_test_legacy_mail_tests(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminMailTestInput,
    ) -> Result<Traced<AdminMailTestResult>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminMailTestEnvelope>(
                request_id,
                Method::POST,
                "/admin/mail-tests",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminMailTestEnvelope| payload.data))
    }
}
