use super::ApiClient;
use crate::error::AppError;
use g5_admin_models::models::trace::Traced;
use g5_admin_models::models::write_count::{
    AdminWriteCountStatsData, AdminWriteCountStatsEnvelope, AdminWriteCountStatsQuery,
};
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_write_count_stats(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminWriteCountStatsQuery,
    ) -> Result<Traced<AdminWriteCountStatsData>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/write-count/stats",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminWriteCountStatsEnvelope| payload.data))
    }
}
