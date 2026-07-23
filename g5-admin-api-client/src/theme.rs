use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::theme::{
    AdminTheme, AdminThemeConfig, AdminThemeConfigEnvelope, AdminThemeConfigUpdateInput,
    AdminThemeDetailEnvelope, AdminThemeListEnvelope,
};
use g5_admin_models::models::trace::Traced;
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_theme_config(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> Result<Traced<AdminThemeConfig>, AppError> {
        let response = self
            .send_json::<(), (), AdminThemeConfigEnvelope>(
                request_id,
                Method::GET,
                "/admin/system/theme",
                RequestConfig {
                    query: None::<&()>,
                    body: None::<&()>,
                    access_token: Some(access_token),
                    retryable: true,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminThemeConfigEnvelope| payload.data))
    }

    pub async fn update_admin_theme_config(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminThemeConfigUpdateInput,
    ) -> Result<Traced<AdminThemeConfig>, AppError> {
        let body = input.to_update_payload();

        let response = self
            .send_json::<(), _, AdminThemeConfigEnvelope>(
                request_id,
                Method::PUT,
                "/admin/system/theme",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminThemeConfigEnvelope| payload.data))
    }

    pub async fn get_admin_themes(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> Result<Traced<(Vec<AdminTheme>, i32)>, AppError> {
        let response = self
            .send_json::<(), (), AdminThemeListEnvelope>(
                request_id,
                Method::GET,
                "/admin/system/themes",
                RequestConfig {
                    query: None::<&()>,
                    body: None::<&()>,
                    access_token: Some(access_token),
                    retryable: true,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminThemeListEnvelope| {
            (payload.data, payload.meta.total.unwrap_or_default())
        }))
    }

    pub async fn get_admin_theme(
        &self,
        request_id: &str,
        access_token: &str,
        theme: &str,
    ) -> Result<Traced<AdminTheme>, AppError> {
        let target = format!("/admin/system/themes/{theme}");
        let response = self
            .send_json::<(), (), AdminThemeDetailEnvelope>(
                request_id,
                Method::GET,
                &target,
                RequestConfig {
                    query: None::<&()>,
                    body: None::<&()>,
                    access_token: Some(access_token),
                    retryable: true,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminThemeDetailEnvelope| payload.data))
    }
}
