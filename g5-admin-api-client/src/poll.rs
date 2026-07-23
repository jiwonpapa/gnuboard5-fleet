use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::poll::{
    AdminPoll, AdminPollCreateInput, AdminPollDeleteInput, AdminPollDetailEnvelope,
    AdminPollListEnvelope, AdminPollListQuery, AdminPollUpdateInput,
};
use g5_admin_models::models::trace::{ResponseTrace, Traced};
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_polls(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminPollListQuery,
    ) -> Result<Traced<(Vec<AdminPoll>, Pagination)>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/system/polls",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminPollListEnvelope| (payload.data, payload.pagination)))
    }

    pub async fn get_admin_poll(
        &self,
        request_id: &str,
        access_token: &str,
        po_id: i32,
    ) -> Result<Traced<AdminPoll>, AppError> {
        let target = format!("/admin/system/polls/{po_id}");
        let response = self
            .send_json::<(), (), AdminPollDetailEnvelope>(
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

        Ok(response.map(|payload: AdminPollDetailEnvelope| payload.data))
    }

    pub async fn create_admin_poll(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPollCreateInput,
    ) -> Result<Traced<AdminPoll>, AppError> {
        let body = input.to_create_payload();

        let response = self
            .send_json::<(), _, AdminPollDetailEnvelope>(
                request_id,
                Method::POST,
                "/admin/system/polls",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminPollDetailEnvelope| payload.data))
    }

    pub async fn update_admin_poll(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPollUpdateInput,
    ) -> Result<Traced<AdminPoll>, AppError> {
        let target = format!("/admin/system/polls/{}", input.po_id);
        let body = input.to_update_payload();

        let response = self
            .send_json::<(), _, AdminPollDetailEnvelope>(
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

        Ok(response.map(|payload: AdminPollDetailEnvelope| payload.data))
    }

    pub async fn get_admin_polls_legacy(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminPollListQuery,
    ) -> Result<Traced<(Vec<AdminPoll>, Pagination)>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/polls",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminPollListEnvelope| (payload.data, payload.pagination)))
    }

    pub async fn get_admin_poll_legacy(
        &self,
        request_id: &str,
        access_token: &str,
        po_id: i32,
    ) -> Result<Traced<AdminPoll>, AppError> {
        let target = format!("/admin/polls/{po_id}");
        let response = self
            .send_json::<(), (), AdminPollDetailEnvelope>(
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

        Ok(response.map(|payload: AdminPollDetailEnvelope| payload.data))
    }

    pub async fn create_admin_poll_legacy(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPollCreateInput,
    ) -> Result<Traced<AdminPoll>, AppError> {
        let body = input.to_create_payload();

        let response = self
            .send_json::<(), _, AdminPollDetailEnvelope>(
                request_id,
                Method::POST,
                "/admin/polls",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminPollDetailEnvelope| payload.data))
    }

    pub async fn update_admin_poll_legacy(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPollUpdateInput,
    ) -> Result<Traced<AdminPoll>, AppError> {
        let target = format!("/admin/polls/{}", input.po_id);
        let body = input.to_update_payload();

        let response = self
            .send_json::<(), _, AdminPollDetailEnvelope>(
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

        Ok(response.map(|payload: AdminPollDetailEnvelope| payload.data))
    }

    pub async fn delete_admin_poll_legacy(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPollDeleteInput,
    ) -> Result<ResponseTrace, AppError> {
        let target = format!("/admin/polls/{}", input.po_id);

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

    pub async fn delete_admin_poll(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPollDeleteInput,
    ) -> Result<ResponseTrace, AppError> {
        let target = format!("/admin/system/polls/{}", input.po_id);

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
