use crate::problem::api_error_from_response;
use crate::request_headers::{extract_response_correlation_id, extract_response_server_request_id};
use crate::{ApiClientError, ApiTextResponse, MultipartFileUpload, RequestConfig, TransportClient};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use reqwest::multipart::{Form, Part};
use reqwest::Method;
use serde::Serialize;

impl TransportClient {
    pub(crate) async fn send_text_once<Q, B>(
        &self,
        request_id: &str,
        method: Method,
        target: &str,
        config: &RequestConfig<'_, Q, B>,
    ) -> Result<ApiTextResponse, ApiClientError>
    where
        Q: Serialize + ?Sized,
        B: Serialize + ?Sized,
    {
        let url = format!("{}{}", self.resolve_base_url().await?, target);
        let method_name = method.as_str().to_string();
        self.validate_request_contract(
            &method_name,
            target,
            Some("application/json"),
            config.query,
            config.body,
        )?;
        let headers = build_headers(request_id, config.access_token)?;

        let mut builder = self.client.request(method, &url).headers(headers);
        if let Some(query) = config.query {
            builder = builder.query(query);
        }
        if let Some(body) = config.body {
            builder = builder.json(body);
        }

        tracing::info!(
            component = "g5_admin::transport",
            operation = "http_request",
            target,
            request_id = %request_id,
            method = %method_name,
            "dispatching API request"
        );

        let response = builder.send().await.map_err(|error| {
            let transport_error = ApiClientError::Transport {
                target: target.to_string(),
                error: error.to_string(),
            };
            tracing::warn!(
                component = "g5_admin::transport",
                operation = "http_request",
                target,
                request_id = %request_id,
                error = ?transport_error,
                method = %method_name,
                "api request failed before response"
            );
            transport_error
        })?;

        self.read_text_response(request_id, target, &method_name, response, "API error")
            .await
    }

    pub(crate) async fn send_multipart_once(
        &self,
        request_id: &str,
        method: Method,
        target: &str,
        fields: Vec<(String, String)>,
        file: MultipartFileUpload,
        access_token: Option<&str>,
    ) -> Result<ApiTextResponse, ApiClientError> {
        let url = format!("{}{}", self.resolve_base_url().await?, target);
        let method_name = method.as_str().to_string();
        let mut multipart_body = serde_json::Map::new();
        for (name, value) in &fields {
            multipart_body.insert(name.clone(), serde_json::Value::String(value.clone()));
        }
        multipart_body.insert(
            file.field_name.clone(),
            serde_json::Value::String(file.file_name.clone()),
        );
        self.validate_serialized_request_contract(
            &method_name,
            target,
            Some("multipart/form-data"),
            None,
            Some(&serde_json::Value::Object(multipart_body)),
        )?;
        let headers = build_headers(request_id, access_token)?;
        let form = build_multipart_form(fields, file)?;

        tracing::info!(
            component = "g5_admin::transport",
            operation = "http_request",
            target,
            request_id = %request_id,
            method = %method_name,
            "dispatching multipart API request"
        );

        let response = self
            .client
            .request(method, &url)
            .headers(headers)
            .multipart(form)
            .send()
            .await
            .map_err(|error| {
                let transport_error = ApiClientError::Transport {
                    target: target.to_string(),
                    error: error.to_string(),
                };
                tracing::warn!(
                    component = "g5_admin::transport",
                    operation = "http_request",
                    target,
                    request_id = %request_id,
                    error = ?transport_error,
                    method = %method_name,
                    "multipart API request failed before response"
                );
                transport_error
            })?;

        self.read_text_response(request_id, target, &method_name, response, "API Error")
            .await
    }

