use super::ssh_runtime::SshSessionRuntime;
use super::AppState;
use crate::core::ports::SshShellPort;
use g5_admin_ssh_terminal_bridge::{
    TerminalBridgeError, TerminalBridgeSession, TerminalBridgeSessionProvider, TerminalBridgeShell,
};
use std::sync::Arc;
use tauri::{AppHandle, Manager};
use tokio::sync::mpsc;

pub(crate) struct AppStateTerminalBridgeSessionProvider {
    app_handle: AppHandle,
}

impl AppStateTerminalBridgeSessionProvider {
    pub(crate) fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }
}

#[async_trait::async_trait]
impl TerminalBridgeSessionProvider for AppStateTerminalBridgeSessionProvider {
    async fn session_for_site(
        &self,
        site_id: &str,
    ) -> Result<TerminalBridgeSession, TerminalBridgeError> {
        let ssh_sessions = {
            let state = self.app_handle.state::<AppState>();
            state.ssh_sessions.clone()
        };
        let active = SshSessionRuntime::new(&ssh_sessions)
            .connection(site_id)
            .await
            .ok_or_else(|| {
                TerminalBridgeError::config(
                    "활성 SSH 세션이 없어 터미널 브리지를 시작할 수 없습니다.",
                )
            })?;
        let shell = active.shell.read().await.clone().ok_or_else(|| {
            TerminalBridgeError::config("열린 SSH 셸이 없어 터미널 브리지를 시작할 수 없습니다.")
        })?;
        let (subscriber_tx, subscriber_rx) = mpsc::unbounded_channel();
        active.shell_subscribers.write().await.push(subscriber_tx);

        Ok(TerminalBridgeSession::new(
            Arc::new(AppStateTerminalBridgeShell { inner: shell }),
            subscriber_rx,
        ))
    }
}

struct AppStateTerminalBridgeShell {
    inner: Arc<dyn SshShellPort + Send + Sync>,
}

#[async_trait::async_trait]
impl TerminalBridgeShell for AppStateTerminalBridgeShell {
    async fn snapshot(&self) -> Result<String, TerminalBridgeError> {
        self.inner
            .snapshot()
            .await
            .map_err(|error| TerminalBridgeError::config(error.to_string()))
    }

    async fn write(&self, data: &str) -> Result<(), TerminalBridgeError> {
        self.inner
            .write(data)
            .await
            .map_err(|error| TerminalBridgeError::config(error.to_string()))
    }

    async fn resize(&self, cols: u32, rows: u32) -> Result<(), TerminalBridgeError> {
        self.inner
            .resize(cols, rows)
            .await
            .map_err(|error| TerminalBridgeError::config(error.to_string()))
    }
}
