use std::{
    collections::{BTreeMap, BTreeSet},
    net::SocketAddr,
    sync::{Arc, OnceLock},
    time::Duration,
};

use async_trait::async_trait;
use base64::{Engine, engine::general_purpose::STANDARD as BASE64};
use g5_fleet_security::{SystemResolver, UrlGuard};
use reqwest::{
    Method,
    header::CONTENT_TYPE,
    multipart::{Form, Part},
    redirect::Policy,
};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use serde_json::{Map, Value, json};
use url::Url;

const CORE_REGISTRY_JSON: &str = include_str!("../../../contracts/core-operations.json");
const MAX_CORE_RESPONSE_BYTES: usize = 16 * 1024 * 1024;
const MAX_CORE_UPLOAD_BYTES: usize = 16 * 1024 * 1024;

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
    #[error("unknown Core operation")]
    UnknownOperation,
    #[error("operation uses a specialized Fleet route")]
    SpecializedOperation,
    #[error("external-effect operation is blocked by the Core routine policy")]
    ExternalEffectBlocked,
    #[error("Core operation request is invalid")]
    InvalidCoreRequest,
    #[error("Core operation response is too large")]
    ResponseTooLarge,
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

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct CoreParameterSpec {
    pub name: String,
    pub location: String,
    pub required: bool,
    #[serde(rename = "type")]
    pub value_type: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct CoreOperationSpec {
    pub operation_id: String,
    pub method: String,
    pub path: String,
    pub domain: String,
    pub risk: String,
    pub transport: String,
    pub requires_step_up: bool,
    pub parameters: Vec<CoreParameterSpec>,
    pub request_body_required: bool,
    pub request_media_types: Vec<String>,
    pub request_fields: Vec<String>,
    pub request_required_fields: Vec<String>,
    pub response_fields: Vec<String>,
    pub schema_refs: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct CoreRegistry {
    operations: Vec<CoreOperationSpec>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
pub struct CoreExecuteRequest {
    #[serde(default)]
    pub path: BTreeMap<String, String>,
    #[serde(default)]
    pub query: BTreeMap<String, Value>,
    pub body: Option<Value>,
    #[serde(default)]
    pub confirm_destructive: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct CoreExecuteResponse {
    pub operation_id: String,
    pub upstream_status: u16,
    pub content_type: Option<String>,
    pub data: Option<Value>,
    pub body_base64: Option<String>,
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
    async fn refresh(
        &self,
        base_url: &str,
        request_id: &str,
        refresh_token: &str,
    ) -> ConnectorResult<ConnectorCredentials>;
    async fn logout(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        refresh_token: &str,
    ) -> ConnectorResult<()>;
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
    async fn core_execute(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        operation_id: &str,
        input: &CoreExecuteRequest,
    ) -> ConnectorResult<CoreExecuteResponse>;
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

    async fn refresh(
        &self,
        base_url: &str,
        request_id: &str,
        refresh_token: &str,
    ) -> ConnectorResult<ConnectorCredentials> {
        G5Client::connect(base_url)
            .await?
            .refresh(request_id, refresh_token)
            .await
    }

    async fn logout(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        refresh_token: &str,
    ) -> ConnectorResult<()> {
        G5Client::connect(base_url)
            .await?
            .logout(request_id, access_token, refresh_token)
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

    async fn core_execute(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        operation_id: &str,
        input: &CoreExecuteRequest,
    ) -> ConnectorResult<CoreExecuteResponse> {
        G5Client::connect(base_url)
            .await?
            .core_execute(request_id, access_token, operation_id, input)
            .await
    }
}

#[cfg(feature = "local-certification")]
#[derive(Clone, Debug, Default)]
pub struct LocalCertificationConnectorGateway;

#[cfg(feature = "local-certification")]
#[async_trait]
impl ConnectorGateway for LocalCertificationConnectorGateway {
    async fn health(&self, base_url: &str, request_id: &str) -> ConnectorResult<ConnectorHealth> {
        G5Client::connect_local_certification(base_url)
            .await?
            .health(request_id)
            .await
    }

    async fn login(
        &self,
        base_url: &str,
        request_id: &str,
        input: &ConnectorLogin,
    ) -> ConnectorResult<ConnectorCredentials> {
        G5Client::connect_local_certification(base_url)
            .await?
            .login(request_id, input)
            .await
    }

    async fn refresh(
        &self,
        base_url: &str,
        request_id: &str,
        refresh_token: &str,
    ) -> ConnectorResult<ConnectorCredentials> {
        G5Client::connect_local_certification(base_url)
            .await?
            .refresh(request_id, refresh_token)
            .await
    }

    async fn logout(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        refresh_token: &str,
    ) -> ConnectorResult<()> {
        G5Client::connect_local_certification(base_url)
            .await?
            .logout(request_id, access_token, refresh_token)
            .await
    }

    async fn basic_config(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
    ) -> ConnectorResult<BasicConfig> {
        G5Client::connect_local_certification(base_url)
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
        G5Client::connect_local_certification(base_url)
            .await?
            .update_basic_config(request_id, access_token, cf_10)
            .await
    }

    async fn core_execute(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        operation_id: &str,
        input: &CoreExecuteRequest,
    ) -> ConnectorResult<CoreExecuteResponse> {
        G5Client::connect_local_certification(base_url)
            .await?
            .core_execute(request_id, access_token, operation_id, input)
            .await
    }
}

pub fn core_operations() -> &'static [CoreOperationSpec] {
    static REGISTRY: OnceLock<Vec<CoreOperationSpec>> = OnceLock::new();
    REGISTRY
        .get_or_init(|| {
            serde_json::from_str::<CoreRegistry>(CORE_REGISTRY_JSON)
                .expect("tracked Core operation registry must be valid")
                .operations
        })
        .as_slice()
}

pub fn core_operation(operation_id: &str) -> Option<&'static CoreOperationSpec> {
    core_operations()
        .iter()
        .find(|operation| operation.operation_id == operation_id)
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

    #[cfg(feature = "local-certification")]
    async fn connect_local_certification(raw_base_url: &str) -> ConnectorResult<Self> {
        let base_url = normalize_base_url(raw_base_url)?;
        let guard = Arc::new(UrlGuard::local_certification(SystemResolver));
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

    async fn refresh(
        &self,
        request_id: &str,
        refresh_token: &str,
    ) -> ConnectorResult<ConnectorCredentials> {
        let envelope: DataEnvelope<ConnectorCredentials> = self
            .request(
                Method::POST,
                "auth/refresh",
                request_id,
                None,
                Some(json!({"refresh_token": refresh_token})),
            )
            .await?;
        validate_credentials(envelope.data)
    }

    async fn logout(
        &self,
        request_id: &str,
        access_token: &str,
        refresh_token: &str,
    ) -> ConnectorResult<()> {
        let _: Value = self
            .request(
                Method::POST,
                "auth/logout",
                request_id,
                Some(access_token),
                Some(json!({"refresh_token": refresh_token})),
            )
            .await?;
        Ok(())
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

    async fn core_execute(
        &self,
        request_id: &str,
        access_token: &str,
        operation_id: &str,
        input: &CoreExecuteRequest,
    ) -> ConnectorResult<CoreExecuteResponse> {
        let operation = core_operation(operation_id).ok_or(ConnectorError::UnknownOperation)?;
        if operation.transport != "core_proxy" {
            return Err(ConnectorError::SpecializedOperation);
        }
        if operation.risk == "external_effect" {
            return Err(ConnectorError::ExternalEffectBlocked);
        }
        if operation.risk == "destructive" && !input.confirm_destructive {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        validate_core_request(operation, input)?;
        #[cfg(not(test))]
        self.guard
            .revalidate_before_connect(&self.target)
            .await
            .map_err(|_| ConnectorError::UrlSecurity)?;
        let url = core_url(&self.base_url, operation, input)?;
        let method = Method::from_bytes(operation.method.as_bytes())
            .map_err(|_| ConnectorError::InvalidCoreRequest)?;
        let mut request = self
            .client
            .request(method, url)
            .header("accept", "application/json, application/octet-stream;q=0.5")
            .header("x-request-id", request_id)
            .bearer_auth(access_token);
        if let Some(body) = input.body.as_ref() {
            if operation
                .request_media_types
                .iter()
                .any(|value| value == "multipart/form-data")
            {
                request = request.multipart(multipart_form(body)?);
            } else if operation
                .request_media_types
                .iter()
                .any(|value| value == "application/x-www-form-urlencoded")
            {
                request = request.form(body);
            } else {
                request = request.json(body);
            }
        }
        let response = request
            .send()
            .await
            .map_err(|_| ConnectorError::Transport)?;
        let status = response.status();
        if !status.is_success() {
            return Err(ConnectorError::Http(status.as_u16()));
        }
        let content_type = response
            .headers()
            .get(CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned);
        let bytes = response
            .bytes()
            .await
            .map_err(|_| ConnectorError::Transport)?;
        if bytes.len() > MAX_CORE_RESPONSE_BYTES {
            return Err(ConnectorError::ResponseTooLarge);
        }
        let is_json = content_type
            .as_deref()
            .is_some_and(|value| value.starts_with("application/json") || value.contains("+json"));
        let (data, body_base64) = if is_json || bytes.is_empty() {
            let data = if bytes.is_empty() {
                Some(Value::Null)
            } else {
                Some(serde_json::from_slice(&bytes).map_err(|_| ConnectorError::Contract)?)
            };
            (data, None)
        } else {
            (None, Some(BASE64.encode(bytes)))
        };
        Ok(CoreExecuteResponse {
            operation_id: operation.operation_id.clone(),
            upstream_status: status.as_u16(),
            content_type,
            data,
            body_base64,
        })
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

fn validate_credentials(
    credentials: ConnectorCredentials,
) -> ConnectorResult<ConnectorCredentials> {
    if credentials.access_token.is_empty()
        || credentials.refresh_token.is_empty()
        || credentials.expires_in <= 0
    {
        Err(ConnectorError::Contract)
    } else {
        Ok(credentials)
    }
}

fn validate_core_request(
    operation: &CoreOperationSpec,
    input: &CoreExecuteRequest,
) -> ConnectorResult<()> {
    let path_names = operation
        .parameters
        .iter()
        .filter(|parameter| parameter.location == "path")
        .map(|parameter| parameter.name.as_str())
        .collect::<BTreeSet<_>>();
    let query_names = operation
        .parameters
        .iter()
        .filter(|parameter| parameter.location == "query")
        .map(|parameter| parameter.name.as_str())
        .collect::<BTreeSet<_>>();
    if input
        .path
        .keys()
        .any(|name| !path_names.contains(name.as_str()))
        || input
            .query
            .keys()
            .any(|name| !query_names.contains(name.as_str()))
    {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    for parameter in operation.parameters.iter().filter(|value| value.required) {
        let present = match parameter.location.as_str() {
            "path" => input
                .path
                .get(&parameter.name)
                .is_some_and(|value| !value.is_empty()),
            "query" => input.query.contains_key(&parameter.name),
            _ => false,
        };
        if !present {
            return Err(ConnectorError::InvalidCoreRequest);
        }
    }
    match input.body.as_ref() {
        Some(Value::Object(body)) => {
            let fields = operation
                .request_fields
                .iter()
                .map(String::as_str)
                .collect::<BTreeSet<_>>();
            if body.keys().any(|name| !fields.contains(name.as_str())) {
                return Err(ConnectorError::InvalidCoreRequest);
            }
            if operation
                .request_required_fields
                .iter()
                .any(|name| !body.contains_key(name))
            {
                return Err(ConnectorError::InvalidCoreRequest);
            }
        }
        Some(_) => return Err(ConnectorError::InvalidCoreRequest),
        None if operation.request_body_required => {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        None => {}
    }
    Ok(())
}

fn core_url(
    base_url: &Url,
    operation: &CoreOperationSpec,
    input: &CoreExecuteRequest,
) -> ConnectorResult<Url> {
    let mut url = base_url.clone();
    {
        let mut segments = url
            .path_segments_mut()
            .map_err(|_| ConnectorError::InvalidCoreRequest)?;
        segments.pop_if_empty();
        for segment in operation.path.trim_start_matches('/').split('/') {
            if let Some(name) = segment
                .strip_prefix('{')
                .and_then(|value| value.strip_suffix('}'))
            {
                segments.push(
                    input
                        .path
                        .get(name)
                        .ok_or(ConnectorError::InvalidCoreRequest)?,
                );
            } else {
                segments.push(segment);
            }
        }
    }
    {
        let mut query = url.query_pairs_mut();
        for (name, value) in &input.query {
            match value {
                Value::Array(values) => {
                    for value in values {
                        query.append_pair(name, &query_value(value)?);
                    }
                }
                value => {
                    query.append_pair(name, &query_value(value)?);
                }
            }
        }
    }
    Ok(url)
}

fn query_value(value: &Value) -> ConnectorResult<String> {
    match value {
        Value::String(value) => Ok(value.clone()),
        Value::Number(value) => Ok(value.to_string()),
        Value::Bool(value) => Ok(value.to_string()),
        Value::Null => Ok(String::new()),
        _ => Err(ConnectorError::InvalidCoreRequest),
    }
}

fn multipart_form(body: &Value) -> ConnectorResult<Form> {
    let fields = body.as_object().ok_or(ConnectorError::InvalidCoreRequest)?;
    let mut form = Form::new();
    for (name, value) in fields {
        if let Some(file) = value.as_object().and_then(|value| value.get("$file")) {
            let file = file.as_object().ok_or(ConnectorError::InvalidCoreRequest)?;
            let filename = file
                .get("filename")
                .and_then(Value::as_str)
                .ok_or(ConnectorError::InvalidCoreRequest)?;
            let encoded = file
                .get("base64")
                .and_then(Value::as_str)
                .ok_or(ConnectorError::InvalidCoreRequest)?;
            let bytes = BASE64
                .decode(encoded)
                .map_err(|_| ConnectorError::InvalidCoreRequest)?;
            if bytes.len() > MAX_CORE_UPLOAD_BYTES {
                return Err(ConnectorError::InvalidCoreRequest);
            }
            let mut part = Part::bytes(bytes).file_name(filename.to_owned());
            if let Some(content_type) = file.get("content_type").and_then(Value::as_str) {
                part = part
                    .mime_str(content_type)
                    .map_err(|_| ConnectorError::InvalidCoreRequest)?;
            }
            form = form.part(name.clone(), part);
        } else {
            form = form.text(name.clone(), query_value(value)?);
        }
    }
    Ok(form)
}

#[cfg(test)]
mod tests {
    use std::{
        collections::BTreeMap,
        sync::{Arc, Mutex},
    };

    use axum::{
        Json, Router,
        extract::State,
        http::{HeaderMap, StatusCode},
        routing::{get, post},
    };
    use serde_json::{Value, json};
    use tokio::net::TcpListener;

    use super::{ConnectorError, ConnectorLogin, CoreExecuteRequest, G5Client, core_operations};

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
            .route("/api/v1/auth/refresh", post(refresh))
            .route("/api/v1/auth/logout", post(logout))
            .route("/api/v1/admin/config", get(config_get).put(config_put))
            .route("/api/v1/admin/members", get(member_list))
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

        assert_eq!(core_operations().len(), 189);
        assert!(
            core_operations()
                .iter()
                .all(|operation| !operation.path.starts_with("/admin/shop/"))
        );
        let core_baseline = client
            .core_execute(
                "req-core-config-get",
                &credentials.access_token,
                "adminGetConfig",
                &CoreExecuteRequest::default(),
            )
            .await
            .unwrap();
        assert_eq!(
            core_baseline.data.as_ref().unwrap()["data"]["cf_10"],
            "baseline"
        );
        client
            .core_execute(
                "req-core-config-put",
                &credentials.access_token,
                "adminUpdateConfig",
                &CoreExecuteRequest {
                    body: Some(json!({"cf_10":"core-sentinel"})),
                    ..Default::default()
                },
            )
            .await
            .unwrap();
        assert_eq!(
            client
                .core_execute(
                    "req-core-config-readback",
                    &credentials.access_token,
                    "adminGetConfig",
                    &CoreExecuteRequest::default(),
                )
                .await
                .unwrap()
                .data
                .unwrap()["data"]["cf_10"],
            "core-sentinel"
        );
        client
            .core_execute(
                "req-core-config-rollback",
                &credentials.access_token,
                "adminUpdateConfig",
                &CoreExecuteRequest {
                    body: Some(json!({"cf_10":"baseline"})),
                    ..Default::default()
                },
            )
            .await
            .unwrap();
        let members = client
            .core_execute(
                "req-core",
                &credentials.access_token,
                "adminListMembers",
                &CoreExecuteRequest {
                    query: BTreeMap::from([("page".to_owned(), json!("1"))]),
                    ..Default::default()
                },
            )
            .await
            .unwrap();
        assert_eq!(members.upstream_status, 200);
        assert_eq!(members.data.unwrap()["data"][0]["mb_id"], "admin");
        assert!(matches!(
            client
                .core_execute(
                    "req-external",
                    &credentials.access_token,
                    "adminSendPush",
                    &CoreExecuteRequest::default(),
                )
                .await,
            Err(ConnectorError::ExternalEffectBlocked)
        ));
        let refreshed = client
            .refresh("req-refresh", &credentials.refresh_token)
            .await
            .unwrap();
        assert_eq!(refreshed.access_token, "access-jwt-refreshed");
        client
            .logout(
                "req-logout",
                &refreshed.access_token,
                &refreshed.refresh_token,
            )
            .await
            .unwrap();
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

    async fn refresh(Json(body): Json<Value>) -> Json<Value> {
        assert_eq!(body["refresh_token"], "refresh-jwt");
        Json(json!({
            "data":{
                "access_token":"access-jwt-refreshed",
                "refresh_token":"refresh-jwt-refreshed",
                "expires_in":3600
            },
            "meta":{}
        }))
    }

    async fn logout(headers: HeaderMap, Json(body): Json<Value>) -> Json<Value> {
        assert_eq!(headers["authorization"], "Bearer access-jwt-refreshed");
        assert_eq!(body["refresh_token"], "refresh-jwt-refreshed");
        Json(json!({"data":{"revoked":true},"meta":{}}))
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

    async fn member_list(
        headers: HeaderMap,
        axum::extract::Query(query): axum::extract::Query<BTreeMap<String, String>>,
    ) -> Json<Value> {
        assert_eq!(headers["authorization"], "Bearer access-jwt");
        assert_eq!(query.get("page").map(String::as_str), Some("1"));
        Json(json!({"data":[{"mb_id":"admin"}],"meta":{}}))
    }
}
