use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::sms_history::{
    AdminSmsBatchResendInput, AdminSmsDeliveryItem, AdminSmsDeliveryListEnvelope,
    AdminSmsDeliveryListQuery, AdminSmsMessageBatchDetail, AdminSmsMessageBatchDetailEnvelope,
    AdminSmsMessageBatchDetailQuery, AdminSmsMessageBatchItem, AdminSmsMessageBatchListEnvelope,
    AdminSmsMessageBatchListQuery,
};
use g5_admin_models::models::sms_message::{AdminSmsSendEnvelope, AdminSmsSendResult};
use g5_admin_models::models::trace::Traced;
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_sms_message_batches(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminSmsMessageBatchListQuery,
    ) -> Result<Traced<(Vec<AdminSmsMessageBatchItem>, Pagination)>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/sms/history/batches",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response
            .map(|payload: AdminSmsMessageBatchListEnvelope| (payload.data, payload.pagination)))
    }

    pub async fn get_admin_sms_message_batch_detail(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminSmsMessageBatchDetailQuery,
    ) -> Result<Traced<AdminSmsMessageBatchDetail>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                &format!("/admin/sms/history/batches/{}", query.wr_no),
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminSmsMessageBatchDetailEnvelope| payload.data))
    }

    pub async fn get_admin_sms_deliveries(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminSmsDeliveryListQuery,
    ) -> Result<Traced<(Vec<AdminSmsDeliveryItem>, Pagination)>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/sms/history/deliveries",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(
            response
                .map(|payload: AdminSmsDeliveryListEnvelope| (payload.data, payload.pagination)),
        )
    }

    pub async fn resend_admin_sms_batch_failures(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminSmsBatchResendInput,
    ) -> Result<Traced<AdminSmsSendResult>, AppError> {
        self.resend_admin_sms_batch(
            request_id,
            access_token,
            input,
            &format!("/admin/sms/history/batches/{}/resend-failures", input.wr_no),
        )
        .await
    }

    pub async fn resend_admin_sms_batch_all(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminSmsBatchResendInput,
    ) -> Result<Traced<AdminSmsSendResult>, AppError> {
        self.resend_admin_sms_batch(
            request_id,
            access_token,
            input,
            &format!("/admin/sms/history/batches/{}/resend-all", input.wr_no),
        )
        .await
    }

    async fn resend_admin_sms_batch(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminSmsBatchResendInput,
        target: &str,
    ) -> Result<Traced<AdminSmsSendResult>, AppError> {
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminSmsSendEnvelope>(
                request_id,
                Method::POST,
                target,
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminSmsSendEnvelope| payload.data))
    }
}
