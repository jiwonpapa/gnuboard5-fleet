use super::{ApiClient, MultipartFileUpload, RequestConfig};
use crate::error::AppError;
use g5_admin_models::models::trace::{HasApiTraceMeta, ResponseTrace, Traced};
use reqwest::Method;
use serde::de::DeserializeOwned;
use serde::Serialize;

impl ApiClient {
    pub(super) async fn send_json<Q, B, T>(
        &self,
        request_id: &str,
        method: Method,
        target: &str,
        request: RequestConfig<'_, Q, B>,
    ) -> Result<Traced<T>, AppError>
    where
        Q: Serialize + ?Sized,
        B: Serialize + ?Sized,
        T: DeserializeOwned + HasApiTraceMeta,
    {
        self.transport
            .send_json(request_id, method, target, request)
            .await
    }

    pub(super) async fn send_empty<Q, B>(
        &self,
        request_id: &str,
        method: Method,
        target: &str,
        request: RequestConfig<'_, Q, B>,
    ) -> Result<ResponseTrace, AppError>
    where
        Q: Serialize + ?Sized,
        B: Serialize + ?Sized,
    {
        self.transport
            .send_empty(request_id, method, target, request)
            .await
    }

    pub(super) async fn send_query<Q, T>(
        &self,
        request_id: &str,
        method: Method,
        target: &str,
        query: &Q,
        access_token: Option<&str>,
        retryable: bool,
    ) -> Result<Traced<T>, AppError>
    where
        Q: Serialize + ?Sized,
        T: DeserializeOwned + HasApiTraceMeta,
    {
        self.transport
            .send_query(request_id, method, target, query, access_token, retryable)
            .await
    }

    #[allow(
        clippy::too_many_arguments,
        reason = "multipart client boundary keeps request metadata explicit"
    )]
    pub(super) async fn send_multipart<T>(
        &self,
        request_id: &str,
        method: Method,
        target: &str,
        fields: Vec<(String, String)>,
        file: MultipartFileUpload,
        access_token: Option<&str>,
        retryable: bool,
    ) -> Result<Traced<T>, AppError>
    where
        T: DeserializeOwned + HasApiTraceMeta,
    {
        self.transport
            .send_multipart(
                request_id,
                method,
                target,
                fields,
                file,
                access_token,
                retryable,
            )
            .await
    }
}
