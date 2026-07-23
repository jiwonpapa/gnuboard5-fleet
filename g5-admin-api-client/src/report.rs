use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::report::{
    AdminReportEnvelope, AdminReportItem, AdminReportListEnvelope, AdminReportListQuery,
    AdminReportStats, AdminReportStatsEnvelope, AdminReportUpdateInput,
};
use g5_admin_models::models::trace::Traced;
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_reports(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminReportListQuery,
    ) -> Result<Traced<(Vec<AdminReportItem>, Pagination)>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/reports",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminReportListEnvelope| (payload.data, payload.pagination)))
    }

    pub async fn get_admin_report_stats(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> Result<Traced<AdminReportStats>, AppError> {
        let response = self
            .send_json::<(), (), AdminReportStatsEnvelope>(
                request_id,
                Method::GET,
                "/admin/reports/stats",
                RequestConfig {
                    query: None::<&()>,
                    body: None::<&()>,
                    access_token: Some(access_token),
                    retryable: true,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminReportStatsEnvelope| payload.data))
    }

    pub async fn update_admin_report(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminReportUpdateInput,
    ) -> Result<Traced<AdminReportItem>, AppError> {
        let target = format!("/admin/reports/{}", input.report_id);
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminReportEnvelope>(
                request_id,
                Method::PATCH,
                &target,
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminReportEnvelope| payload.data))
    }
}
