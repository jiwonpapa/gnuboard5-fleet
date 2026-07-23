use g5_admin_error_contract::{
    api_classification, auth_classification, config_classification,
    host_verification_classification, serialization_classification, storage_classification,
    token_store_classification, transport_classification, AppErrorPayload, ErrorGuide,
    ResponseTrace,
};
use thiserror::Error;

#[derive(Debug, Error)]
#[error("api error on {target}: {title}")]
pub struct ApiErrorContext {
    pub target: String,
    pub status: u16,
    pub title: String,
    pub detail: String,
    pub trace: ResponseTrace,
    pub error_code: Option<String>,
    pub error_category: Option<String>,
    pub fault_domain: Option<String>,
    pub owner: Option<String>,
    pub retryable: Option<bool>,
    pub user_actionable: Option<bool>,
    pub guide: Option<ErrorGuide>,
}

#[derive(Debug, Error)]
pub enum AppError {
    #[error("{message}")]
    Config { message: String },
    #[error("{message}")]
    HostVerification { message: String },
    #[error("{message}")]
    Auth { message: String },
    #[error("transport error on {target}: {error}")]
    Transport { target: String, error: String },
    #[error("serialization error on {target}: {error}")]
    Serialization { target: String, error: String },
    #[error("token store error during {operation}: {error}")]
    TokenStore { operation: String, error: String },
    #[error("storage error on {target}: {error}")]
    Storage { target: String, error: String },
    #[error(transparent)]
    Api(Box<ApiErrorContext>),
}

impl AppError {
    pub fn into_payload(self, request_id: impl Into<String>) -> AppErrorPayload {
        let default_trace = ResponseTrace::local(request_id.into());

        match self {
            Self::Config { message } => config_classification().into_payload(
                message,
                Some(ErrorGuide {
                    action: Some(
                        "입력값, 로컬 경로, SSH/SFTP 연결 전제조건을 확인하세요.".to_string(),
                    ),
                    reason: Some("필수 설정이 누락되었거나 잘못되었습니다.".to_string()),
                }),
                default_trace,
                None,
                None,
                None,
            ),
            Self::HostVerification { message } => host_verification_classification().into_payload(
                message,
                Some(ErrorGuide {
                    action: Some(
                        "SSH 연결 화면에서 서버 지문을 확인한 뒤 `이 서버 신뢰`를 눌러 앱 안에서 바로 등록하세요."
                            .to_string(),
                    ),
                    reason: Some(
                        "SSH 서버 신뢰 확인이 아직 ~/.ssh/known_hosts에 반영되지 않았습니다."
                            .to_string(),
                    ),
                }),
                default_trace,
                None,
                Some("ssh-runtime".to_string()),
                None,
            ),
            Self::Auth { message } => auth_classification().into_payload(
                message,
                Some(ErrorGuide {
                    action: Some("다시 로그인하세요.".to_string()),
                    reason: Some("인증 세션이 없거나 이미 정리되었습니다.".to_string()),
                }),
                default_trace,
                None,
                None,
                None,
            ),
            Self::Transport { error, target } => transport_classification().into_payload(
                error,
                Some(ErrorGuide {
                    action: Some("서버 연결 상태를 확인한 뒤 다시 시도하세요.".to_string()),
                    reason: Some("API 호출이 네트워크 단계에서 실패했습니다.".to_string()),
                }),
                default_trace,
                None,
                Some(target),
                None,
            ),
            Self::Serialization { error, target } => serialization_classification().into_payload(
                error,
                Some(ErrorGuide {
                    action: Some("OpenAPI 계약과 DTO를 함께 점검하세요.".to_string()),
                    reason: Some("응답 직렬화 또는 역직렬화가 실패했습니다.".to_string()),
                }),
                default_trace,
                None,
                Some(target),
                None,
            ),
            Self::TokenStore { operation, error } => token_store_classification().into_payload(
                error,
                Some(ErrorGuide {
                    action: Some(
                        "sessionStorage 설정과 로컬 저장 파일 권한을 확인하세요. 현재 앱은 DB master key와 세션을 file 저장소 기준으로 사용합니다."
                            .to_string(),
                    ),
                    reason: Some("토큰 저장소 접근에 실패했습니다.".to_string()),
                }),
                default_trace,
                None,
                Some(operation),
                None,
            ),
            Self::Storage { target, error } => storage_classification().into_payload(
                error,
                Some(ErrorGuide {
                    action: Some("저장 위치 권한과 선택한 경로를 확인한 뒤 다시 시도하세요.".to_string()),
                    reason: Some("로컬 파일 저장 단계에서 실패했습니다.".to_string()),
                }),
                default_trace,
                None,
                Some(target),
                None,
            ),
            Self::Api(context) => {
                let ApiErrorContext {
                    target,
                    status,
                    title,
                    detail,
                    trace,
                    error_code,
                    error_category,
                    fault_domain,
                    owner,
                    retryable,
                    user_actionable,
                    guide,
                } = *context;
                let classification = api_classification(
                    status,
                    error_code,
                    error_category,
                    fault_domain,
                    owner,
                    retryable,
                    user_actionable,
                );
                let message = if detail.is_empty() || detail == title {
                    title
                } else {
                    format!("{title}: {detail}")
                };

                classification.into_payload(
                    message,
                    guide,
                    trace,
                    Some(status),
                    Some(target),
                    if detail.is_empty() { None } else { Some(detail) },
                )
            }
        }
    }

