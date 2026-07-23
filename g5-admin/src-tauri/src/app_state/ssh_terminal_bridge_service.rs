use super::ssh_runtime::SshSessionRuntime;
use super::*;
use crate::core::ports::SiteCatalogStorePort;
use g5_admin_models::models::ssh::{
    SshTerminalBridgeConnectInput, SshTerminalBridgeConnectionResponse,
};
use g5_admin_ssh_terminal_bridge::SshTerminalBridgeHost;
use std::sync::Arc;
use tauri::AppHandle;

#[async_trait::async_trait]
pub(super) trait SshTerminalBridgeAccessGate: Send + Sync {
    async fn require_unlocked(&self) -> Result<(), AppError>;
}

pub(crate) struct SshTerminalBridgeService<'a> {
    access_gate: &'a (dyn SshTerminalBridgeAccessGate + Send + Sync),
    site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
    runtime: SshSessionRuntime<'a>,
    host: Arc<SshTerminalBridgeHost>,
    app_handle: Option<AppHandle>,
}

impl<'a> SshTerminalBridgeService<'a> {
    pub(super) fn new(
        access_gate: &'a (dyn SshTerminalBridgeAccessGate + Send + Sync),
        site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
        runtime: SshSessionRuntime<'a>,
        host: Arc<SshTerminalBridgeHost>,
        app_handle: Option<AppHandle>,
    ) -> Self {
        Self {
            access_gate,
            site_catalog_store,
            runtime,
            host,
            app_handle,
        }
    }

    pub(crate) async fn connect(
        &self,
        request_id: &str,
        input: SshTerminalBridgeConnectInput,
    ) -> Result<SshTerminalBridgeConnectionResponse, AppError> {
        self.access_gate.require_unlocked().await?;
        self.ensure_site_exists(&input.site_id)?;

        let active = self
            .runtime
            .connection(&input.site_id)
            .await
            .ok_or_else(|| AppError::Config {
                message:
                    "현재 사이트에 활성 SSH 연결이 없습니다. 먼저 SSH 프로필을 연결해 주십시오."
                        .to_string(),
            })?;
        if active.shell.read().await.is_none() {
            return Err(AppError::Config {
                message: "SSH 셸이 아직 열려 있지 않습니다. 먼저 셸을 열어 주십시오.".to_string(),
            });
        }

        let app_handle = self.app_handle.clone().ok_or_else(|| AppError::Config {
            message: "앱 핸들을 찾지 못해 SSH 터미널 브리지를 시작할 수 없습니다.".to_string(),
        })?;
        let provider = Arc::new(
            super::ssh_terminal_bridge::AppStateTerminalBridgeSessionProvider::new(app_handle),
        );
        let (port, token) = self.host.issue_ticket(provider, &input.site_id).await?;
        let trace = ResponseTrace::local(request_id.to_string());
        Ok(SshTerminalBridgeConnectionResponse {
            site_id: input.site_id,
            websocket_url: format!("ws://127.0.0.1:{port}"),
            token,
            request_id: trace.request_id,
            correlation_id: trace.correlation_id,
            server_request_id: trace.server_request_id,
        })
    }

    fn ensure_site_exists(&self, site_id: &str) -> Result<(), AppError> {
        let exists = self
            .site_catalog_store
            .load_sites()?
            .into_iter()
            .any(|site| site.id == site_id);
        if exists {
            return Ok(());
        }

        Err(AppError::Config {
            message: format!("등록되지 않은 사이트입니다: {site_id}"),
        })
    }
}
