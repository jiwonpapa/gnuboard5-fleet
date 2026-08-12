use async_trait::async_trait;
use serde::{Deserialize, Serialize};

pub mod admin;
pub mod members;
pub mod permissions;

pub type FleetResult<T> = Result<T, AppErrorPayload>;

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct ApiTraceMeta {
    pub request_id: Option<String>,
    pub correlation_id: Option<String>,
    pub server_request_id: Option<String>,
    pub error_code: Option<String>,
    pub error_category: Option<String>,
    pub fault_domain: Option<String>,
    pub owner: Option<String>,
    pub retryable: Option<bool>,
    pub user_actionable: Option<bool>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct ResponseTrace {
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
}

impl ResponseTrace {
    pub fn local(request_id: impl Into<String>) -> Self {
        let request_id = request_id.into();
        Self {
            request_id: request_id.clone(),
            correlation_id: request_id,
            server_request_id: None,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct Traced<T> {
    pub value: T,
    pub trace: ResponseTrace,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct ErrorGuide {
    pub action: Option<String>,
    pub reason: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct ProblemDetails {
    pub r#type: String,
    pub status: u16,
    pub title: String,
    pub detail: String,
    pub instance: Option<String>,
    pub request_id: Option<String>,
    pub correlation_id: Option<String>,
    pub server_request_id: Option<String>,
    pub error_code: Option<String>,
    pub error_category: Option<String>,
    pub fault_domain: Option<String>,
    pub owner: Option<String>,
    pub retryable: Option<bool>,
    pub user_actionable: Option<bool>,
    pub guide: Option<ErrorGuide>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AppErrorPayload {
    pub code: String,
    pub message: String,
    pub guide: Option<ErrorGuide>,
    pub request_id: String,
    pub correlation_id: String,
    pub server_request_id: Option<String>,
    pub status: Option<u16>,
    pub target: Option<String>,
    pub detail: Option<String>,
    pub error_category: String,
    pub fault_domain: String,
    pub owner: String,
    pub retryable: bool,
    pub user_actionable: bool,
}

#[derive(Clone, Debug)]
pub struct ErrorClassification {
    code: String,
    error_category: String,
    fault_domain: String,
    owner: String,
    retryable: bool,
    user_actionable: bool,
}

impl ErrorClassification {
    pub fn into_payload(
        self,
        message: impl Into<String>,
        guide: Option<ErrorGuide>,
        trace: ResponseTrace,
        status: Option<u16>,
        target: Option<String>,
        detail: Option<String>,
    ) -> AppErrorPayload {
        AppErrorPayload {
            code: self.code,
            message: message.into(),
            guide,
            request_id: trace.request_id,
            correlation_id: trace.correlation_id,
            server_request_id: trace.server_request_id,
            status,
            target,
            detail,
            error_category: self.error_category,
            fault_domain: self.fault_domain,
            owner: self.owner,
            retryable: self.retryable,
            user_actionable: self.user_actionable,
        }
    }
}

pub fn config_classification() -> ErrorClassification {
    ErrorClassification {
        code: "config_error".into(),
        error_category: "config".into(),
        fault_domain: "server_runtime".into(),
        owner: "rust_server".into(),
        retryable: false,
        user_actionable: true,
    }
}

pub fn host_verification_classification() -> ErrorClassification {
    ErrorClassification {
        code: "ssh_host_verification_error".into(),
        error_category: "security".into(),
        fault_domain: "transport".into(),
        owner: "infra".into(),
        retryable: false,
        user_actionable: true,
    }
}

pub fn api_classification(status: u16, meta: Option<&ApiTraceMeta>) -> ErrorClassification {
    let fallback = match status {
        400 | 422 => ("bad_request", "client_input", "rust_server", false, true),
        401 | 403 => ("auth", "auth", "php_api", false, true),
        404 | 409 => ("server_business", "server_business", "php_api", false, true),
        429 => ("rate_limit", "infra", "php_api", true, true),
        502..=504 => ("upstream", "external_dependency", "infra", true, false),
        500..=599 => ("server_error", "server_business", "php_api", false, false),
        _ => ("http_error", "server_business", "php_api", false, false),
    };
    ErrorClassification {
        code: meta
            .and_then(|value| value.error_code.clone())
            .unwrap_or_else(|| format!("api_{status}")),
        error_category: meta
            .and_then(|value| value.error_category.clone())
            .unwrap_or_else(|| fallback.0.into()),
        fault_domain: meta
            .and_then(|value| value.fault_domain.clone())
            .unwrap_or_else(|| fallback.1.into()),
        owner: meta
            .and_then(|value| value.owner.clone())
            .unwrap_or_else(|| fallback.2.into()),
        retryable: meta.and_then(|value| value.retryable).unwrap_or(fallback.3),
        user_actionable: meta
            .and_then(|value| value.user_actionable)
            .unwrap_or(fallback.4),
    }
}

#[derive(Debug, thiserror::Error)]
#[error("API {status}: {title}")]
pub struct ApiErrorContext {
    pub target: String,
    pub status: u16,
    pub title: String,
    pub detail: String,
    pub trace: ResponseTrace,
    pub meta: Option<ApiTraceMeta>,
}

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{message}")]
    Config { message: String },
    #[error("{message}")]
    HostVerification { message: String },
    #[error("API {status}: {title}")]
    Api {
        #[source]
        context: Box<ApiErrorContext>,
        status: u16,
        title: String,
    },
}

impl AppError {
    pub fn into_payload(self, local_request_id: impl Into<String>) -> AppErrorPayload {
        let local_trace = ResponseTrace::local(local_request_id);
        match self {
            Self::Config { message } => config_classification().into_payload(
                message,
                Some(ErrorGuide {
                    action: Some("입력값, 서버 경로와 사이트 연결 전제조건을 확인하세요.".into()),
                    reason: None,
                }),
                local_trace,
                None,
                None,
                None,
            ),
            Self::HostVerification { message } => host_verification_classification().into_payload(
                message,
                Some(ErrorGuide {
                    action: Some("서버 키 지문을 확인하고 신뢰 여부를 결정하세요.".into()),
                    reason: Some(
                        "SSH 서버 신뢰 확인이 아직 Fleet 저장소에 반영되지 않았습니다.".into(),
                    ),
                }),
                local_trace,
                None,
                Some("ssh-runtime".into()),
                None,
            ),
            Self::Api {
                context,
                status,
                title,
            } => {
                let ApiErrorContext {
                    target,
                    detail,
                    trace,
                    meta,
                    ..
                } = *context;
                api_classification(status, meta.as_ref()).into_payload(
                    title,
                    None,
                    trace,
                    Some(status),
                    Some(target),
                    Some(detail),
                )
            }
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct SiteApiTarget {
    pub principal_id: String,
    pub site_id: String,
    pub base_url: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct AuthLogin {
    pub member_id: String,
    pub password: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct TokenPair {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: u64,
}

#[async_trait]
pub trait AdminApiPort: Send + Sync {
    async fn login(
        &self,
        target: &SiteApiTarget,
        request_id: &str,
        input: &AuthLogin,
    ) -> Result<Traced<TokenPair>, AppError>;
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct SessionScope {
    pub principal_id: String,
    pub site_id: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct StoredSession {
    pub member_id: String,
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: u64,
}

#[async_trait]
pub trait SiteScopedSessionPort: Send + Sync {
    async fn load(&self, scope: &SessionScope) -> Result<Option<StoredSession>, AppError>;
    async fn save(&self, scope: &SessionScope, session: &StoredSession) -> Result<(), AppError>;
    async fn clear(&self, scope: &SessionScope) -> Result<(), AppError>;
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SftpEntryKind {
    Directory,
    File,
    Symlink,
    Other,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct SftpPathMetadata {
    pub kind: SftpEntryKind,
    pub size_bytes: Option<u64>,
    pub permissions_octal: Option<String>,
    pub modified_at_epoch: Option<u64>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct SshShellReadResult {
    pub stdout: String,
    pub stderr: String,
    pub closed: bool,
    pub exit_status: Option<u32>,
    pub exit_signal: Option<String>,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RuntimeSecretStorage {
    ExternalMasterKey,
    EncryptedSqlite,
}

#[cfg(test)]
mod tests {
    use std::{collections::BTreeMap, sync::Mutex};

    use super::*;

    #[test]
    fn config_classification_builds_user_actionable_payload() {
        let payload = config_classification().into_payload(
            "missing config",
            None,
            ResponseTrace::local("req-config"),
            None,
            None,
            None,
        );
        assert_eq!(payload.code, "config_error");
        assert_eq!(payload.owner, "rust_server");
        assert!(payload.user_actionable);
        assert!(!payload.retryable);
    }

    #[test]
    fn api_classification_uses_503_retryable_fallback() {
        let payload = api_classification(503, None).into_payload(
            "service unavailable",
            None,
            ResponseTrace::local("req-api"),
            Some(503),
            Some("/admin/test".into()),
            None,
        );
        assert_eq!(payload.code, "api_503");
        assert_eq!(payload.owner, "infra");
        assert!(payload.retryable);
        assert!(!payload.user_actionable);
    }

    #[test]
    fn config_error_into_payload_keeps_local_trace_and_user_actionability() {
        let payload = AppError::Config {
            message: "missing config".into(),
        }
        .into_payload("req-config");
        assert_eq!(payload.request_id, "req-config");
        assert_eq!(payload.correlation_id, "req-config");
        assert!(payload.user_actionable);
    }

    #[test]
    fn host_verification_error_into_payload_uses_ssh_specific_guide() {
        let payload = AppError::HostVerification {
            message: "unknown host key".into(),
        }
        .into_payload("req-host");
        assert_eq!(payload.code, "ssh_host_verification_error");
        assert_eq!(payload.target.as_deref(), Some("ssh-runtime"));
        assert_eq!(payload.error_category, "security");
    }

    #[test]
    fn api_error_into_payload_uses_server_trace_and_status_fallback() {
        let payload = AppError::Api {
            context: Box::new(ApiErrorContext {
                target: "/admin/test".into(),
                status: 503,
                title: "service unavailable".into(),
                detail: "please retry".into(),
                trace: ResponseTrace {
                    request_id: "req-api".into(),
                    correlation_id: "corr-api".into(),
                    server_request_id: Some("srv-api".into()),
                },
                meta: None,
            }),
            status: 503,
            title: "service unavailable".into(),
        }
        .into_payload("ignored");
        assert_eq!(payload.correlation_id, "corr-api");
        assert_eq!(payload.server_request_id.as_deref(), Some("srv-api"));
        assert!(payload.retryable);
    }

    struct FakeAdminApi;

    #[async_trait]
    impl AdminApiPort for FakeAdminApi {
        async fn login(
            &self,
            target: &SiteApiTarget,
            request_id: &str,
            _input: &AuthLogin,
        ) -> Result<Traced<TokenPair>, AppError> {
            assert_eq!(target.principal_id, "user-1");
            assert_eq!(target.site_id, "site-1");
            Ok(Traced {
                value: TokenPair {
                    access_token: "access".into(),
                    refresh_token: "refresh".into(),
                    expires_in: 3600,
                },
                trace: ResponseTrace::local(request_id),
            })
        }
    }

    #[tokio::test]
    async fn admin_api_port_requires_explicit_principal_and_site_target() {
        let result = FakeAdminApi
            .login(
                &SiteApiTarget {
                    principal_id: "user-1".into(),
                    site_id: "site-1".into(),
                    base_url: "https://example.test".into(),
                },
                "req-login",
                &AuthLogin {
                    member_id: "admin".into(),
                    password: "secret".into(),
                },
            )
            .await
            .expect("login");
        assert_eq!(result.trace.request_id, "req-login");
        assert_eq!(result.value.expires_in, 3600);
    }

    #[test]
    fn shell_read_result_defaults_to_open_empty_output() {
        let result = SshShellReadResult::default();
        assert!(result.stdout.is_empty());
        assert!(!result.closed);
        assert_eq!(result.exit_status, None);
    }

    #[test]
    fn sftp_metadata_kind_is_value_comparable() {
        let metadata = SftpPathMetadata {
            kind: SftpEntryKind::Directory,
            size_bytes: None,
            permissions_octal: Some("0755".into()),
            modified_at_epoch: None,
        };
        assert_eq!(metadata.kind, SftpEntryKind::Directory);
        assert_eq!(metadata.permissions_octal.as_deref(), Some("0755"));
    }

    #[derive(Default)]
    struct FakeSessionStore {
        values: Mutex<BTreeMap<(String, String), StoredSession>>,
    }

    #[async_trait]
    impl SiteScopedSessionPort for FakeSessionStore {
        async fn load(&self, scope: &SessionScope) -> Result<Option<StoredSession>, AppError> {
            Ok(self
                .values
                .lock()
                .expect("session lock")
                .get(&(scope.principal_id.clone(), scope.site_id.clone()))
                .cloned())
        }

        async fn save(
            &self,
            scope: &SessionScope,
            session: &StoredSession,
        ) -> Result<(), AppError> {
            self.values.lock().expect("session lock").insert(
                (scope.principal_id.clone(), scope.site_id.clone()),
                session.clone(),
            );
            Ok(())
        }

        async fn clear(&self, scope: &SessionScope) -> Result<(), AppError> {
            self.values
                .lock()
                .expect("session lock")
                .remove(&(scope.principal_id.clone(), scope.site_id.clone()));
            Ok(())
        }
    }

    #[tokio::test]
    async fn session_store_contract_is_principal_and_site_scoped() {
        let store = FakeSessionStore::default();
        let scope = SessionScope {
            principal_id: "user-1".into(),
            site_id: "site-1".into(),
        };
        let session = StoredSession {
            member_id: "admin".into(),
            access_token: "access".into(),
            refresh_token: "refresh".into(),
            expires_in: 3600,
        };
        store.save(&scope, &session).await.expect("save");
        assert_eq!(store.load(&scope).await.expect("load"), Some(session));
        assert!(
            store
                .load(&SessionScope {
                    principal_id: "user-2".into(),
                    site_id: "site-1".into(),
                })
                .await
                .expect("other user")
                .is_none()
        );
    }

    #[test]
    fn web_contract_serializes_without_desktop_runtime_types() {
        let target = SiteApiTarget {
            principal_id: "user-1".into(),
            site_id: "site-1".into(),
            base_url: "https://example.test".into(),
        };
        let value = serde_json::to_value(target).expect("serialize");
        assert_eq!(value.as_object().map(serde_json::Map::len), Some(3));
        assert_eq!(value["principal_id"], "user-1");
        assert_eq!(value["site_id"], "site-1");
        assert_eq!(value["base_url"], "https://example.test");
        assert_eq!(
            serde_json::to_value(RuntimeSecretStorage::EncryptedSqlite).expect("runtime mode"),
            "encrypted_sqlite"
        );
    }
}
