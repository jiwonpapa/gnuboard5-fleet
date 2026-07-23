use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::point::{
    AdminPointActionEnvelope, AdminPointActionInput, AdminPointActionResult,
    AdminPointDeleteEnvelope, AdminPointDeleteInput, AdminPointDeleteResult,
    AdminPointExpireEnvelope, AdminPointExpireInput, AdminPointExpireResult, AdminPointItem,
    AdminPointListEnvelope, AdminPointListQuery, AdminPointSummary, AdminPointSummaryEnvelope,
};
use g5_admin_models::models::trace::Traced;
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_points(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminPointListQuery,
    ) -> Result<Traced<(Vec<AdminPointItem>, Pagination)>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/points",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminPointListEnvelope| (payload.data, payload.pagination)))
    }

    pub async fn get_admin_point_summary(
        &self,
        request_id: &str,
        access_token: &str,
        mb_id: Option<&str>,
    ) -> Result<Traced<AdminPointSummary>, AppError> {
        let query = mb_id
            .map(|member_id| [("mb_id", member_id)])
            .unwrap_or([("mb_id", "")]);

        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/points/summary",
                &query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminPointSummaryEnvelope| payload.data))
    }

    pub async fn grant_admin_point(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPointActionInput,
    ) -> Result<Traced<AdminPointActionResult>, AppError> {
        self.post_point_action(request_id, access_token, input, "grant")
            .await
    }

    pub async fn deduct_admin_point(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPointActionInput,
    ) -> Result<Traced<AdminPointActionResult>, AppError> {
        self.post_point_action(request_id, access_token, input, "deduct")
            .await
    }

    async fn post_point_action(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPointActionInput,
        action: &str,
    ) -> Result<Traced<AdminPointActionResult>, AppError> {
        let body = input.to_payload(action);
        let response = self
            .send_json::<(), _, AdminPointActionEnvelope>(
                request_id,
                Method::POST,
                "/admin/points",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminPointActionEnvelope| payload.data))
    }

    pub async fn grant_admin_point_legacy(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPointActionInput,
    ) -> Result<Traced<AdminPointActionResult>, AppError> {
        self.post_point_action_legacy(request_id, access_token, input, "/admin/points/grant")
            .await
    }

    pub async fn deduct_admin_point_legacy(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPointActionInput,
    ) -> Result<Traced<AdminPointActionResult>, AppError> {
        self.post_point_action_legacy(request_id, access_token, input, "/admin/points/deduct")
            .await
    }

    async fn post_point_action_legacy(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPointActionInput,
        target: &str,
    ) -> Result<Traced<AdminPointActionResult>, AppError> {
        let body = input.to_legacy_payload();
        let response = self
            .send_json::<(), _, AdminPointActionEnvelope>(
                request_id,
                Method::POST,
                target,
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminPointActionEnvelope| payload.data))
    }

    pub async fn delete_admin_points(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPointDeleteInput,
    ) -> Result<Traced<AdminPointDeleteResult>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminPointDeleteEnvelope>(
                request_id,
                Method::DELETE,
                "/admin/points",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminPointDeleteEnvelope| payload.data))
    }

    pub async fn expire_admin_points(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPointExpireInput,
    ) -> Result<Traced<AdminPointExpireResult>, AppError> {
        let body = input.to_payload("expire");
        let response = self
            .send_json::<(), _, AdminPointExpireEnvelope>(
                request_id,
                Method::POST,
                "/admin/points",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminPointExpireEnvelope| payload.data))
    }

    pub async fn expire_admin_points_legacy(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPointExpireInput,
    ) -> Result<Traced<AdminPointExpireResult>, AppError> {
        let body = input.to_legacy_payload();
        let response = self
            .send_json::<(), _, AdminPointExpireEnvelope>(
                request_id,
                Method::POST,
                "/admin/points/expire",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminPointExpireEnvelope| payload.data))
    }
}
