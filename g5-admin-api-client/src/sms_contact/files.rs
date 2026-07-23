use super::super::{ApiClient, MultipartFileUpload, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::sms_contact::{
    AdminSmsContactExportEnvelope, AdminSmsContactExportItem, AdminSmsContactExportQuery,
    AdminSmsContactImportEnvelope, AdminSmsContactImportInput, AdminSmsContactImportResult,
};
use g5_admin_models::models::trace::Traced;
use reqwest::Method;

impl ApiClient {
    pub async fn import_admin_sms_contacts(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminSmsContactImportInput,
    ) -> Result<Traced<AdminSmsContactImportResult>, AppError> {
        if let (Some(bytes), Some(file_name)) = (&input.bytes, &input.file_name) {
            let response = self
                .send_multipart::<AdminSmsContactImportEnvelope>(
                    request_id,
                    Method::POST,
                    "/admin/sms/contacts/import",
                    vec![
                        ("bg_no".to_string(), input.bg_no.to_string()),
                        (
                            "dry_run".to_string(),
                            if input.dry_run { "1" } else { "0" }.to_string(),
                        ),
                    ],
                    MultipartFileUpload {
                        field_name: "file".to_string(),
                        file_name: file_name.clone(),
                        mime_type: input
                            .mime_type
                            .clone()
                            .unwrap_or_else(|| "application/octet-stream".to_string()),
                        bytes: bytes.clone(),
                    },
                    Some(access_token),
                    false,
                )
                .await?;

            return Ok(response.map(|payload: AdminSmsContactImportEnvelope| payload.data));
        }

        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminSmsContactImportEnvelope>(
                request_id,
                Method::POST,
                "/admin/sms/contacts/import",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminSmsContactImportEnvelope| payload.data))
    }

    pub async fn export_admin_sms_contacts(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminSmsContactExportQuery,
    ) -> Result<Traced<(Vec<AdminSmsContactExportItem>, i32, Option<i32>, bool, bool)>, AppError>
    {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/sms/contacts/export",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminSmsContactExportEnvelope| {
            (
                payload.data,
                payload.meta.total,
                payload.meta.bg_no,
                payload.meta.include_no_phone,
                payload.meta.with_hyphen,
            )
        }))
    }
}
