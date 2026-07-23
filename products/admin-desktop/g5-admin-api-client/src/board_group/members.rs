use super::super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::board_group::{
    AdminBoardGroupMember, AdminBoardGroupMemberAddInput, AdminBoardGroupMemberEnvelope,
    AdminBoardGroupMemberListEnvelope, AdminBoardGroupMemberListQuery, AdminBoardGroupMemberResult,
};
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::trace::{ResponseTrace, Traced};
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_board_group_members(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminBoardGroupMemberListQuery,
    ) -> Result<Traced<(Vec<AdminBoardGroupMember>, Pagination)>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                &format!("/admin/board-groups/{}/members", query.gr_id),
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response
            .map(|payload: AdminBoardGroupMemberListEnvelope| (payload.data, payload.pagination)))
    }

    pub async fn add_admin_board_group_member(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminBoardGroupMemberAddInput,
    ) -> Result<Traced<AdminBoardGroupMemberResult>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminBoardGroupMemberEnvelope>(
                request_id,
                Method::POST,
                &format!("/admin/board-groups/{}/members", input.gr_id),
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminBoardGroupMemberEnvelope| payload.data))
    }

    pub async fn delete_admin_board_group_member(
        &self,
        request_id: &str,
        access_token: &str,
        gr_id: &str,
        mb_id: &str,
    ) -> Result<ResponseTrace, AppError> {
        self.send_empty(
            request_id,
            Method::DELETE,
            &format!("/admin/board-groups/{gr_id}/members/{mb_id}"),
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
