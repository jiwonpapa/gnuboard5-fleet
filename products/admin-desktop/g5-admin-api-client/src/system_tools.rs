use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::system_tools::{
    AdminBrowscapConvertEnvelope, AdminBrowscapConvertInput, AdminBrowscapConvertResult,
    AdminBrowscapStatus, AdminBrowscapStatusEnvelope, AdminPhpInfo, AdminPhpInfoEnvelope,
};
use g5_admin_models::models::trace::Traced;
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_phpinfo(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> Result<Traced<AdminPhpInfo>, AppError> {
        let response = self
            .send_json::<(), (), AdminPhpInfoEnvelope>(
                request_id,
                Method::GET,
                "/admin/system/phpinfo",
                RequestConfig {
                    query: None::<&()>,
                    body: None::<&()>,
                    access_token: Some(access_token),
                    retryable: true,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminPhpInfoEnvelope| payload.data))
    }

    pub async fn get_admin_browscap_status(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> Result<Traced<AdminBrowscapStatus>, AppError> {
        let response = self
            .send_json::<(), (), AdminBrowscapStatusEnvelope>(
                request_id,
                Method::GET,
                "/admin/system/browscap",
                RequestConfig {
                    query: None::<&()>,
                    body: None::<&()>,
                    access_token: Some(access_token),
                    retryable: true,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminBrowscapStatusEnvelope| payload.data))
    }

    pub async fn update_admin_browscap(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> Result<Traced<AdminBrowscapStatus>, AppError> {
        let response = self
            .send_json::<(), (), AdminBrowscapStatusEnvelope>(
                request_id,
                Method::POST,
                "/admin/system/browscap/update",
                RequestConfig {
                    query: None::<&()>,
                    body: None::<&()>,
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminBrowscapStatusEnvelope| payload.data))
    }

    pub async fn convert_admin_browscap(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminBrowscapConvertInput,
    ) -> Result<Traced<AdminBrowscapConvertResult>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminBrowscapConvertEnvelope>(
                request_id,
                Method::POST,
                "/admin/system/browscap/convert",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminBrowscapConvertEnvelope| payload.data))
    }
}
