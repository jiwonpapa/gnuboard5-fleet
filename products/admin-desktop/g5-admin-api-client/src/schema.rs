use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::schema::{
    AdminSchemaCatalog, AdminSchemaCatalogEnvelope, AdminSchemaDetail, AdminSchemaDetailEnvelope,
};
use g5_admin_models::models::trace::Traced;
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_schema_catalog(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> Result<Traced<AdminSchemaCatalog>, AppError> {
        let response = self
            .send_json::<(), (), AdminSchemaCatalogEnvelope>(
                request_id,
                Method::GET,
                "/admin/schema",
                RequestConfig {
                    query: None::<&()>,
                    body: None::<&()>,
                    access_token: Some(access_token),
                    retryable: true,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminSchemaCatalogEnvelope| payload.data))
    }

    pub async fn get_admin_schema(
        &self,
        request_id: &str,
        access_token: &str,
        domain: &str,
    ) -> Result<Traced<AdminSchemaDetail>, AppError> {
        let target = format!("/admin/schema/{domain}");
        let response = self
            .send_json::<(), (), AdminSchemaDetailEnvelope>(
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

        Ok(response.map(|payload: AdminSchemaDetailEnvelope| payload.data))
    }
}