    pub fn status_code(&self) -> Option<u16> {
        match self {
            Self::Api(context) => Some(context.status),
            _ => None,
        }
    }
}

#[cfg(feature = "desktop-conversions")]
mod desktop_conversions {
    use super::{ApiErrorContext, AppError};

    impl From<g5_admin_debug_support::DebugSupportError> for AppError {
        fn from(error: g5_admin_debug_support::DebugSupportError) -> Self {
            match error {
                g5_admin_debug_support::DebugSupportError::Config { message } => {
                    Self::Config { message }
                }
            }
        }
    }

    impl From<g5_admin_local_store::error::AppError> for AppError {
        fn from(error: g5_admin_local_store::error::AppError) -> Self {
            match error {
                g5_admin_local_store::error::AppError::Config { message } => {
                    Self::Config { message }
                }
                g5_admin_local_store::error::AppError::Auth { message } => Self::Auth { message },
                g5_admin_local_store::error::AppError::Storage { target, error } => {
                    Self::Storage { target, error }
                }
            }
        }
    }

    impl From<g5_admin_runtime_config::RuntimeConfigError> for AppError {
        fn from(error: g5_admin_runtime_config::RuntimeConfigError) -> Self {
            match error {
                g5_admin_runtime_config::RuntimeConfigError::Config { message } => {
                    Self::Config { message }
                }
            }
        }
    }

    impl From<g5_admin_security_core::SecurityCoreError> for AppError {
        fn from(error: g5_admin_security_core::SecurityCoreError) -> Self {
            match error {
                g5_admin_security_core::SecurityCoreError::Config { message } => {
                    Self::Config { message }
                }
                g5_admin_security_core::SecurityCoreError::Storage { target, error } => {
                    Self::Storage { target, error }
                }
            }
        }
    }

    impl From<g5_admin_session_store::error::AppError> for AppError {
        fn from(error: g5_admin_session_store::error::AppError) -> Self {
            match error {
                g5_admin_session_store::error::AppError::Config { message } => {
                    Self::Config { message }
                }
                g5_admin_session_store::error::AppError::Auth { message } => Self::Auth { message },
                g5_admin_session_store::error::AppError::TokenStore { operation, error } => {
                    Self::TokenStore { operation, error }
                }
                g5_admin_session_store::error::AppError::Storage { target, error } => {
                    Self::Storage { target, error }
                }
            }
        }
    }

    impl From<g5_admin_site_manager::SiteManagerError> for AppError {
        fn from(error: g5_admin_site_manager::SiteManagerError) -> Self {
            match error {
                g5_admin_site_manager::SiteManagerError::Config { message } => {
                    Self::Config { message }
                }
            }
        }
    }

    impl From<g5_admin_ssh::SshClientError> for AppError {
        fn from(value: g5_admin_ssh::SshClientError) -> Self {
            match value {
                g5_admin_ssh::SshClientError::Config { message } => Self::Config { message },
                g5_admin_ssh::SshClientError::HostVerification { message } => {
                    Self::HostVerification { message }
                }
                g5_admin_ssh::SshClientError::Auth { message } => Self::Auth { message },
                g5_admin_ssh::SshClientError::Storage { target, error } => {
                    Self::Storage { target, error }
                }
                g5_admin_ssh::SshClientError::Transport { error } => Self::Transport {
                    target: "ssh-runtime".to_string(),
                    error,
                },
            }
        }
    }

    impl From<g5_admin_ssh_terminal_bridge::TerminalBridgeError> for AppError {
        fn from(error: g5_admin_ssh_terminal_bridge::TerminalBridgeError) -> Self {
            Self::Config {
                message: error.to_string(),
            }
        }
    }

    impl From<g5_admin_transport::ApiClientError> for AppError {
        fn from(value: g5_admin_transport::ApiClientError) -> Self {
            match value {
                g5_admin_transport::ApiClientError::Config { message } => Self::Config { message },
                g5_admin_transport::ApiClientError::Auth { message } => Self::Auth { message },
                g5_admin_transport::ApiClientError::Transport { target, error } => {
                    Self::Transport { target, error }
                }
                g5_admin_transport::ApiClientError::Serialization { target, error } => {
                    Self::Serialization { target, error }
                }
                g5_admin_transport::ApiClientError::Api(failure) => {
                    let g5_admin_transport::ApiFailure {
                        target,
                        status,
                        title,
                        detail,
                        trace,
                        error_code,
                        error_category,
                        fault_domain,
                        owner,
                        retryable,
                        user_actionable,
                        guide,
                    } = *failure;
                    Self::Api(Box::new(ApiErrorContext {
                        target,
                        status,
                        title,
                        detail,
                        trace,
                        error_code,
                        error_category,
                        fault_domain,
                        owner,
                        retryable,
                        user_actionable,
                        guide,
                    }))
                }
            }
        }
    }
}

#[cfg(test)]
mod tests;
