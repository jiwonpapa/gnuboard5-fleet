use crate::{ApiClientError, MultipartFileUpload, RequestConfig, TransportClient};
use g5_admin_error_contract::{HasApiTraceMeta, ResponseTrace, Traced};
use reqwest::Method;
use serde::de::DeserializeOwned;
use serde::Serialize;
use std::time::Duration;
use tokio::time::sleep;

impl TransportClient {
    pub async fn send_json<Q, B, T>(
        &self,
        request_id: &str,
        method: Method,
        target: &str,
        request: RequestConfig<'_, Q, B>,
    ) -> Result<Traced<T>, ApiClientError>
    where
        Q: Serialize + ?Sized,
        B: Serialize + ?Sized,
        T: DeserializeOwned + HasApiTraceMeta,
    {
        let mut attempts = 0_u8;

        loop {
            attempts += 1;

            match self
                .send_text_once(request_id, method.clone(), target, &request)
                .await
            {
                Ok(response) => {
                    let payload =
                        serde_json::from_str::<T>(&response.body_text).map_err(|error| {
                            ApiClientError::Serialization {
                                target: target.to_string(),
                                error: error.to_string(),
                            }
                        })?;
                    let trace = ResponseTrace::from_api(
                        request_id.to_string(),
                        response.header_correlation_id,
                        response.header_server_request_id,
                        payload.api_trace_meta(),
                    );

                    return Ok(Traced::new(payload, trace));
                }
                Err(error)
                    if request.retryable && error.is_retryable_transport() && attempts < 3 =>
                {
                    let wait_secs = 1_u64 << (attempts - 1);
                    tracing::warn!(
                        component = "g5_admin::transport",
                        operation = "retry_request",
                        target,
                        request_id = %request_id,
                        error = ?error,
                        "retrying idempotent request after transport failure"
                    );
                    sleep(Duration::from_secs(wait_secs)).await;
                }
                Err(error) => return Err(error),
            }
        }
    }

    pub async fn send_empty<Q, B>(
        &self,
        request_id: &str,
        method: Method,
        target: &str,
        request: RequestConfig<'_, Q, B>,
    ) -> Result<ResponseTrace, ApiClientError>
    where
        Q: Serialize + ?Sized,
        B: Serialize + ?Sized,
    {
        let mut attempts = 0_u8;

        loop {
            attempts += 1;

            match self
                .send_text_once(request_id, method.clone(), target, &request)
                .await
            {
                Ok(response) => {
                    return Ok(ResponseTrace::from_api(
                        request_id.to_string(),
                        response.header_correlation_id,
                        response.header_server_request_id,
                        None,
                    ));
                }
                Err(error)
                    if request.retryable && error.is_retryable_transport() && attempts < 3 =>
                {
                    let wait_secs = 1_u64 << (attempts - 1);
                    tracing::warn!(
                        component = "g5_admin::transport",
                        operation = "retry_request",
                        target,
                        request_id = %request_id,
                        error = ?error,
                        "retrying idempotent request after transport failure"
                    );
                    sleep(Duration::from_secs(wait_secs)).await;
                }
                Err(error) => return Err(error),
            }
        }
    }

    pub async fn send_query<Q, T>(
        &self,
        request_id: &str,
        method: Method,
        target: &str,
        query: &Q,
        access_token: Option<&str>,
        retryable: bool,
    ) -> Result<Traced<T>, ApiClientError>
    where
        Q: Serialize + ?Sized,
        T: DeserializeOwned + HasApiTraceMeta,
    {
        self.send_json(
            request_id,
            method,
            target,
            RequestConfig {
                query: Some(query),
                body: None::<&()>,
                access_token,
                retryable,
            },
        )
        .await
    }

    #[allow(
        clippy::too_many_arguments,
        reason = "multipart transport keeps request metadata explicit at the API boundary"
    )]
    pub async fn send_multipart<T>(
        &self,
        request_id: &str,
        method: Method,
        target: &str,
        fields: Vec<(String, String)>,
        file: MultipartFileUpload,
        access_token: Option<&str>,
        retryable: bool,
    ) -> Result<Traced<T>, ApiClientError>
    where
        T: DeserializeOwned + HasApiTraceMeta,
    {
        let mut attempts = 0_u8;

        loop {
            attempts += 1;

            match self
                .send_multipart_once(
                    request_id,
                    method.clone(),
                    target,
                    fields.clone(),
                    file.clone(),
                    access_token,
                )
                .await
            {
                Ok(response) => {
                    let payload =
                        serde_json::from_str::<T>(&response.body_text).map_err(|error| {
                            ApiClientError::Serialization {
                                target: target.to_string(),
                                error: error.to_string(),
                            }
                        })?;
                    let trace = ResponseTrace::from_api(
                        request_id.to_string(),
                        response.header_correlation_id,
                        response.header_server_request_id,
                        payload.api_trace_meta(),
                    );

                    return Ok(Traced::new(payload, trace));
                }
                Err(error) if retryable && error.is_retryable_transport() && attempts < 3 => {
                    let wait_secs = 1_u64 << (attempts - 1);
                    tracing::warn!(
                        component = "g5_admin::transport",
                        operation = "retry_request",
                        target,
                        request_id = %request_id,
                        error = ?error,
                        "retrying multipart request after transport failure"
                    );
                    sleep(Duration::from_secs(wait_secs)).await;
                }
                Err(error) => return Err(error),
            }
        }
    }

    pub async fn resolve_base_url(&self) -> Result<String, ApiClientError> {
        self.base_url
            .read()
            .await
            .clone()
            .ok_or_else(|| ApiClientError::Config {
                message: "active site is not selected".to_string(),
            })
    }

    pub(crate) fn validate_response_contract(
        &self,
        method: &str,
        target: &str,
        status: u16,
        media_type: Option<&str>,
        body_text: &str,
    ) -> Result<(), ApiClientError> {
        let Some(contract) = self.wire_contract else {
            return Ok(());
        };
        (contract.validate_response)(method, target, status, media_type, body_text).map_err(
            |error| ApiClientError::Serialization {
                target: target.to_string(),
                error,
            },
        )
    }
}
