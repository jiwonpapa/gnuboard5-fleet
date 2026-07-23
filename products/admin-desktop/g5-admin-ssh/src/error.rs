use thiserror::Error;

#[derive(Debug, Error)]
pub enum SshClientError {
    #[error("{message}")]
    Config { message: String },
    #[error("{message}")]
    Auth { message: String },
    #[error("{message}")]
    HostVerification { message: String },
    #[error("storage error on {target}: {error}")]
    Storage { target: String, error: String },
    #[error("ssh transport error: {error}")]
    Transport { error: String },
}

impl From<russh::Error> for SshClientError {
    fn from(value: russh::Error) -> Self {
        Self::Transport {
            error: value.to_string(),
        }
    }
}

impl From<std::io::Error> for SshClientError {
    fn from(value: std::io::Error) -> Self {
        Self::Transport {
            error: value.to_string(),
        }
    }
}

impl From<russh_sftp::client::error::Error> for SshClientError {
    fn from(value: russh_sftp::client::error::Error) -> Self {
        match value {
            russh_sftp::client::error::Error::Status(status) => Self::Config {
                message: format!(
                    "SFTP 요청이 거절되었습니다 ({:?}): {}",
                    status.status_code, status.error_message
                ),
            },
            error => Self::Transport {
                error: error.to_string(),
            },
        }
    }
}
