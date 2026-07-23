use super::super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::sms_template::{
    AdminSmsTemplateGroup, AdminSmsTemplateGroupClearEnvelope, AdminSmsTemplateGroupClearResult,
    AdminSmsTemplateGroupCreateInput, AdminSmsTemplateGroupDetailEnvelope,
    AdminSmsTemplateGroupListEnvelope, AdminSmsTemplateGroupMoveEnvelope,
    AdminSmsTemplateGroupMoveInput, AdminSmsTemplateGroupMoveResult,
    AdminSmsTemplateGroupUpdateInput,
};
use g5_admin_models::models::trace::{ResponseTrace, Traced};
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_sms_template_groups(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> Result<Traced<Vec<AdminSmsTemplateGroup>>, AppError> {
        let response = self
            .send_json::<(), (), AdminSmsTemplateGroupListEnvelope>(
                request_id,
                Method::GET,
                "/admin/sms/template-groups",
                RequestConfig {
                    query: None::<&()>,
                    body: None::<&()>,
                    access_token: Some(access_token),
                    retryable: true,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminSmsTemplateGroupListEnvelope| payload.data))
    }

    pub async fn get_admin_sms_template_group(
        &self,
        request_id: &str,
        access_token: &str,
        group_id: i32,
    ) -> Result<Traced<AdminSmsTemplateGroup>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                &format!("/admin/sms/template-groups/{group_id}"),
                &[("detail", "1")],
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminSmsTemplateGroupDetailEnvelope| payload.data))
    }

    pub async fn create_admin_sms_template_group(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminSmsTemplateGroupCreateInput,
    ) -> Result<Traced<AdminSmsTemplateGroup>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminSmsTemplateGroupDetailEnvelope>(
                request_id,
                Method::POST,
                "/admin/sms/template-groups",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminSmsTemplateGroupDetailEnvelope| payload.data))
    }

    pub async fn update_admin_sms_template_group(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminSmsTemplateGroupUpdateInput,
    ) -> Result<Traced<AdminSmsTemplateGroup>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminSmsTemplateGroupDetailEnvelope>(
                request_id,
                Method::PUT,
                &format!("/admin/sms/template-groups/{}", input.fg_no),
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminSmsTemplateGroupDetailEnvelope| payload.data))
    }

    pub async fn delete_admin_sms_template_group(
        &self,
        request_id: &str,
        access_token: &str,
        group_id: i32,
    ) -> Result<ResponseTrace, AppError> {
        self.send_empty(
            request_id,
            Method::DELETE,
            &format!("/admin/sms/template-groups/{group_id}"),
            RequestConfig {
                query: None::<&()>,
                body: None::<&()>,
                access_token: Some(access_token),
                retryable: false,
            },
        )
        .await
    }

    pub async fn move_admin_sms_template_group(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminSmsTemplateGroupMoveInput,
    ) -> Result<Traced<AdminSmsTemplateGroupMoveResult>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminSmsTemplateGroupMoveEnvelope>(
                request_id,
                Method::POST,
                &format!("/admin/sms/template-groups/{}/move", input.fg_no),
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminSmsTemplateGroupMoveEnvelope| payload.data))
    }

    pub async fn clear_admin_sms_template_group(
        &self,
        request_id: &str,
        access_token: &str,
        group_id: i32,
    ) -> Result<Traced<AdminSmsTemplateGroupClearResult>, AppError> {
        let response = self
            .send_json::<(), (), AdminSmsTemplateGroupClearEnvelope>(
                request_id,
                Method::DELETE,
                &format!("/admin/sms/template-groups/{group_id}/templates"),
                RequestConfig {
                    query: None::<&()>,
                    body: None::<&()>,
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminSmsTemplateGroupClearEnvelope| payload.data))
    }
}
