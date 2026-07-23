use super::super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::member::{
    AdminMemberDeleteInput, AdminMemberDetail, AdminMemberDetailEnvelope,
    AdminMemberLevelUpdateInput, AdminMemberListEnvelope, AdminMemberListItem,
    AdminMemberListQuery, AdminMemberUpdateInput, Pagination,
};
use g5_admin_models::models::trace::{ResponseTrace, Traced};
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_members(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminMemberListQuery,
    ) -> Result<Traced<(Vec<AdminMemberListItem>, Pagination)>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/members",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminMemberListEnvelope| (payload.data, payload.pagination)))
    }

    pub async fn export_admin_members_excel(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminMemberListQuery,
    ) -> Result<Traced<(Vec<AdminMemberListItem>, Pagination)>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/members/excel",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminMemberListEnvelope| (payload.data, payload.pagination)))
    }

    pub async fn get_admin_member(
        &self,
        request_id: &str,
        access_token: &str,
        mb_id: &str,
    ) -> Result<Traced<AdminMemberDetail>, AppError> {
        let target = format!("/admin/members/{mb_id}");
        let response = self
            .send_json::<(), (), AdminMemberDetailEnvelope>(
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

        Ok(response.map(|payload: AdminMemberDetailEnvelope| payload.data))
    }

    pub async fn update_admin_member_level(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminMemberLevelUpdateInput,
    ) -> Result<Traced<AdminMemberDetail>, AppError> {
        let target = format!("/admin/members/{}/level", input.mb_id);
        let body = serde_json::json!({
            "mb_level": input.mb_level,
        });

        let response = self
            .send_json::<(), _, AdminMemberDetailEnvelope>(
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

        Ok(response.map(|payload: AdminMemberDetailEnvelope| payload.data))
    }

    pub async fn update_admin_member(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminMemberUpdateInput,
    ) -> Result<Traced<AdminMemberDetail>, AppError> {
        let target = format!("/admin/members/{}", input.mb_id);
        let body = input.to_patch_payload();

        let response = self
            .send_json::<(), _, AdminMemberDetailEnvelope>(
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

        Ok(response.map(|payload: AdminMemberDetailEnvelope| payload.data))
    }

    pub async fn delete_admin_member(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminMemberDeleteInput,
    ) -> Result<ResponseTrace, AppError> {
        let target = format!("/admin/members/{}", input.mb_id);

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
}
