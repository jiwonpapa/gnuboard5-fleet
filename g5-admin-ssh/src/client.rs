use crate::connection::SshConnection;
use crate::error::SshClientError;
use crate::host_verification::{ObservedServerKey, ProbeKnownHostsClient, StrictKnownHostsClient};
use crate::types::{
    SshAuthConfig, SshConnectRequest, SshConnectedSession, SshHostVerificationInspection,
    SshKnownHostTrustState,
};
use russh::client;
use russh::keys::known_hosts::learn_known_hosts;
use russh::keys::{load_secret_key, PrivateKeyWithHashAlg};
use std::sync::Arc;
use std::time::Duration;

const SSH_INACTIVITY_TIMEOUT_SECS: u64 = 30;
const SSH_KEEPALIVE_INTERVAL_SECS: u64 = 10;
const SSH_KEEPALIVE_MAX: usize = 3;

pub(crate) type SshHandle = client::Handle<StrictKnownHostsClient>;

#[derive(Clone)]
pub struct SshClient;

impl Default for SshClient {
    fn default() -> Self {
        Self
    }
}

impl SshClient {
    pub fn new() -> Self {
        Self
    }

    pub async fn connect(
        &self,
        request: SshConnectRequest,
    ) -> Result<SshConnectedSession, SshClientError> {
        let observed_server_key = ObservedServerKey::default();
        let handler = StrictKnownHostsClient {
            host: request.host.clone(),
            observed_server_key: observed_server_key.clone(),
            port: request.port,
        };
        let config = Arc::new(client::Config {
            inactivity_timeout: Some(Duration::from_secs(SSH_INACTIVITY_TIMEOUT_SECS)),
            keepalive_interval: Some(Duration::from_secs(SSH_KEEPALIVE_INTERVAL_SECS)),
            keepalive_max: SSH_KEEPALIVE_MAX,
            ..client::Config::default()
        });
        let mut handle =
            client::connect(config, (request.host.as_str(), request.port), handler).await?;

        match request.auth {
            SshAuthConfig::Password { password } => {
                let auth_result = handle
                    .authenticate_password(request.username.clone(), password)
                    .await?;
                if !auth_result.success() {
                    return Err(SshClientError::Auth {
                        message: format!(
                            "SSH 비밀번호 인증에 실패했습니다: {}@{}:{}",
                            request.username, request.host, request.port
                        ),
                    });
                }
            }
            SshAuthConfig::Key {
                key_path,
                passphrase,
            } => {
                let key = load_secret_key(key_path, passphrase.as_deref()).map_err(|error| {
                    SshClientError::Config {
                        message: format!("SSH 개인키를 읽지 못했습니다: {error}"),
                    }
                })?;
                let auth_result = handle
                    .authenticate_publickey(
                        request.username.clone(),
                        PrivateKeyWithHashAlg::new(
                            Arc::new(key),
                            handle.best_supported_rsa_hash().await?.flatten(),
                        ),
                    )
                    .await?;
                if !auth_result.success() {
                    return Err(SshClientError::Auth {
                        message: format!(
                            "SSH 키 인증에 실패했습니다: {}@{}:{}",
                            request.username, request.host, request.port
                        ),
                    });
                }
            }
            SshAuthConfig::Agent => {
                return Err(SshClientError::Config {
                    message:
                        "SSH agent 인증은 아직 연결 슬라이스에 포함되지 않았습니다. 비밀번호 또는 키 인증 프로필을 사용해 주십시오."
                            .to_string(),
                });
            }
        }

        Ok(SshConnectedSession {
            connection: SshConnection::new(handle),
            metadata: observed_server_key.connect_snapshot().await,
        })
    }

    pub async fn inspect_host_verification(
        &self,
        host: &str,
        port: u16,
    ) -> Result<SshHostVerificationInspection, SshClientError> {
        Ok(probe_server_key(host, port).await?.inspection)
    }

    pub async fn trust_host_verification(
        &self,
        host: &str,
        port: u16,
        expected_fingerprint: Option<&str>,
    ) -> Result<SshHostVerificationInspection, SshClientError> {
        let observed = probe_server_key(host, port).await?;

        match observed.inspection.trust_state {
            SshKnownHostTrustState::Trusted => Ok(observed.inspection),
            SshKnownHostTrustState::Missing => {
                if let Some(expected_fingerprint) = expected_fingerprint {
                    if observed.inspection.server_key_fingerprint != expected_fingerprint {
                        return Err(SshClientError::HostVerification {
                            message: format!(
                                "서버 지문이 바뀌었습니다. 기대한 지문은 {}, 현재 지문은 {} 입니다.",
                                expected_fingerprint, observed.inspection.server_key_fingerprint
                            ),
                        });
                    }
                }

                learn_known_hosts(host, port, &observed.public_key).map_err(|error| {
                    SshClientError::Config {
                        message: format!(
                            "known_hosts에 SSH 서버 공개키를 저장하지 못했습니다: {error}"
                        ),
                    }
                })?;

                Ok(SshHostVerificationInspection {
                    trust_state: SshKnownHostTrustState::Trusted,
                    ..observed.inspection
                })
            }
            SshKnownHostTrustState::Changed => Err(SshClientError::HostVerification {
                message: format!(
                    "known_hosts에 기록된 SSH 서버 키가 현재 {}:{} 서버와 다릅니다. 앱이 자동 덮어쓰기를 중단했습니다.",
                    host, port
                ),
            }),
        }
    }
}

async fn probe_server_key(
    host: &str,
    port: u16,
) -> Result<crate::host_verification::ObservedHostVerification, SshClientError> {
    let observed_server_key = ObservedServerKey::default();
    let handler = ProbeKnownHostsClient {
        host: host.to_string(),
        observed_server_key: observed_server_key.clone(),
        port,
    };
    let config = Arc::new(client::Config {
        inactivity_timeout: Some(Duration::from_secs(SSH_INACTIVITY_TIMEOUT_SECS)),
        keepalive_interval: Some(Duration::from_secs(SSH_KEEPALIVE_INTERVAL_SECS)),
        keepalive_max: SSH_KEEPALIVE_MAX,
        ..client::Config::default()
    });
    let handle = client::connect(config, (host, port), handler).await?;
    let _ = handle
        .disconnect(russh::Disconnect::ByApplication, "host-probe", "en")
        .await;
    observed_server_key.verification_snapshot().await
}
