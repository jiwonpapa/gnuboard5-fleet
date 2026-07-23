use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::popup::{
    AdminPopup, AdminPopupCreateInput, AdminPopupDeleteInput, AdminPopupDetailEnvelope,
    AdminPopupListEnvelope, AdminPopupListQuery, AdminPopupUpdateInput,
};
use g5_admin_models::models::trace::{ResponseTrace, Traced};
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_popups(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminPopupListQuery,
    ) -> Result<Traced<(Vec<AdminPopup>, Pagination)>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/system/popups",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminPopupListEnvelope| (payload.data, payload.pagination)))
    }

    pub async fn get_admin_popup(
        &self,
        request_id: &str,
        access_token: &str,
        nw_id: i32,
    ) -> Result<Traced<AdminPopup>, AppError> {
        let target = format!("/admin/system/popups/{nw_id}");
        let response = self
            .send_json::<(), (), AdminPopupDetailEnvelope>(
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

        Ok(response.map(|payload: AdminPopupDetailEnvelope| payload.data))
    }

    pub async fn create_admin_popup(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPopupCreateInput,
    ) -> Result<Traced<AdminPopup>, AppError> {
        let body = input.to_create_payload();

        let response = self
            .send_json::<(), _, AdminPopupDetailEnvelope>(
                request_id,
                Method::POST,
                "/admin/system/popups",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminPopupDetailEnvelope| payload.data))
    }

    pub async fn update_admin_popup(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPopupUpdateInput,
    ) -> Result<Traced<AdminPopup>, AppError> {
        let target = format!("/admin/system/popups/{}", input.nw_id);
        let body = input.to_update_payload();

        let response = self
            .send_json::<(), _, AdminPopupDetailEnvelope>(
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

        Ok(response.map(|payload: AdminPopupDetailEnvelope| payload.data))
    }

    pub async fn get_admin_popups_legacy(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminPopupListQuery,
    ) -> Result<Traced<(Vec<AdminPopup>, Pagination)>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/popups",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminPopupListEnvelope| (payload.data, payload.pagination)))
    }

    pub async fn get_admin_popup_legacy(
        &self,
        request_id: &str,
        access_token: &str,
        nw_id: i32,
    ) -> Result<Traced<AdminPopup>, AppError> {
        let target = format!("/admin/popups/{nw_id}");
        let response = self
            .send_json::<(), (), AdminPopupDetailEnvelope>(
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

        Ok(response.map(|payload: AdminPopupDetailEnvelope| payload.data))
    }

    pub async fn create_admin_popup_legacy(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPopupCreateInput,
    ) -> Result<Traced<AdminPopup>, AppError> {
        let body = input.to_create_payload();

        let response = self
            .send_json::<(), _, AdminPopupDetailEnvelope>(
                request_id,
                Method::POST,
                "/admin/popups",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminPopupDetailEnvelope| payload.data))
    }

    pub async fn update_admin_popup_legacy(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPopupUpdateInput,
    ) -> Result<Traced<AdminPopup>, AppError> {
        let target = format!("/admin/popups/{}", input.nw_id);
        let body = input.to_update_payload();

        let response = self
            .send_json::<(), _, AdminPopupDetailEnvelope>(
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

        Ok(response.map(|payload: AdminPopupDetailEnvelope| payload.data))
    }

    pub async fn delete_admin_popup_legacy(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPopupDeleteInput,
    ) -> Result<ResponseTrace, AppError> {
        let target = format!("/admin/popups/{}", input.nw_id);

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

    pub async fn delete_admin_popup(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminPopupDeleteInput,
    ) -> Result<ResponseTrace, AppError> {
        let target = format!("/admin/system/popups/{}", input.nw_id);

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
