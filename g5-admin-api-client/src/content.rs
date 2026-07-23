use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::content::{
    AdminContentCreateInput, AdminContentDetailEnvelope, AdminContentItem,
    AdminContentListEnvelope, AdminContentListQuery, AdminContentUpdateInput,
};
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::trace::Traced;
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_contents(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminContentListQuery,
    ) -> Result<Traced<(Vec<AdminContentItem>, Pagination)>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/contents",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminContentListEnvelope| (payload.data, payload.pagination)))
    }

    pub async fn get_admin_content(
        &self,
        request_id: &str,
        access_token: &str,
        content_id: &str,
    ) -> Result<Traced<AdminContentItem>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                &format!("/admin/contents/{content_id}"),
                &[("detail", "1")],
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminContentDetailEnvelope| payload.data))
    }

    pub async fn create_admin_content(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminContentCreateInput,
    ) -> Result<Traced<AdminContentItem>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminContentDetailEnvelope>(
                request_id,
                Method::POST,
                "/admin/contents",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminContentDetailEnvelope| payload.data))
    }

    pub async fn update_admin_content(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminContentUpdateInput,
    ) -> Result<Traced<AdminContentItem>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminContentDetailEnvelope>(
                request_id,
                Method::PUT,
                &format!("/admin/contents/{}", input.co_id),
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminContentDetailEnvelope| payload.data))
    }

    pub async fn delete_admin_content(
        &self,
        request_id: &str,
        access_token: &str,
        content_id: &str,
    ) -> Result<g5_admin_models::models::trace::ResponseTrace, AppError> {
        self.send_empty(
            request_id,
            Method::DELETE,
            &format!("/admin/contents/{content_id}"),
            RequestConfig {
                query: None::<&()>,
                body: None::<&()>,
                access_token: Some(access_token),
                retryable: false,
            },
        )
        .await
    }
}
