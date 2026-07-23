use super::super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::sms_template::{
    AdminSmsTemplateBatchEnvelope, AdminSmsTemplateBatchInput, AdminSmsTemplateBatchResult,
    AdminSmsTemplateCreateInput, AdminSmsTemplateDetailEnvelope, AdminSmsTemplateItem,
    AdminSmsTemplateListEnvelope, AdminSmsTemplateListQuery, AdminSmsTemplateUpdateInput,
};
use g5_admin_models::models::trace::{ResponseTrace, Traced};
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_sms_templates(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminSmsTemplateListQuery,
    ) -> Result<Traced<(Vec<AdminSmsTemplateItem>, Pagination)>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/sms/templates",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(
            response
                .map(|payload: AdminSmsTemplateListEnvelope| (payload.data, payload.pagination)),
        )
    }

    pub async fn get_admin_sms_template(
        &self,
        request_id: &str,
        access_token: &str,
        template_id: i32,
    ) -> Result<Traced<AdminSmsTemplateItem>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                &format!("/admin/sms/templates/{template_id}"),
                &[("detail", "1")],
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminSmsTemplateDetailEnvelope| payload.data))
    }

    pub async fn create_admin_sms_template(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminSmsTemplateCreateInput,
    ) -> Result<Traced<AdminSmsTemplateItem>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminSmsTemplateDetailEnvelope>(
                request_id,
                Method::POST,
                "/admin/sms/templates",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminSmsTemplateDetailEnvelope| payload.data))
    }

    pub async fn update_admin_sms_template(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminSmsTemplateUpdateInput,
    ) -> Result<Traced<AdminSmsTemplateItem>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminSmsTemplateDetailEnvelope>(
                request_id,
                Method::PUT,
                &format!("/admin/sms/templates/{}", input.fo_no),
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminSmsTemplateDetailEnvelope| payload.data))
    }

    pub async fn delete_admin_sms_template(
        &self,
        request_id: &str,
        access_token: &str,
        template_id: i32,
    ) -> Result<ResponseTrace, AppError> {
        self.send_empty(
            request_id,
            Method::DELETE,
            &format!("/admin/sms/templates/{template_id}"),
            RequestConfig {
                query: None::<&()>,
                body: None::<&()>,
                access_token: Some(access_token),
                retryable: false,
            },
        )
        .await
    }

    pub async fn batch_admin_sms_templates(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminSmsTemplateBatchInput,
    ) -> Result<Traced<AdminSmsTemplateBatchResult>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminSmsTemplateBatchEnvelope>(
                request_id,
                Method::POST,
                "/admin/sms/templates/batch",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminSmsTemplateBatchEnvelope| payload.data))
    }
}
