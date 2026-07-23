use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::board::{
    AdminBoard, AdminBoardCopyInput, AdminBoardCreateInput, AdminBoardDeleteInput,
    AdminBoardDetailEnvelope, AdminBoardListEnvelope, AdminBoardListQuery,
    AdminBoardNewPostDeleteEnvelope, AdminBoardNewPostDeleteInput, AdminBoardNewPostDeleteResult,
    AdminBoardUpdateInput,
};
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::trace::{ResponseTrace, Traced};
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_boards(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminBoardListQuery,
    ) -> Result<Traced<(Vec<AdminBoard>, Pagination)>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/boards",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminBoardListEnvelope| (payload.data, payload.pagination)))
    }

    pub async fn get_admin_board(
        &self,
        request_id: &str,
        access_token: &str,
        bo_table: &str,
    ) -> Result<Traced<AdminBoard>, AppError> {
        let target = format!("/admin/boards/{bo_table}");
        let response = self
            .send_json::<(), (), AdminBoardDetailEnvelope>(
                request_id,
                Method::GET,
                &target,
                RequestConfig {
                    query: None::<&()>,
                    body: None::<&()>,
                    access_token: Some(access_token),
                    retryable: true,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminBoardDetailEnvelope| payload.data))
    }

    pub async fn create_admin_board(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminBoardCreateInput,
    ) -> Result<Traced<AdminBoard>, AppError> {
        let body = input.to_create_payload();

        let response = self
            .send_json::<(), _, AdminBoardDetailEnvelope>(
                request_id,
                Method::POST,
                "/admin/boards",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminBoardDetailEnvelope| payload.data))
    }

    pub async fn update_admin_board(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminBoardUpdateInput,
    ) -> Result<Traced<AdminBoard>, AppError> {
        let target = format!("/admin/boards/{}", input.bo_table);
        let body = input.to_update_payload();

        let response = self
            .send_json::<(), _, AdminBoardDetailEnvelope>(
                request_id,
                Method::PUT,
                &target,
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminBoardDetailEnvelope| payload.data))
    }

    pub async fn delete_admin_board(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminBoardDeleteInput,
    ) -> Result<ResponseTrace, AppError> {
        let target = format!("/admin/boards/{}", input.bo_table);

        self.send_empty::<(), ()>(
            request_id,
            Method::DELETE,
            &target,
            RequestConfig {
                query: None::<&()>,
                body: None::<&()>,
                access_token: Some(access_token),
                retryable: false,
            },
        )
        .await
    }

    pub async fn copy_admin_board(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminBoardCopyInput,
    ) -> Result<Traced<AdminBoard>, AppError> {
        let target = format!("/admin/boards/{}/copy", input.bo_table);
        let body = input.to_payload();

        let response = self
            .send_json::<(), _, AdminBoardDetailEnvelope>(
                request_id,
                Method::POST,
                &target,
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminBoardDetailEnvelope| payload.data))
    }

    pub async fn delete_admin_board_new_posts(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminBoardNewPostDeleteInput,
    ) -> Result<Traced<AdminBoardNewPostDeleteResult>, AppError> {
        let body = input.to_payload();

        let response = self
            .send_json::<(), _, AdminBoardNewPostDeleteEnvelope>(
                request_id,
                Method::DELETE,
                "/admin/boards/new-posts",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminBoardNewPostDeleteEnvelope| payload.data))
    }
}
