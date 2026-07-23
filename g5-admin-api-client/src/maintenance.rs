use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::maintenance::{AdminMaintenanceEnvelope, AdminMaintenanceResult};
use g5_admin_models::models::trace::Traced;
use reqwest::Method;

impl ApiClient {
    pub async fn purge_admin_session_files(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> Result<Traced<AdminMaintenanceResult>, AppError> {
        self.send_maintenance_command(
            request_id,
            access_token,
            "/admin/system/maintenance/session-files/purge",
        )
        .await
    }

    pub async fn purge_admin_cache_files(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> Result<Traced<AdminMaintenanceResult>, AppError> {
        self.send_maintenance_command(
            request_id,
            access_token,
            "/admin/system/maintenance/cache-files/purge",
        )
        .await
    }

    pub async fn purge_admin_captcha_files(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> Result<Traced<AdminMaintenanceResult>, AppError> {
        self.send_maintenance_command(
            request_id,
            access_token,
            "/admin/system/maintenance/captcha-files/purge",
        )
        .await
    }

    pub async fn purge_admin_thumbnail_files(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> Result<Traced<AdminMaintenanceResult>, AppError> {
        self.send_maintenance_command(
            request_id,
            access_token,
            "/admin/system/maintenance/thumbnail-files/purge",
        )
        .await
    }

    pub async fn purge_admin_member_list_files(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> Result<Traced<AdminMaintenanceResult>, AppError> {
        self.send_maintenance_command(
            request_id,
            access_token,
            "/admin/system/maintenance/member-list-files/purge",
        )
        .await
    }

    async fn send_maintenance_command(
        &self,
        request_id: &str,
        access_token: &str,
        target: &str,
    ) -> Result<Traced<AdminMaintenanceResult>, AppError> {
        let response = self
            .send_json::<(), (), AdminMaintenanceEnvelope>(
                request_id,
                Method::POST,
                target,
                RequestConfig {
                    query: None::<&()>,
                    body: None::<&()>,
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminMaintenanceEnvelope| payload.data))
    }
}
