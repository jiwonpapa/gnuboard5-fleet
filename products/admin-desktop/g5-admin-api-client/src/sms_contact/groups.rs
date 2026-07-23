use super::super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::sms_contact::{
    AdminSmsContactGroup, AdminSmsContactGroupClearEnvelope, AdminSmsContactGroupClearResult,
    AdminSmsContactGroupCreateInput, AdminSmsContactGroupDetailEnvelope,
    AdminSmsContactGroupListEnvelope, AdminSmsContactGroupMoveEnvelope,
    AdminSmsContactGroupMoveInput, AdminSmsContactGroupMoveResult, AdminSmsContactGroupUpdateInput,
};
use g5_admin_models::models::trace::{ResponseTrace, Traced};
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_sms_contact_groups(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> Result<Traced<Vec<AdminSmsContactGroup>>, AppError> {
        let response = self
            .send_json::<(), (), AdminSmsContactGroupListEnvelope>(
                request_id,
                Method::GET,
                "/admin/sms/contact-groups",
                RequestConfig {
                    query: None::<&()>,
                    body: None::<&()>,
                    access_token: Some(access_token),
                    retryable: true,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminSmsContactGroupListEnvelope| payload.data))
    }

    pub async fn get_admin_sms_contact_group(
        &self,
        request_id: &str,
        access_token: &str,
        group_id: i32,
    ) -> Result<Traced<AdminSmsContactGroup>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                &format!("/admin/sms/contact-groups/{group_id}"),
                &[("detail", "1")],
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminSmsContactGroupDetailEnvelope| payload.data))
    }

    pub async fn create_admin_sms_contact_group(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminSmsContactGroupCreateInput,
    ) -> Result<Traced<AdminSmsContactGroup>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminSmsContactGroupDetailEnvelope>(
                request_id,
                Method::POST,
                "/admin/sms/contact-groups",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminSmsContactGroupDetailEnvelope| payload.data))
    }

    pub async fn update_admin_sms_contact_group(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminSmsContactGroupUpdateInput,
    ) -> Result<Traced<AdminSmsContactGroup>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminSmsContactGroupDetailEnvelope>(
                request_id,
                Method::PUT,
                &format!("/admin/sms/contact-groups/{}", input.bg_no),
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminSmsContactGroupDetailEnvelope| payload.data))
    }

    pub async fn delete_admin_sms_contact_group(
        &self,
        request_id: &str,
        access_token: &str,
        group_id: i32,
    ) -> Result<ResponseTrace, AppError> {
        self.send_empty(
            request_id,
            Method::DELETE,
            &format!("/admin/sms/contact-groups/{group_id}"),
            RequestConfig {
                query: None::<&()>,
                body: None::<&()>,
                access_token: Some(access_token),
                retryable: false,
            },
        )
        .await
    }

    pub async fn move_admin_sms_contact_group(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminSmsContactGroupMoveInput,
    ) -> Result<Traced<AdminSmsContactGroupMoveResult>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminSmsContactGroupMoveEnvelope>(
                request_id,
                Method::POST,
                &format!("/admin/sms/contact-groups/{}/move", input.bg_no),
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminSmsContactGroupMoveEnvelope| payload.data))
    }

    pub async fn clear_admin_sms_contact_group(
        &self,
        request_id: &str,
        access_token: &str,
        group_id: i32,
    ) -> Result<Traced<AdminSmsContactGroupClearResult>, AppError> {
        let response = self
            .send_json::<(), (), AdminSmsContactGroupClearEnvelope>(
                request_id,
                Method::DELETE,
                &format!("/admin/sms/contact-groups/{group_id}/contacts"),
                RequestConfig {
                    query: None::<&()>,
                    body: None::<&()>,
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminSmsContactGroupClearEnvelope| payload.data))
    }
}
