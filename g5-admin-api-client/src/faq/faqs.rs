use super::super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::faq::{
    AdminFaqCreateInput, AdminFaqDetailEnvelope, AdminFaqItem, AdminFaqListEnvelope,
    AdminFaqListQuery, AdminFaqUpdateInput,
};
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::trace::{ResponseTrace, Traced};
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_faqs(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminFaqListQuery,
    ) -> Result<Traced<(Vec<AdminFaqItem>, Pagination)>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/faqs",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminFaqListEnvelope| (payload.data, payload.pagination)))
    }

    pub async fn get_admin_faq(
        &self,
        request_id: &str,
        access_token: &str,
        faq_id: i32,
    ) -> Result<Traced<AdminFaqItem>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                &format!("/admin/faqs/{faq_id}"),
                &[("detail", "1")],
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminFaqDetailEnvelope| payload.data))
    }

    pub async fn create_admin_faq(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminFaqCreateInput,
    ) -> Result<Traced<AdminFaqItem>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminFaqDetailEnvelope>(
                request_id,
                Method::POST,
                "/admin/faqs",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminFaqDetailEnvelope| payload.data))
    }

    pub async fn update_admin_faq(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminFaqUpdateInput,
    ) -> Result<Traced<AdminFaqItem>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminFaqDetailEnvelope>(
                request_id,
                Method::PUT,
                &format!("/admin/faqs/{}", input.fa_id),
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminFaqDetailEnvelope| payload.data))
    }

    pub async fn delete_admin_faq(
        &self,
        request_id: &str,
        access_token: &str,
        faq_id: i32,
    ) -> Result<ResponseTrace, AppError> {
        self.send_empty(
            request_id,
            Method::DELETE,
            &format!("/admin/faqs/{faq_id}"),
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
