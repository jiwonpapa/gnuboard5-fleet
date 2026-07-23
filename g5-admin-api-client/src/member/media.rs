use super::super::{ApiClient, MultipartFileUpload, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::member::{
    AdminMemberMediaEnvelope, AdminMemberMediaResult, AdminMemberMediaUploadInput,
};
use g5_admin_models::models::trace::Traced;
use reqwest::Method;

impl ApiClient {
    pub async fn upload_admin_member_icon(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminMemberMediaUploadInput,
    ) -> Result<Traced<AdminMemberMediaResult>, AppError> {
        self.upload_admin_member_media(
            request_id,
            access_token,
            input,
            &format!("/admin/members/{}/icon", input.mb_id),
        )
        .await
    }

    pub async fn delete_admin_member_icon(
        &self,
        request_id: &str,
        access_token: &str,
        mb_id: &str,
    ) -> Result<Traced<AdminMemberMediaResult>, AppError> {
        self.delete_admin_member_media(
            request_id,
            access_token,
            &format!("/admin/members/{mb_id}/icon"),
        )
        .await
    }

    pub async fn upload_admin_member_image(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminMemberMediaUploadInput,
    ) -> Result<Traced<AdminMemberMediaResult>, AppError> {
        self.upload_admin_member_media(
            request_id,
            access_token,
            input,
            &format!("/admin/members/{}/image", input.mb_id),
        )
        .await
    }

    pub async fn delete_admin_member_image(
        &self,
        request_id: &str,
        access_token: &str,
        mb_id: &str,
    ) -> Result<Traced<AdminMemberMediaResult>, AppError> {
        self.delete_admin_member_media(
            request_id,
            access_token,
            &format!("/admin/members/{mb_id}/image"),
        )
        .await
    }

    async fn upload_admin_member_media(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminMemberMediaUploadInput,
        target: &str,
    ) -> Result<Traced<AdminMemberMediaResult>, AppError> {
        let response = self
            .send_multipart::<AdminMemberMediaEnvelope>(
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

        Ok(response.map(|payload: AdminMemberMediaEnvelope| payload.data))
    }

    async fn delete_admin_member_media(
        &self,
        request_id: &str,
        access_token: &str,
        target: &str,
    ) -> Result<Traced<AdminMemberMediaResult>, AppError> {
        let response = self
            .send_json::<(), (), AdminMemberMediaEnvelope>(
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

        Ok(response.map(|payload: AdminMemberMediaEnvelope| payload.data))
    }
}
