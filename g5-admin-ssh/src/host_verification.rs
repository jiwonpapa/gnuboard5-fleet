use crate::error::SshClientError;
use crate::types::{SshHostVerificationInspection, SshKnownHostTrustState};
use russh::client;
use russh::keys::{check_known_hosts, ssh_key};
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Default, Clone)]
pub(crate) struct ObservedServerKey {
    algorithm: Arc<RwLock<Option<String>>>,
    fingerprint: Arc<RwLock<Option<String>>>,
    public_key: Arc<RwLock<Option<ssh_key::PublicKey>>>,
    trust_state: Arc<RwLock<Option<SshKnownHostTrustState>>>,
}

impl ObservedServerKey {
    pub(crate) async fn record(&self, public_key: &ssh_key::PublicKey) {
        *self.algorithm.write().await = Some(format!("{:?}", public_key.algorithm()));
        *self.fingerprint.write().await =
            Some(public_key.fingerprint(ssh_key::HashAlg::Sha256).to_string());
        *self.public_key.write().await = Some(public_key.clone());
    }

    pub(crate) async fn set_trust_state(&self, trust_state: SshKnownHostTrustState) {
        *self.trust_state.write().await = Some(trust_state);
    }

    pub(crate) async fn connect_snapshot(&self) -> crate::types::SshConnectedMetadata {
        crate::types::SshConnectedMetadata {
            server_key_algorithm: self
                .algorithm
                .read()
                .await
                .clone()
                .unwrap_or_else(|| "unknown".to_string()),
            server_key_fingerprint: self
                .fingerprint
                .read()
                .await
                .clone()
                .unwrap_or_else(|| "unknown".to_string()),
        }
    }

    pub(crate) async fn verification_snapshot(
        &self,
    ) -> Result<ObservedHostVerification, SshClientError> {
        let public_key =
            self.public_key
                .read()
                .await
                .clone()
                .ok_or_else(|| SshClientError::Transport {
                    error: "SSH 서버 공개키를 관측하지 못했습니다.".to_string(),
                })?;
        let trust_state = self
            .trust_state
            .read()
            .await
            .as_ref()
            .copied()
            .ok_or_else(|| SshClientError::Transport {
                error: "SSH 서버 신뢰 상태를 계산하지 못했습니다.".to_string(),
            })?;

        Ok(ObservedHostVerification {
            public_key,
            inspection: SshHostVerificationInspection {
                server_key_algorithm: self
                    .algorithm
                    .read()
                    .await
                    .clone()
                    .unwrap_or_else(|| "unknown".to_string()),
                server_key_fingerprint: self
                    .fingerprint
                    .read()
                    .await
                    .clone()
                    .unwrap_or_else(|| "unknown".to_string()),
                trust_state,
            },
        })
    }
}

pub(crate) struct ObservedHostVerification {
    pub(crate) inspection: SshHostVerificationInspection,
    pub(crate) public_key: ssh_key::PublicKey,
}

pub(crate) struct StrictKnownHostsClient {
    pub(crate) host: String,
    pub(crate) observed_server_key: ObservedServerKey,
    pub(crate) port: u16,
}

pub(crate) struct ProbeKnownHostsClient {
    pub(crate) host: String,
    pub(crate) observed_server_key: ObservedServerKey,
    pub(crate) port: u16,
}

impl client::Handler for StrictKnownHostsClient {
    type Error = SshClientError;

    async fn check_server_key(
        &mut self,
        server_public_key: &ssh_key::PublicKey,
    ) -> Result<bool, Self::Error> {
        self.observed_server_key.record(server_public_key).await;

        match check_known_hosts(&self.host, self.port, server_public_key) {
            Ok(true) => Ok(true),
            Ok(false) => Err(SshClientError::HostVerification {
                message: format!(
                    "SSH 서버 공개키가 앱 신뢰 목록(~/.ssh/known_hosts)에 없습니다. 서버 지문: {}",
                    server_public_key.fingerprint(ssh_key::HashAlg::Sha256)
                ),
            }),
            Err(russh::keys::Error::KeyChanged { .. }) => Err(SshClientError::HostVerification {
                message: format!(
                    "known_hosts에 기록된 SSH 서버 키가 현재 {}:{} 서버와 다릅니다. 앱이 자동 신뢰를 중단했습니다.",
                    self.host, self.port
                ),
            }),
            Err(error) => Err(SshClientError::HostVerification {
                message: format!("known_hosts 확인에 실패했습니다: {error}"),
            }),
        }
    }
}

impl client::Handler for ProbeKnownHostsClient {
    type Error = SshClientError;

    async fn check_server_key(
        &mut self,
        server_public_key: &ssh_key::PublicKey,
    ) -> Result<bool, Self::Error> {
        self.observed_server_key.record(server_public_key).await;

        let trust_state = match check_known_hosts(&self.host, self.port, server_public_key) {
            Ok(true) => SshKnownHostTrustState::Trusted,
            Ok(false) => SshKnownHostTrustState::Missing,
            Err(russh::keys::Error::KeyChanged { .. }) => SshKnownHostTrustState::Changed,
            Err(error) => {
                return Err(SshClientError::HostVerification {
                    message: format!("known_hosts 확인에 실패했습니다: {error}"),
                });
            }
        };
        self.observed_server_key.set_trust_state(trust_state).await;
        Ok(true)
    }
}
