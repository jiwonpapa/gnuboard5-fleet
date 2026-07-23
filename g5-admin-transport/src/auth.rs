use crate::{ApiClientError, RequestConfig, TransportClient};
use g5_admin_error_contract::{ApiTraceMeta, HasApiTraceMeta, ResponseTrace, Traced};
use g5_admin_port_types::{AuthLoginRecord, StoredSessionRecord, TokenPairRecord};
use reqwest::Method;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct AuthLoginRequest<'a> {
    mb_id: &'a str,
    mb_password: &'a str,
}

#[derive(Deserialize)]
struct TokenEnvelope {
    data: TokenPairWire,
    #[serde(default)]
    meta: ApiTraceMeta,
}

impl HasApiTraceMeta for TokenEnvelope {
    fn api_trace_meta(&self) -> Option<&ApiTraceMeta> {
        Some(&self.meta)
    }
}

#[derive(Deserialize)]
struct TokenPairWire {
    access_token: String,
    refresh_token: String,
    expires_in: u64,
}

impl From<TokenPairWire> for TokenPairRecord {
    fn from(tokens: TokenPairWire) -> Self {
        Self {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_in: tokens.expires_in,
        }
    }
}

#[derive(Serialize)]
struct LogoutRequest {
    refresh_token: Option<String>,
}

impl TransportClient {
    pub async fn login(
        &self,
        request_id: &str,
        input: &AuthLoginRecord,
    ) -> Result<Traced<TokenPairRecord>, ApiClientError> {
        let body = AuthLoginRequest {
            mb_id: &input.mb_id,
            mb_password: &input.mb_password,
        };
        let response = self
            .send_json(
                request_id,
                Method::POST,
                "/auth/login",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: None,
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: TokenEnvelope| payload.data.into()))
    }

    pub async fn refresh(
        &self,
        request_id: &str,
        session: &StoredSessionRecord,
    ) -> Result<Traced<TokenPairRecord>, ApiClientError> {
        let body = serde_json::json!({
            "refresh_token": session.refresh_token,
        });

        let response = self
            .send_json(
                request_id,
                Method::POST,
                "/auth/refresh",
                RequestConfig {
                    query: None::<&()>,
                    body: Some(&body),
                    access_token: None,
                    retryable: false,
                },
            )
            .await?;

        Ok(response.map(|payload: TokenEnvelope| payload.data.into()))
    }

    pub async fn logout(
        &self,
        request_id: &str,
        session: &StoredSessionRecord,
    ) -> Result<ResponseTrace, ApiClientError> {
        let body = LogoutRequest {
            refresh_token: Some(session.refresh_token.clone()),
        };

        self.send_empty(
            request_id,
            Method::POST,
            "/auth/logout",
            RequestConfig {
                query: None::<&()>,
                body: Some(&body),
                access_token: Some(&session.access_token),
                retryable: false,
            },
        )
        .await
    }
}
