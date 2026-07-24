use std::{net::SocketAddr, sync::Arc, time::Duration};

use async_trait::async_trait;
use g5_fleet_security::{SystemResolver, UrlGuard};
use reqwest::{Method, redirect::Policy};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use serde_json::{Map, Value, json};
use url::Url;

#[derive(Debug, thiserror::Error)]
pub enum ConnectorError {
    #[error("connector URL failed security validation")]
    UrlSecurity,
    #[error("connector transport failed")]
    Transport,
    #[error("connector returned HTTP {0}")]
    Http(u16),
    #[error("connector response contract is invalid")]
    Contract,
    #[error("connector basic config value is invalid")]
    InvalidConfigValue,
}

pub type ConnectorResult<T> = Result<T, ConnectorError>;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct ConnectorHealth {
    pub status: String,
    pub version: String,
    pub timestamp: i64,
}

#[derive(Clone, PartialEq, Eq)]
pub struct ConnectorLogin {
    pub mb_id: String,
    pub mb_password: String,
}

#[derive(Clone, Deserialize, Serialize, PartialEq, Eq)]
pub struct ConnectorCredentials {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct BasicConfig {
    pub cf_title: Option<String>,
    pub cf_admin: Option<String>,
    pub cf_10: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct SiteOverview {
    pub connector_status: String,
    pub connector_version: String,
    pub site_title: Option<String>,
    pub administrator_id: Option<String>,
}

#[async_trait]
pub trait ConnectorGateway: Send + Sync {
    async fn health(&self, base_url: &str, request_id: &str) -> ConnectorResult<ConnectorHealth>;
    async fn login(
        &self,
        base_url: &str,
        request_id: &str,
        input: &ConnectorLogin,
    ) -> ConnectorResult<ConnectorCredentials>;
    async fn basic_config(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
    ) -> ConnectorResult<BasicConfig>;
    async fn update_basic_config(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        cf_10: &str,
    ) -> ConnectorResult<BasicConfig>;
}

#[derive(Clone, Debug, Default)]
pub struct ProductionConnectorGateway;

#[async_trait]
impl ConnectorGateway for ProductionConnectorGateway {
    async fn health(&self, base_url: &str, request_id: &str) -> ConnectorResult<ConnectorHealth> {
        G5Client::connect(base_url).await?.health(request_id).await
    }

    async fn login(
        &self,
        base_url: &str,
        request_id: &str,
        input: &ConnectorLogin,
    ) -> ConnectorResult<ConnectorCredentials> {
        G5Client::connect(base_url)
            .await?
            .login(request_id, input)
            .await
    }

    async fn basic_config(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
    ) -> ConnectorResult<BasicConfig> {
        G5Client::connect(base_url)
            .await?
            .basic_config(request_id, access_token)
            .await
    }

    async fn update_basic_config(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        cf_10: &str,
    ) -> ConnectorResult<BasicConfig> {
        G5Client::connect(base_url)
            .await?
            .update_basic_config(request_id, access_token, cf_10)
            .await
    }
}

#[derive(Clone)]
#[cfg_attr(test, allow(dead_code))]
struct G5Client {
    base_url: Url,
    client: reqwest::Client,
    guard: Arc<UrlGuard<SystemResolver>>,
    target: g5_fleet_security::OutboundTarget,
}

impl G5Client {
    async fn connect(raw_base_url: &str) -> ConnectorResult<Self> {
        let base_url = normalize_base_url(raw_base_url)?;
        let guard = Arc::new(UrlGuard::new(SystemResolver));
        let target = guard
            .resolve_initial(base_url.as_str())
            .await
            .map_err(|_| ConnectorError::UrlSecurity)?;
        let address = target
            .pinned_addresses
            .iter()
            .next()
            .copied()
            .ok_or(ConnectorError::UrlSecurity)?;
        let client = build_client(Some((
            target.host.clone(),
            SocketAddr::new(address, target.port),
        )))?;
        Ok(Self {
            base_url,
            client,
            guard,
            target,
        })
    }

    #[cfg(test)]
    fn for_test(raw_base_url: &str) -> ConnectorResult<Self> {
        let base_url = normalize_base_url(raw_base_url)?;
        let target = g5_fleet_security::OutboundTarget {
            url: base_url.clone(),
            host: base_url
                .host_str()
                .ok_or(ConnectorError::UrlSecurity)?
                .to_owned(),
            port: base_url
                .port_or_known_default()
                .ok_or(ConnectorError::UrlSecurity)?,
            pinned_addresses: Default::default(),
        };
        Ok(Self {
            base_url,
            client: build_client(None)?,
            guard: Arc::new(UrlGuard::new(SystemResolver)),
            target,
        })
    }

