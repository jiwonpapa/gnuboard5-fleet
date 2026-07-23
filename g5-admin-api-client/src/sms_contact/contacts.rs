use super::super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::sms_contact::{
    AdminSmsContactBatchEnvelope, AdminSmsContactBatchInput, AdminSmsContactBatchResult,
    AdminSmsContactCreateInput, AdminSmsContactDetailEnvelope, AdminSmsContactItem,
    AdminSmsContactListEnvelope, AdminSmsContactListQuery, AdminSmsContactSummary,
    AdminSmsContactUpdateInput,
};
use g5_admin_models::models::trace::{ResponseTrace, Traced};
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_sms_contacts(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminSmsContactListQuery,
    ) -> Result<Traced<(Vec<AdminSmsContactItem>, Pagination, AdminSmsContactSummary)>, AppError>
    {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/sms/contacts",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminSmsContactListEnvelope| {
            (
                payload.data,
                payload.pagination,
                AdminSmsContactSummary {
                    total_count: payload.meta.total_count,
                    receipt_count: payload.meta.receipt_count,
                    reject_count: payload.meta.reject_count,
                    member_count: payload.meta.member_count,
                    non_member_count: payload.meta.non_member_count,
                    last_synced_at: payload.meta.last_synced_at,
                },
            )
        }))
    }

    pub async fn get_admin_sms_contact(
        &self,
        request_id: &str,
        access_token: &str,
        contact_id: i32,
    ) -> Result<Traced<AdminSmsContactItem>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                &format!("/admin/sms/contacts/{contact_id}"),
                &[("detail", "1")],
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminSmsContactDetailEnvelope| payload.data))
    }

    pub async fn create_admin_sms_contact(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminSmsContactCreateInput,
    ) -> Result<Traced<AdminSmsContactItem>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminSmsContactDetailEnvelope>(
                request_id,
                Method::POST,
                "/admin/sms/contacts",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminSmsContactDetailEnvelope| payload.data))
    }

    pub async fn update_admin_sms_contact(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminSmsContactUpdateInput,
    ) -> Result<Traced<AdminSmsContactItem>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminSmsContactDetailEnvelope>(
                request_id,
                Method::PUT,
                &format!("/admin/sms/contacts/{}", input.bk_no),
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminSmsContactDetailEnvelope| payload.data))
    }

    pub async fn delete_admin_sms_contact(
        &self,
        request_id: &str,
        access_token: &str,
        contact_id: i32,
    ) -> Result<ResponseTrace, AppError> {
        self.send_empty(
            request_id,
            Method::DELETE,
            &format!("/admin/sms/contacts/{contact_id}"),
            RequestConfig {
                query: None::<&()>,
                body: None::<&()>,
                access_token: Some(access_token),
                retryable: false,
            },
        )
        .await
    }

    pub async fn batch_admin_sms_contacts(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminSmsContactBatchInput,
    ) -> Result<Traced<AdminSmsContactBatchResult>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminSmsContactBatchEnvelope>(
                request_id,
                Method::POST,
                "/admin/sms/contacts/batch",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminSmsContactBatchEnvelope| payload.data))
    }
}
