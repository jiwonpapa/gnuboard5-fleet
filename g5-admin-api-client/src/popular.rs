use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::popular::{
    AdminPopularItem, AdminPopularListEnvelope, AdminPopularListQuery, AdminPopularRankEnvelope,
    AdminPopularRankItem, AdminPopularRankQuery, AdminPopularResetEnvelope, AdminPopularResetInput,
    AdminPopularResetResult,
};
use g5_admin_models::models::trace::Traced;
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_populars(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminPopularListQuery,
    ) -> Result<Traced<(Vec<AdminPopularItem>, Pagination)>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/popular",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminPopularListEnvelope| (payload.data, payload.pagination)))
    }

    pub async fn reset_admin_populars(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPopularResetInput,
    ) -> Result<Traced<AdminPopularResetResult>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminPopularResetEnvelope>(
                request_id,
                Method::DELETE,
                "/admin/popular",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminPopularResetEnvelope| payload.data))
    }

    pub async fn get_admin_popular_ranks(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminPopularRankQuery,
    ) -> Result<Traced<(Vec<AdminPopularRankItem>, Pagination)>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/popular/rank",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminPopularRankEnvelope| (payload.data, payload.pagination)))
    }
}
