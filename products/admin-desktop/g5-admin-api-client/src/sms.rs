use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::sms::{
    AdminSmsConfig, AdminSmsConfigEnvelope, AdminSmsConfigUpdateInput, AdminSmsMemberSyncEnvelope,
    AdminSmsMemberSyncResult,
};
use g5_admin_models::models::trace::Traced;
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_sms_config(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> Result<Traced<AdminSmsConfig>, AppError> {
        let response = self
            .send_json::<(), (), AdminSmsConfigEnvelope>(
                request_id,
                Method::GET,
                "/admin/sms/config",
                RequestConfig {
                    query: None::<&()>,
                    body: None::<&()>,
                    access_token: Some(access_token),
                    retryable: true,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminSmsConfigEnvelope| payload.data))
    }

    pub async fn update_admin_sms_config(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminSmsConfigUpdateInput,
    ) -> Result<Traced<AdminSmsConfig>, AppError> {
        let body = input.to_update_payload();

        let response = self
            .send_json::<(), _, AdminSmsConfigEnvelope>(
                request_id,
                Method::PUT,
                "/admin/sms/config",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminSmsConfigEnvelope| payload.data))
    }

    pub async fn sync_admin_sms_members(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> Result<Traced<AdminSmsMemberSyncResult>, AppError> {
        let response = self
            .send_json::<(), (), AdminSmsMemberSyncEnvelope>(
                request_id,
                Method::POST,
                "/admin/sms/member-sync",
                RequestConfig {
                    query: None::<&()>,
                    body: None::<&()>,
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminSmsMemberSyncEnvelope| payload.data))
    }
}