    async fn health(&self, request_id: &str) -> ConnectorResult<ConnectorHealth> {
        let envelope: HealthEnvelope = self
            .request(Method::GET, "health", request_id, None, None)
            .await?;
        if envelope.status.is_empty() || envelope.version.is_empty() {
            return Err(ConnectorError::Contract);
        }
        Ok(ConnectorHealth {
            status: envelope.status,
            version: envelope.version,
            timestamp: envelope.timestamp,
        })
    }

    async fn login(
        &self,
        request_id: &str,
        input: &ConnectorLogin,
    ) -> ConnectorResult<ConnectorCredentials> {
        let envelope: DataEnvelope<ConnectorCredentials> = self
            .request(
                Method::POST,
                "auth/login",
                request_id,
                None,
                Some(json!({
                    "mb_id": input.mb_id,
                    "mb_password": input.mb_password,
                })),
            )
            .await?;
        if envelope.data.access_token.is_empty()
            || envelope.data.refresh_token.is_empty()
            || envelope.data.expires_in <= 0
        {
            return Err(ConnectorError::Contract);
        }
        Ok(envelope.data)
    }

    async fn basic_config(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> ConnectorResult<BasicConfig> {
        let envelope: DataEnvelope<Map<String, Value>> = self
            .request(
                Method::GET,
                "admin/config",
                request_id,
                Some(access_token),
                None,
            )
            .await?;
        basic_config_from_map(&envelope.data)
    }

    async fn update_basic_config(
        &self,
        request_id: &str,
        access_token: &str,
        cf_10: &str,
    ) -> ConnectorResult<BasicConfig> {
        validate_cf_10(cf_10)?;
        let envelope: DataEnvelope<Map<String, Value>> = self
            .request(
                Method::PUT,
                "admin/config",
                request_id,
                Some(access_token),
                Some(json!({"cf_10": cf_10})),
            )
            .await?;
        basic_config_from_map(&envelope.data)
    }

    async fn request<T: DeserializeOwned>(
        &self,
        method: Method,
        relative: &str,
        request_id: &str,
        access_token: Option<&str>,
        body: Option<Value>,
    ) -> ConnectorResult<T> {
        #[cfg(not(test))]
        self.guard
            .revalidate_before_connect(&self.target)
            .await
            .map_err(|_| ConnectorError::UrlSecurity)?;
        let url = self
            .base_url
            .join(relative)
            .map_err(|_| ConnectorError::UrlSecurity)?;
        let mut request = self
            .client
            .request(method, url)
            .header("accept", "application/json")
            .header("x-request-id", request_id);
        if let Some(token) = access_token {
            request = request.bearer_auth(token);
        }
        if let Some(body) = body {
            request = request.json(&body);
        }
        let response = request
            .send()
            .await
            .map_err(|_| ConnectorError::Transport)?;
        let status = response.status();
        if !status.is_success() {
            return Err(ConnectorError::Http(status.as_u16()));
        }
        response.json().await.map_err(|_| ConnectorError::Contract)
    }
}

#[derive(Debug, Deserialize)]
struct HealthEnvelope {
    status: String,
    version: String,
    timestamp: i64,
}

#[derive(Debug, Deserialize)]
struct DataEnvelope<T> {
    data: T,
}

fn normalize_base_url(raw: &str) -> ConnectorResult<Url> {
    let mut url = Url::parse(raw).map_err(|_| ConnectorError::UrlSecurity)?;
    if !matches!(url.scheme(), "http" | "https")
        || url.host().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.fragment().is_some()
    {
        return Err(ConnectorError::UrlSecurity);
    }
    let path = url.path().trim_end_matches('/');
    let normalized_path = if path.ends_with("/api/v1") {
        format!("{path}/")
    } else {
        format!("{path}/api/v1/")
    };
    url.set_path(&normalized_path);
    url.set_query(None);
    Ok(url)
}

fn build_client(resolve: Option<(String, SocketAddr)>) -> ConnectorResult<reqwest::Client> {
    let mut builder = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(3))
        .timeout(Duration::from_secs(10))
        .redirect(Policy::none());
    if let Some((host, address)) = resolve {
        builder = builder.resolve(&host, address);
    }
    builder.build().map_err(|_| ConnectorError::Transport)
}

fn basic_config_from_map(data: &Map<String, Value>) -> ConnectorResult<BasicConfig> {
    Ok(BasicConfig {
        cf_title: optional_string(data, "cf_title")?,
        cf_admin: optional_string(data, "cf_admin")?,
        cf_10: optional_string(data, "cf_10")?,
    })
}

fn optional_string(data: &Map<String, Value>, key: &str) -> ConnectorResult<Option<String>> {
    match data.get(key) {
        None | Some(Value::Null) => Ok(None),
        Some(Value::String(value)) => Ok(Some(value.clone())),
        _ => Err(ConnectorError::Contract),
    }
}

fn validate_cf_10(value: &str) -> ConnectorResult<()> {
    if value.len() <= 255 && !value.chars().any(char::is_control) {
        Ok(())
    } else {
        Err(ConnectorError::InvalidConfigValue)
    }
}

#[cfg(test)]
mod tests {
    use std::sync::{Arc, Mutex};

