use super::{ApiClient, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::layout::{
    AdminLayoutDetail, AdminLayoutDetailEnvelope, AdminLayoutListEnvelope, AdminLayoutListQuery,
    AdminLayoutReorderInput, AdminLayoutSaveInput, AdminLayoutSummary,
    AdminLayoutWidgetCreateInput, AdminLayoutWidgetDeleteInput, AdminLayoutWidgetUpdateInput,
};
use g5_admin_models::models::member::Pagination;
use g5_admin_models::models::trace::Traced;
use reqwest::Method;

impl ApiClient {
    pub async fn get_admin_layouts(
        &self,
        request_id: &str,
        access_token: &str,
        query: &AdminLayoutListQuery,
    ) -> Result<Traced<(Vec<AdminLayoutSummary>, Pagination)>, AppError> {
        let response = self
            .send_query(
                request_id,
                Method::GET,
                "/admin/layouts",
                query,
                Some(access_token),
                true,
            )
            .await?;

        Ok(response.map(|payload: AdminLayoutListEnvelope| (payload.data, payload.pagination)))
    }

    pub async fn get_admin_layout(
        &self,
        request_id: &str,
        access_token: &str,
        page_id: &str,
    ) -> Result<Traced<AdminLayoutDetail>, AppError> {
        let target = format!("/admin/layouts/{page_id}");
        let response = self
            .send_json::<(), (), AdminLayoutDetailEnvelope>(
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

        Ok(response.map(|payload: AdminLayoutDetailEnvelope| payload.data))
    }

    pub async fn save_admin_layout(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminLayoutSaveInput,
    ) -> Result<Traced<AdminLayoutDetail>, AppError> {
        let target = format!("/admin/layouts/{}", input.page_id);
        let body = input
            .to_payload()
            .map_err(|error| AppError::Config { message: error })?;
        let response = self
            .send_json::<(), _, AdminLayoutDetailEnvelope>(
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

        Ok(response.map(|payload: AdminLayoutDetailEnvelope| payload.data))
    }

    pub async fn add_admin_layout_widget(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminLayoutWidgetCreateInput,
    ) -> Result<Traced<AdminLayoutDetail>, AppError> {
        let target = format!("/admin/layouts/{}/widgets", input.page_id);
        let body = input
            .to_payload()
            .map_err(|error| AppError::Config { message: error })?;
        let response = self
            .send_json::<(), _, AdminLayoutDetailEnvelope>(
                request_id,
                Method::POST,
                &target,
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: Some(access_token),
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: AdminLayoutDetailEnvelope| payload.data))
    }

    pub async fn update_admin_layout_widget(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminLayoutWidgetUpdateInput,
    ) -> Result<Traced<AdminLayoutDetail>, AppError> {
        let target = format!(
            "/admin/layouts/{}/widgets/{}",
            input.page_id, input.widget_id
        );
        let body = input
            .to_payload()
            .map_err(|error| AppError::Config { message: error })?;
        let response = self
            .send_json::<(), _, AdminLayoutDetailEnvelope>(
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

        Ok(response.map(|payload: AdminLayoutDetailEnvelope| payload.data))
    }

    pub async fn delete_admin_layout_widget(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminLayoutWidgetDeleteInput,
    ) -> Result<Traced<AdminLayoutDetail>, AppError> {
        let target = format!(
            "/admin/layouts/{}/widgets/{}",
            input.page_id, input.widget_id
        );
        let response = self
            .send_json::<(), (), AdminLayoutDetailEnvelope>(
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
            .await?;

        Ok(response.map(|payload: AdminLayoutDetailEnvelope| payload.data))
    }

    pub async fn reorder_admin_layout_widgets(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminLayoutReorderInput,
    ) -> Result<Traced<AdminLayoutDetail>, AppError> {
        let target = format!("/admin/layouts/{}/widgets", input.page_id);
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminLayoutDetailEnvelope>(
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

        Ok(response.map(|payload: AdminLayoutDetailEnvelope| payload.data))
    }

    pub async fn reorder_admin_layout_widgets_legacy(
        &self,
        request_id: &str,
        access_token: &str,
        input: &AdminLayoutReorderInput,
    ) -> Result<Traced<AdminLayoutDetail>, AppError> {
        let target = format!("/admin/layouts/{}/reorder", input.page_id);
        let body = input.to_payload();
        let response = self
            .send_json::<(), _, AdminLayoutDetailEnvelope>(
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

        Ok(response.map(|payload: AdminLayoutDetailEnvelope| payload.data))
    }
}
