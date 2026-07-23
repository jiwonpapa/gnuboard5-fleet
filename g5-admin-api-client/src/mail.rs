use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::mail::{
    AdminMailDetail, AdminMailDetailEnvelope, AdminMailListEnvelope, AdminMailListQuery,
    AdminMailRecipient, AdminMailRecipientListEnvelope, AdminMailRecipientQuery,
    AdminMailSendEnvelope, AdminMailSendInput, AdminMailSendResult, AdminMailTemplate,
    AdminMailTemplateCreateInput, AdminMailTemplateUpdateInput, AdminSystemMailListQuery,
    AdminSystemMailRecipientListResponse, AdminSystemMailRecipientQuery,
    AdminSystemMailSendRequest, AdminSystemMailSendResponse, AdminSystemMailTemplateListResponse,
};
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::trace::Traced;
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_system_mails(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminSystemMailListQuery,
    ) -> Result<Traced<AdminSystemMailTemplateListResponse>, AppError> {
        self.send_query(
            request_id,
            Method::GET,
            "/admin/system/mails",
            query,
            Some(access_token),
            true,
        )
        .await
    }

    pub async fn get_admin_system_mail_recipients(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminSystemMailRecipientQuery,
    ) -> Result<Traced<AdminSystemMailRecipientListResponse>, AppError> {
        self.send_query(
            request_id,
            Method::GET,
            "/admin/system/mail-recipients",
            query,
            Some(access_token),
            true,
        )
        .await
    }

    pub async fn send_admin_system_mail(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminSystemMailSendRequest,
    ) -> Result<Traced<AdminSystemMailSendResponse>, AppError> {
        let body = input.to_payload();
        self.send_json::<(), _, AdminSystemMailSendResponse>(
            request_id,
            Method::POST,
            "/admin/system/mails/send",
            RequestConfig {
                query: None::<&()>,
                body: Some(&body),
                access_token: Some(access_token),
                retryable: false,
            },
        )
        .await
    }

    pub async fn get_admin_mails(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminMailListQuery,
    ) -> Result<Traced<(Vec<AdminMailTemplate>, Pagination)>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/mails",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminMailListEnvelope| (payload.data, payload.pagination)))
    }

    pub async fn get_admin_mail(
        &self,
        request_id: &str,
        access_token: &str,
        ma_id: i32,
    ) -> Result<Traced<AdminMailDetail>, AppError> {
        let response = self
            .send_json::<(), (), AdminMailDetailEnvelope>(
                request_id,
                Method::GET,
                &format!("/admin/mails/{ma_id}"),
                RequestConfig {
                    query: None::<&()>,
                    body: None::<&()>,
                    access_token: Some(access_token),
                    retryable: true,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminMailDetailEnvelope| payload.data))
    }

    pub async fn create_admin_mail_template(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminMailTemplateCreateInput,
    ) -> Result<Traced<AdminMailDetail>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminMailDetailEnvelope>(
                request_id,
                Method::POST,
                "/admin/mails/templates",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminMailDetailEnvelope| payload.data))
    }

    pub async fn update_admin_mail_template(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminMailTemplateUpdateInput,
    ) -> Result<Traced<AdminMailDetail>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminMailDetailEnvelope>(
                request_id,
                Method::PUT,
                &format!("/admin/mails/{}", input.ma_id),
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminMailDetailEnvelope| payload.data))
    }

    pub async fn delete_admin_mail(
        &self,
        request_id: &str,
        access_token: &str,
        ma_id: i32,
    ) -> Result<g5_admin_models::models::trace::ResponseTrace, AppError> {
        self.send_empty(
            request_id,
            Method::DELETE,
            &format!("/admin/mails/{ma_id}"),
            RequestConfig {
                query: None::<&()>,
                body: None::<&()>,
                access_token: Some(access_token),
                retryable: false,
            },
        )
        .await
    }

    pub async fn get_admin_mail_recipients(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminMailRecipientQuery,
    ) -> Result<Traced<(Vec<AdminMailRecipient>, Pagination)>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/mails/recipients",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response
            .map(|payload: AdminMailRecipientListEnvelope| (payload.data, payload.pagination)))
    }

    pub async fn send_admin_mail(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminMailSendInput,
    ) -> Result<Traced<AdminMailSendResult>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminMailSendEnvelope>(
                request_id,
                Method::POST,
                "/admin/mails",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminMailSendEnvelope| payload.data))
    }
}
