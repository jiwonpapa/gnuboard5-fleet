use super::super::{ApiClient, MultipartFileUpload, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::faq::{
    AdminFaqImage, AdminFaqImageEnvelope, AdminFaqImageUploadInput,
};
use g5_admin_models::models::trace::Traced;
use reqwest::Method;

impl ApiClient {
    pub async fn upload_admin_faq_master_header_image(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminFaqImageUploadInput,
    ) -> Result<Traced<AdminFaqImage>, AppError> {
        self.upload_admin_faq_master_image(
            request_id,
            access_token,
            input,
            &format!("/admin/faq-masters/{}/header-image", input.fm_id),
        )
        .await
    }

    pub async fn delete_admin_faq_master_header_image(
        &self,
        request_id: &str,
        access_token: &str,
        master_id: i32,
    ) -> Result<Traced<AdminFaqImage>, AppError> {
        self.delete_admin_faq_master_image(
            request_id,
            access_token,
            &format!("/admin/faq-masters/{master_id}/header-image"),
        )
        .await
    }

    pub async fn upload_admin_faq_master_footer_image(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminFaqImageUploadInput,
    ) -> Result<Traced<AdminFaqImage>, AppError> {
        self.upload_admin_faq_master_image(
            request_id,
            access_token,
            input,
            &format!("/admin/faq-masters/{}/footer-image", input.fm_id),
        )
        .await
    }

    pub async fn delete_admin_faq_master_footer_image(
        &self,
        request_id: &str,
        access_token: &str,
        master_id: i32,
    ) -> Result<Traced<AdminFaqImage>, AppError> {
        self.delete_admin_faq_master_image(
            request_id,
            access_token,
            &format!("/admin/faq-masters/{master_id}/footer-image"),
        )
        .await
    }

    async fn upload_admin_faq_master_image(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminFaqImageUploadInput,
        target: &str,
    ) -> Result<Traced<AdminFaqImage>, AppError> {
        let response = self
            .send_multipart::<AdminFaqImageEnvelope>(
                request_id,
                Method::POST,
                target,
                Vec::new(),
                MultipartFileUpload {
                    field_name: "file".to_string(),
                    file_name: input.file_name.clone(),
                    mime_type: input
                        .mime_type
                        .clone()
                        .unwrap_or_else(|| "application/octet-stream".to_string()),
                    bytes: input.bytes.clone(),
                },
                Some(access_token),
                false,
            )
            .await?;

        Ok(response.map(|payload: AdminFaqImageEnvelope| payload.data))
    }

    async fn delete_admin_faq_master_image(
        &self,
        request_id: &str,
        access_token: &str,
        target: &str,
    ) -> Result<Traced<AdminFaqImage>, AppError> {
        let response = self
            .send_json::<(), (), AdminFaqImageEnvelope>(
                request_id,
                Method::DELETE,
                target,
                RequestConfig {
                    query: None::<&()>,
                    body: None::<&()>,
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminFaqImageEnvelope| payload.data))
    }
}
