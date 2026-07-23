use super::super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::faq::{
    AdminFaqMasterCreateInput, AdminFaqMasterDetail, AdminFaqMasterDetailEnvelope,
    AdminFaqMasterListEnvelope, AdminFaqMasterListQuery, AdminFaqMasterSummary,
    AdminFaqMasterUpdateInput,
};
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::trace::{ResponseTrace, Traced};
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_faq_masters(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminFaqMasterListQuery,
    ) -> Result<Traced<(Vec<AdminFaqMasterSummary>, Pagination)>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/faq-masters",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminFaqMasterListEnvelope| (payload.data, payload.pagination)))
    }

    pub async fn get_admin_faq_master(
        &self,
        request_id: &str,
        access_token: &str,
        master_id: i32,
    ) -> Result<Traced<AdminFaqMasterDetail>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                &format!("/admin/faq-masters/{master_id}"),
                &[("detail", "1")],
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminFaqMasterDetailEnvelope| payload.data))
    }

    pub async fn create_admin_faq_master(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminFaqMasterCreateInput,
    ) -> Result<Traced<AdminFaqMasterDetail>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminFaqMasterDetailEnvelope>(
                request_id,
                Method::POST,
                "/admin/faq-masters",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminFaqMasterDetailEnvelope| payload.data))
    }

    pub async fn update_admin_faq_master(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminFaqMasterUpdateInput,
    ) -> Result<Traced<AdminFaqMasterDetail>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminFaqMasterDetailEnvelope>(
                request_id,
                Method::PUT,
                &format!("/admin/faq-masters/{}", input.fm_id),
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminFaqMasterDetailEnvelope| payload.data))
    }

    pub async fn delete_admin_faq_master(
        &self,
        request_id: &str,
        access_token: &str,
        master_id: i32,
    ) -> Result<ResponseTrace, AppError> {
        self.send_empty(
            request_id,
            Method::DELETE,
            &format!("/admin/faq-masters/{master_id}"),
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
