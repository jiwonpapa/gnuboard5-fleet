use super::super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::board_group::{
    AdminBoardGroup, AdminBoardGroupCreateInput, AdminBoardGroupDetailEnvelope,
    AdminBoardGroupListEnvelope, AdminBoardGroupUpdateInput,
};
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::trace::{ResponseTrace, Traced};
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_board_groups(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> Result<Traced<(Vec<AdminBoardGroup>, Pagination)>, AppError> {
        let response = self
            .send_json::<(), (), AdminBoardGroupListEnvelope>(
                request_id,
                Method::GET,
                "/admin/board-groups",
                RequestConfig {
                    query: None::<&()>,
                    body: None::<&()>,
                    access_token: Some(access_token),
                    retryable: true,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminBoardGroupListEnvelope| (payload.data, payload.pagination)))
    }

    pub async fn get_admin_board_group(
        &self,
        request_id: &str,
        access_token: &str,
        gr_id: &str,
    ) -> Result<Traced<AdminBoardGroup>, AppError> {
        let response = self
            .send_json::<(), (), AdminBoardGroupDetailEnvelope>(
                request_id,
                Method::GET,
                &format!("/admin/board-groups/{gr_id}"),
                RequestConfig {
                    query: None::<&()>,
                    body: None::<&()>,
                    access_token: Some(access_token),
                    retryable: true,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminBoardGroupDetailEnvelope| payload.data))
    }

    pub async fn create_admin_board_group(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminBoardGroupCreateInput,
    ) -> Result<Traced<AdminBoardGroup>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminBoardGroupDetailEnvelope>(
                request_id,
                Method::POST,
                "/admin/board-groups",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminBoardGroupDetailEnvelope| payload.data))
    }

    pub async fn update_admin_board_group(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminBoardGroupUpdateInput,
    ) -> Result<Traced<AdminBoardGroup>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminBoardGroupDetailEnvelope>(
                request_id,
                Method::PUT,
                &format!("/admin/board-groups/{}", input.gr_id),
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminBoardGroupDetailEnvelope| payload.data))
    }

    pub async fn patch_admin_board_group(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminBoardGroupUpdateInput,
    ) -> Result<Traced<AdminBoardGroup>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminBoardGroupDetailEnvelope>(
                request_id,
                Method::PATCH,
                &format!("/admin/board-groups/{}", input.gr_id),
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminBoardGroupDetailEnvelope| payload.data))
    }

    pub async fn delete_admin_board_group(
        &self,
        request_id: &str,
        access_token: &str,
        gr_id: &str,
    ) -> Result<ResponseTrace, AppError> {
        self.send_empty(
            request_id,
            Method::DELETE,
            &format!("/admin/board-groups/{gr_id}"),
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