    use axum::{
        Json, Router,
        extract::State,
        http::{HeaderMap, StatusCode},
        routing::{get, post},
    };
    use serde_json::{Value, json};
    use tokio::net::TcpListener;

    use super::{ConnectorLogin, G5Client};

    #[derive(Clone)]
    struct MockState {
        cf_10: Arc<Mutex<String>>,
    }

    #[tokio::test]
    async fn canonical_health_login_config_update_readback_and_rollback() {
        let state = MockState {
            cf_10: Arc::new(Mutex::new("baseline".to_owned())),
        };
        let app = Router::new()
            .route("/api/v1/health", get(health))
            .route("/api/v1/auth/login", post(login))
            .route("/api/v1/admin/config", get(config_get).put(config_put))
            .with_state(state);
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });

        let client = G5Client::for_test(&format!("http://{address}")).unwrap();
        let health = client.health("req-health").await.unwrap();
        assert_eq!(health.status, "ok");
        let credentials = client
            .login(
                "req-login",
                &ConnectorLogin {
                    mb_id: "admin".to_owned(),
                    mb_password: "password".to_owned(),
                },
            )
            .await
            .unwrap();
        let baseline = client
            .basic_config("req-get", &credentials.access_token)
            .await
            .unwrap();
        assert_eq!(baseline.cf_10.as_deref(), Some("baseline"));
        client
            .update_basic_config("req-put", &credentials.access_token, "sentinel")
            .await
            .unwrap();
        assert_eq!(
            client
                .basic_config("req-readback", &credentials.access_token)
                .await
                .unwrap()
                .cf_10
                .as_deref(),
            Some("sentinel")
        );
        client
            .update_basic_config("req-rollback", &credentials.access_token, "baseline")
            .await
            .unwrap();
        assert_eq!(
            client
                .basic_config("req-rollback-readback", &credentials.access_token)
                .await
                .unwrap()
                .cf_10
                .as_deref(),
            Some("baseline")
        );
    }

    async fn health() -> Json<Value> {
        Json(json!({
            "status":"ok",
            "version":"test",
            "timestamp":1,
            "meta":{"request_id":"server"}
        }))
    }

    async fn login(Json(body): Json<Value>) -> (StatusCode, Json<Value>) {
        assert_eq!(body["mb_id"], "admin");
        assert_eq!(body["mb_password"], "password");
        (
            StatusCode::OK,
            Json(json!({
                "data":{"access_token":"access-jwt","refresh_token":"refresh-jwt","expires_in":3600},
                "meta":{"request_id":"server"}
            })),
        )
    }

    async fn config_get(State(state): State<MockState>, headers: HeaderMap) -> Json<Value> {
        assert_eq!(headers["authorization"], "Bearer access-jwt");
        let value = state.cf_10.lock().unwrap().clone();
        Json(json!({"data":{"cf_title":"Test","cf_admin":"admin","cf_10":value},"meta":{}}))
    }

    async fn config_put(
        State(state): State<MockState>,
        headers: HeaderMap,
        Json(body): Json<Value>,
    ) -> Json<Value> {
        assert_eq!(headers["authorization"], "Bearer access-jwt");
        *state.cf_10.lock().unwrap() = body["cf_10"].as_str().unwrap().to_owned();
        config_get(State(state), headers).await
    }
}
