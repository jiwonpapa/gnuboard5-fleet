use super::sftp::RusshSftpAdapter;
use crate::core::ports::{
    EstablishedSshConnection, SftpSessionPort, SshConnectionPort, SshHostVerificationPort,
    SshHostVerificationResult, SshKnownHostTrustStateResult, SshProfileAuthType,
    SshProfileConnectionTarget, SshSessionConnectorPort, SshShellPort, SshShellReadResult,
};
use crate::error::AppError;
use g5_admin_ssh::{
    SshAuthConfig, SshClient, SshConnectRequest, SshConnectedSession, SshConnection,
    SshHostVerificationInspection, SshKnownHostTrustState, SshShell,
};
use std::path::PathBuf;
use std::sync::Arc;

#[derive(Clone)]
pub(crate) struct SshClientPortAdapter {
    inner: SshClient,
}

impl SshClientPortAdapter {
    pub(crate) fn new(inner: SshClient) -> Self {
        Self { inner }
    }
}

struct RusshConnectionAdapter {
    inner: SshConnection,
}

struct RusshShellAdapter {
    inner: SshShell,
}

#[async_trait::async_trait]
impl SshConnectionPort for RusshConnectionAdapter {
    async fn open_shell(&self) -> Result<Arc<dyn SshShellPort + Send + Sync>, AppError> {
        let shell = self.inner.open_shell().await.map_err(AppError::from)?;
        Ok(Arc::new(RusshShellAdapter { inner: shell }))
    }

    async fn open_sftp(&self) -> Result<Arc<dyn SftpSessionPort + Send + Sync>, AppError> {
        let session = self.inner.open_sftp().await.map_err(AppError::from)?;
        Ok(Arc::new(RusshSftpAdapter::new(session)))
    }

    async fn disconnect(&self) -> Result<(), AppError> {
        self.inner.disconnect().await.map_err(AppError::from)
    }
}

#[async_trait::async_trait]
impl SshShellPort for RusshShellAdapter {
    async fn write(&self, data: &str) -> Result<(), AppError> {
        self.inner.write(data).await.map_err(AppError::from)
    }

    async fn read(&self) -> Result<SshShellReadResult, AppError> {
        let output = self.inner.read().await.map_err(AppError::from)?;
        Ok(SshShellReadResult {
            stdout: output.stdout,
            stderr: output.stderr,
            closed: output.closed,
            exit_status: output.exit_status,
            exit_signal: output.exit_signal,
        })
    }

    async fn read_blocking(&self) -> Result<SshShellReadResult, AppError> {
        let output = self.inner.read_blocking().await.map_err(AppError::from)?;
        Ok(SshShellReadResult {
            stdout: output.stdout,
            stderr: output.stderr,
            closed: output.closed,
            exit_status: output.exit_status,
            exit_signal: output.exit_signal,
        })
    }

    async fn snapshot(&self) -> Result<String, AppError> {
        self.inner.snapshot().await.map_err(AppError::from)
    }

    async fn resize(&self, cols: u32, rows: u32) -> Result<(), AppError> {
        self.inner.resize(cols, rows).await.map_err(AppError::from)
    }

    async fn close(&self) -> Result<(), AppError> {
        self.inner.close().await.map_err(AppError::from)
    }
}

#[async_trait::async_trait]
impl SshSessionConnectorPort for SshClientPortAdapter {
    async fn connect(
        &self,
        target: SshProfileConnectionTarget,
    ) -> Result<EstablishedSshConnection, AppError> {
        let auth = match target.profile.auth_type {
            SshProfileAuthType::Password => SshAuthConfig::Password {
                password: target.password.ok_or_else(|| AppError::Config {
                    message:
                        "SSH 비밀번호가 저장되어 있지 않습니다. 프로필에서 비밀번호를 다시 입력해 주십시오."
                            .to_string(),
                })?,
            },
            SshProfileAuthType::Key => SshAuthConfig::Key {
                key_path: PathBuf::from(target.profile.key_path.clone().ok_or_else(|| {
                    AppError::Config {
                        message: "키 인증 프로필에는 개인키 경로가 필요합니다.".to_string(),
                    }
                })?),
                passphrase: target.key_passphrase,
            },
            SshProfileAuthType::Agent => SshAuthConfig::Agent,
        };
        let connected = SshClient::connect(
            &self.inner,
            SshConnectRequest {
                host: target.profile.host.clone(),
                port: target.profile.port,
                username: target.profile.username.clone(),
                auth,
            },
        )
        .await
        .map_err(AppError::from)?;
        let SshConnectedSession {
            connection,
            metadata,
        } = connected;

        Ok(EstablishedSshConnection {
            connection: Arc::new(RusshConnectionAdapter { inner: connection }),
            server_key_algorithm: metadata.server_key_algorithm,
            server_key_fingerprint: metadata.server_key_fingerprint,
        })
    }
}

#[async_trait::async_trait]
impl SshHostVerificationPort for SshClientPortAdapter {
    async fn inspect_host_verification(
        &self,
        host: &str,
        port: u16,
    ) -> Result<SshHostVerificationResult, AppError> {
        let inspection = SshClient::inspect_host_verification(&self.inner, host, port)
            .await
            .map_err(AppError::from)?;
        Ok(map_host_verification(inspection))
    }

    async fn trust_host_verification(
        &self,
        host: &str,
        port: u16,
        expected_fingerprint: &str,
    ) -> Result<SshHostVerificationResult, AppError> {
        let inspection =
            SshClient::trust_host_verification(&self.inner, host, port, Some(expected_fingerprint))
                .await
                .map_err(AppError::from)?;
        Ok(map_host_verification(inspection))
    }
}

fn map_host_verification(inspection: SshHostVerificationInspection) -> SshHostVerificationResult {
    SshHostVerificationResult {
        server_key_algorithm: inspection.server_key_algorithm,
        server_key_fingerprint: inspection.server_key_fingerprint,
        trust_state: match inspection.trust_state {
            SshKnownHostTrustState::Trusted => SshKnownHostTrustStateResult::Trusted,
            SshKnownHostTrustState::Missing => SshKnownHostTrustStateResult::Missing,
            SshKnownHostTrustState::Changed => SshKnownHostTrustStateResult::Changed,
        },
    }
}
