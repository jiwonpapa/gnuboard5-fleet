use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::permission::{
    AdminAuthDeleteInput, AdminAuthEnvelope, AdminAuthItem, AdminAuthListEnvelope,
    AdminAuthListQuery, AdminAuthUpsertInput, AdminPermissionDeleteInput, AdminPermissionEnvelope,
    AdminPermissionItem, AdminPermissionListEnvelope, AdminPermissionListQuery,
    AdminPermissionSaveInput,
};
use g5_admin_models::models::trace::{ResponseTrace, Traced};
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_permissions(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminPermissionListQuery,
    ) -> Result<Traced<(Vec<AdminPermissionItem>, Pagination)>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/system/auths",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminPermissionListEnvelope| (payload.data, payload.pagination)))
    }

    pub async fn save_admin_permission(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPermissionSaveInput,
    ) -> Result<Traced<AdminPermissionItem>, AppError> {
        let response = self
            .send_json::<(), _, AdminPermissionEnvelope>(
                request_id,
                Method::POST,
                "/admin/system/auths",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(input),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminPermissionEnvelope| payload.data))
    }

    pub async fn delete_admin_permission(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPermissionDeleteInput,
    ) -> Result<ResponseTrace, AppError> {
        let target = format!("/admin/system/auths/{}/{}", input.mb_id, input.au_menu);

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

    pub async fn get_admin_auth_list(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminAuthListQuery,
    ) -> Result<Traced<(Vec<AdminAuthItem>, Pagination)>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/auth",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminAuthListEnvelope| (payload.data, payload.pagination)))
    }

    pub async fn upsert_admin_auth(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminAuthUpsertInput,
    ) -> Result<Traced<AdminAuthItem>, AppError> {
        let target = format!("/admin/auth/{}", input.mb_id);
        let response = self
            .send_json::<(), _, AdminAuthEnvelope>(
                request_id,
                Method::PUT,
                &target,
                RequestConfig {
                    query: None::<&()>,
                    body: Some(input),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminAuthEnvelope| payload.data))
    }

    pub async fn delete_admin_auth_by_member(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminAuthDeleteInput,
    ) -> Result<ResponseTrace, AppError> {
        let target = format!("/admin/auth/{}", input.mb_id);

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
