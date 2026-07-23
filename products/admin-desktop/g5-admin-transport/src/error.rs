use g5_admin_error_contract::{ErrorGuide, ResponseTrace};
use thiserror::Error;

#[derive(Debug, Error)]
#[error("api error on {target}: {title}")]
pub struct ApiFailure {
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
pub enum ApiClientError {
    #[error("{message}")]
    Config { message: String },
    #[error("{message}")]
    Auth { message: String },
    #[error("transport error on {target}: {error}")]
    Transport { target: String, error: String },
    #[error("serialization error on {target}: {error}")]
    Serialization { target: String, error: String },
    #[error(transparent)]
    Api(Box<ApiFailure>),
}

impl ApiClientError {
    pub fn is_retryable_transport(&self) -> bool {
        matches!(self, Self::Transport { .. })
    }
}
