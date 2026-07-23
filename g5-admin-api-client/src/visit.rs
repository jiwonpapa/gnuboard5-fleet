use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::trace::Traced;
use g5_admin_models::models::visit::{
    AdminVisitDeleteEnvelope, AdminVisitDeleteInput, AdminVisitDeleteResult, AdminVisitLogItem,
    AdminVisitSearchEnvelope, AdminVisitSearchQuery, AdminVisitStatItem, AdminVisitStatsEnvelope,
    AdminVisitStatsQuery, AdminVisitStatsSummary,
};
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_visit_stats(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminVisitStatsQuery,
    ) -> Result<Traced<(String, AdminVisitStatsSummary, Vec<AdminVisitStatItem>)>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/visits/stats",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(
            |payload: AdminVisitStatsEnvelope| -> (String, AdminVisitStatsSummary, Vec<AdminVisitStatItem>) {
                (
                    payload.data.r#type,
                    payload.data.summary,
                    payload.data.items,
                )
            },
        ))
    }

    pub async fn search_admin_visits(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminVisitSearchQuery,
    ) -> Result<Traced<(Vec<AdminVisitLogItem>, Pagination)>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/visits/search",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminVisitSearchEnvelope| (payload.data, payload.pagination)))
    }

    pub async fn delete_admin_visits(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminVisitDeleteInput,
    ) -> Result<Traced<AdminVisitDeleteResult>, AppError> {
        let body = input.to_payload();

        let response = self
            .send_json::<(), _, AdminVisitDeleteEnvelope>(
                request_id,
                Method::DELETE,
                "/admin/visits",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminVisitDeleteEnvelope| payload.data))
    }
}