    async fn read_text_response(
        &self,
        request_id: &str,
        target: &str,
        method_name: &str,
        response: reqwest::Response,
        error_label: &str,
    ) -> Result<ApiTextResponse, ApiClientError> {
        let response_correlation_id = extract_response_correlation_id(response.headers());
        let response_server_request_id = extract_response_server_request_id(response.headers());
        let response_content_type = response
            .headers()
            .get(CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .map(str::to_string);
        let status = response.status();
        tracing::info!(
            component = "g5_admin::transport",
            operation = "http_response",
            target,
            request_id = %request_id,
            correlation_id = response_correlation_id.as_deref().unwrap_or(request_id),
            server_request_id = response_server_request_id.as_deref().unwrap_or("-"),
            method = %method_name,
            status = status.as_u16(),
            "received API response"
        );
        let body_text = response.text().await.map_err(|error| {
            let transport_error = ApiClientError::Transport {
                target: target.to_string(),
                error: error.to_string(),
            };
            tracing::warn!(
                component = "g5_admin::transport",
                operation = "http_response_body",
                target,
                request_id = %request_id,
                error = ?transport_error,
                method = %method_name,
                "failed to read API response body"
            );
            transport_error
        })?;

        self.validate_response_contract(
            method_name,
            target,
            status.as_u16(),
            response_content_type.as_deref(),
            &body_text,
        )?;

        if !status.is_success() {
            return Err(api_error_from_response(
                request_id,
                target,
                status,
                body_text,
                response_correlation_id,
                response_server_request_id,
                error_label,
            ));
        }

        Ok(ApiTextResponse {
            body_text,
            header_correlation_id: response_correlation_id,
            header_server_request_id: response_server_request_id,
        })
    }

    fn validate_request_contract<Q, B>(
        &self,
        method: &str,
        target: &str,
        media_type: Option<&str>,
        query: Option<&Q>,
        body: Option<&B>,
    ) -> Result<(), ApiClientError>
    where
        Q: Serialize + ?Sized,
        B: Serialize + ?Sized,
    {
        let query = query
            .map(serde_json::to_value)
            .transpose()
            .map_err(|error| ApiClientError::Serialization {
                target: target.to_string(),
                error: format!("failed to serialize query for contract validation: {error}"),
            })?;
        let body = body
            .map(serde_json::to_value)
            .transpose()
            .map_err(|error| ApiClientError::Serialization {
                target: target.to_string(),
                error: format!("failed to serialize body for contract validation: {error}"),
            })?;
        self.validate_serialized_request_contract(
            method,
            target,
            media_type,
            query.as_ref(),
            body.as_ref(),
        )
    }

    fn validate_serialized_request_contract(
        &self,
        method: &str,
        target: &str,
        media_type: Option<&str>,
        query: Option<&serde_json::Value>,
        body: Option<&serde_json::Value>,
    ) -> Result<(), ApiClientError> {
        let Some(contract) = self.wire_contract else {
            return Ok(());
        };
        (contract.validate_request)(method, target, media_type, query, body).map_err(|error| {
            ApiClientError::Serialization {
                target: target.to_string(),
                error,
            }
        })
    }
}

fn build_headers(
    request_id: &str,
    access_token: Option<&str>,
) -> Result<HeaderMap, ApiClientError> {
    let mut headers = HeaderMap::new();
    headers.insert(
        "x-request-id",
        HeaderValue::from_str(request_id).map_err(|error| ApiClientError::Config {
            message: format!("invalid request id header: {error}"),
        })?,
    );

    if let Some(token) = access_token {
        let auth_value = HeaderValue::from_str(&format!("Bearer {token}")).map_err(|error| {
            ApiClientError::Auth {
                message: format!("invalid authorization header: {error}"),
            }
        })?;
        headers.insert(AUTHORIZATION, auth_value);
    }

    Ok(headers)
}

fn build_multipart_form(
    fields: Vec<(String, String)>,
    file: MultipartFileUpload,
) -> Result<Form, ApiClientError> {
    let part = Part::bytes(file.bytes)
        .file_name(file.file_name)
        .mime_str(&file.mime_type)
        .map_err(|error| ApiClientError::Config {
            message: format!("invalid multipart mime type: {error}"),
        })?;
    let mut form = Form::new().part(file.field_name, part);
    for (name, value) in fields {
        form = form.text(name, value);
    }
    Ok(form)
}
