mod board;
mod board_group;
mod config;
mod content;
mod dashboard;
mod faq;
mod health;
mod layout;
mod mail;
mod mail_test;
mod maintenance;
mod member;
mod menu;
mod permission;
mod point;
mod poll;
mod popular;
mod popup;
mod push;
mod qa;
mod qa_config;
mod report;
mod request;
mod schema;
mod sms;
mod sms_contact;
mod sms_history;
mod sms_message;
mod sms_template;
mod system_tools;
mod theme;
mod visit;
mod write_count;

pub mod error {
    pub use g5_admin_transport::ApiClientError as AppError;
}

use crate::error::AppError;
use g5_admin_models::openapi_wire::{validate_active_request, validate_active_response};
use g5_admin_transport::{TransportClient, WireContractValidator};
use std::net::SocketAddr;

pub(crate) use g5_admin_transport::{MultipartFileUpload, RequestConfig};

#[derive(Clone)]
pub struct ApiClient {
    transport: TransportClient,
}

impl ApiClient {
    pub fn new(raw_base_url: Option<impl Into<String>>) -> Result<Self, AppError> {
        Ok(Self {
            transport: TransportClient::new_with_wire_contract(
                raw_base_url,
                Some(WireContractValidator {
                    validate_request: |method, target, media_type, query, body| {
                        validate_active_request(method, target, media_type, query, body)
                            .map_err(|error| error.to_string())
                    },
                    validate_response: |method, target, status, media_type, body_text| {
                        validate_active_response(method, target, status, media_type, body_text)
                            .map_err(|error| error.to_string())
                    },
                }),
            )?,
        })
    }

    pub fn new_with_resolve(
        raw_base_url: impl Into<String>,
        address: SocketAddr,
    ) -> Result<Self, AppError> {
        let raw_base_url = raw_base_url.into();
        let parsed = reqwest::Url::parse(&raw_base_url).map_err(|error| AppError::Config {
            message: format!("invalid API base URL: {error}"),
        })?;
        let host = parsed.host_str().ok_or_else(|| AppError::Config {
            message: "API base URL has no host".to_string(),
        })?;
        Ok(Self {
            transport: TransportClient::new_with_wire_contract_and_resolve(
                Some(raw_base_url.clone()),
                Some(WireContractValidator {
                    validate_request: |method, target, media_type, query, body| {
                        validate_active_request(method, target, media_type, query, body)
                            .map_err(|error| error.to_string())
                    },
                    validate_response: |method, target, status, media_type, body_text| {
                        validate_active_response(method, target, status, media_type, body_text)
                            .map_err(|error| error.to_string())
                    },
                }),
                Some((host, address)),
            )?,
        })
    }

    pub fn transport(&self) -> &TransportClient {
        &self.transport
    }
}

#[cfg(test)]
mod tests {
    use super::{error::AppError, ApiClient};
    use std::net::{IpAddr, Ipv4Addr, SocketAddr};
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;

    fn loopback_address() -> SocketAddr {
        SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), 80)
    }

    #[test]
    fn resolve_constructor_rejects_invalid_url() {
        let result = ApiClient::new_with_resolve("://invalid", loopback_address());

        assert!(matches!(result, Err(AppError::Config { .. })));
    }

    #[test]
    fn resolve_constructor_rejects_url_without_host() {
        let result = ApiClient::new_with_resolve("file:///tmp/gnuboard5", loopback_address());

        assert!(matches!(result, Err(AppError::Config { .. })));
    }

    #[tokio::test]
    async fn resolve_constructor_routes_hostname_to_supplied_socket() {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0))
            .await
            .expect("loopback listener should bind");
        let address = listener
            .local_addr()
            .expect("loopback listener should expose its address");
        let server = tokio::spawn(async move {
            let (mut stream, _) = listener
                .accept()
                .await
                .expect("resolved request should reach loopback listener");
            let mut request = Vec::new();
            let mut buffer = [0_u8; 1024];
            loop {
                let read = stream
                    .read(&mut buffer)
                    .await
                    .expect("request bytes should be readable");
                if read == 0 {
                    break;
                }
                request.extend_from_slice(&buffer[..read]);
                if request.windows(4).any(|window| window == b"\r\n\r\n") {
                    break;
                }
            }
            assert!(request.starts_with(b"GET /health HTTP/1.1\r\n"));
            let body = r#"{"status":"ok","version":"test","timestamp":1,"meta":{"request_id":"server","correlation_id":"corr","server_request_id":"srv"}}"#;
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                body.len(),
                body
            );
            stream
                .write_all(response.as_bytes())
                .await
                .expect("health response should be writable");
        });

        let client = ApiClient::new_with_resolve(
            format!("http://g5-resolve.invalid:{}", address.port()),
            address,
        )
        .expect("valid override should build the production client");
        let health = client
            .get_health("resolve-test")
            .await
            .expect("DNS override should reach the supplied socket");

        assert_eq!(health.value.status, "ok");
        server.await.expect("loopback server should complete");
    }
}
