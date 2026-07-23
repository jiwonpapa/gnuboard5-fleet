use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::qa::{
    AdminQaBulkDeleteEnvelope, AdminQaBulkDeleteInput, AdminQaBulkDeleteResult,
};
use g5_admin_models::models::trace::Traced;
use reqwest::Method;

impl ApiClient {
    pub async fn bulk_delete_admin_qa(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminQaBulkDeleteInput,
    ) -> Result<Traced<AdminQaBulkDeleteResult>, AppError> {
        let response = self
            .send_json::<(), _, AdminQaBulkDeleteEnvelope>(
                request_id,
                Method::DELETE,
                "/admin/qa",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(input),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminQaBulkDeleteEnvelope| payload.data))
    }
}
