use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::menu::{
    AdminMenu, AdminMenuCreateInput, AdminMenuDeleteInput, AdminMenuDetailEnvelope,
    AdminMenuListEnvelope, AdminMenuReorderEnvelope, AdminMenuReorderInput,
    AdminMenuReorderPayload, AdminMenuUpdateInput,
};
use g5_admin_models::models::trace::{ResponseTrace, Traced};
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_menus(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> Result<Traced<(Vec<AdminMenu>, Pagination)>, AppError> {
        let response = self
            .send_json::<(), (), AdminMenuListEnvelope>(
                request_id,
                Method::GET,
                "/admin/menus",
                RequestConfig {
                    query: None::<&()>,
                    body: None::<&()>,
                    access_token: Some(access_token),
                    retryable: true,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminMenuListEnvelope| (payload.data, payload.pagination)))
    }

    pub async fn get_admin_menu(
        &self,
        request_id: &str,
        access_token: &str,
        me_id: i32,
    ) -> Result<Traced<AdminMenu>, AppError> {
        let target = format!("/admin/menus/{me_id}");
        let response = self
            .send_json::<(), (), AdminMenuDetailEnvelope>(
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

        Ok(response.map(|payload: AdminMenuDetailEnvelope| payload.data))
    }

    pub async fn create_admin_menu(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminMenuCreateInput,
    ) -> Result<Traced<AdminMenu>, AppError> {
        let body = input.to_create_payload();
        let response = self
            .send_json::<(), _, AdminMenuDetailEnvelope>(
                request_id,
                Method::POST,
                "/admin/menus",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminMenuDetailEnvelope| payload.data))
    }

    pub async fn update_admin_menu(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminMenuUpdateInput,
    ) -> Result<Traced<AdminMenu>, AppError> {
        let target = format!("/admin/menus/{}", input.me_id);
        let body = input.to_update_payload();
        let response = self
            .send_json::<(), _, AdminMenuDetailEnvelope>(
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

        Ok(response.map(|payload: AdminMenuDetailEnvelope| payload.data))
    }

    pub async fn delete_admin_menu(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminMenuDeleteInput,
    ) -> Result<ResponseTrace, AppError> {
        let target = format!("/admin/menus/{}", input.me_id);

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

    pub async fn reorder_admin_menus(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminMenuReorderInput,
    ) -> Result<Traced<AdminMenuReorderPayload>, AppError> {
        let body = input.to_reorder_payload();
        let response = self
            .send_json::<(), _, AdminMenuReorderEnvelope>(
                request_id,
                Method::PATCH,
                "/admin/menus",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminMenuReorderEnvelope| payload.data))
    }

    pub async fn reorder_admin_menus_legacy(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminMenuReorderInput,
    ) -> Result<Traced<AdminMenuReorderPayload>, AppError> {
        let body = input.to_reorder_payload();
        let response = self
            .send_json::<(), _, AdminMenuReorderEnvelope>(
                request_id,
                Method::PATCH,
                "/admin/menus/reorder",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminMenuReorderEnvelope| payload.data))
    }
}
