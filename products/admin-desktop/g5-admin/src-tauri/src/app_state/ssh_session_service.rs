use super::ssh_runtime::{ActiveSshSession, SshSessionRuntime};
use super::*;
use crate::core::ports::{SiteCatalogStorePort, SshProfileStorePort, SshSessionConnectorPort};
use crate::core::ssh_auth::port_to_model_auth_type;
use g5_admin_models::models::ssh::{
    SshConnectInput, SshDisconnectInput, SshSessionProfileSummary, SshSessionStatusResponse,
    SshShellCloseInput, SshShellOpenInput, SshShellReadInput, SshShellReadResponse,
    SshShellResizeInput, SshShellWriteInput,
};
use g5_admin_ssh_terminal_bridge::TerminalBridgeShellStreamEvent;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};
use tokio::sync::RwLock;
use tokio::task::JoinHandle;

const SSH_SHELL_STREAM_EVENT_NAME: &str = "g5:ssh-shell-output";

#[async_trait::async_trait]
pub(super) trait SshSessionAccessGate: Send + Sync {
    async fn require_unlocked(&self) -> Result<(), AppError>;
}

pub(crate) struct SshSessionService<'a> {
    access_gate: &'a (dyn SshSessionAccessGate + Send + Sync),
    site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
    ssh_connector: &'a (dyn SshSessionConnectorPort + Send + Sync),
    ssh_profile_store: &'a (dyn SshProfileStorePort + Send + Sync),
    app_handle: Option<AppHandle>,
    runtime: SshSessionRuntime<'a>,
}

impl<'a> SshSessionService<'a> {
    pub(super) fn new(
        access_gate: &'a (dyn SshSessionAccessGate + Send + Sync),
        site_catalog_store: &'a (dyn SiteCatalogStorePort + Send + Sync),
        ssh_profile_store: &'a (dyn SshProfileStorePort + Send + Sync),
        ssh_connector: &'a (dyn SshSessionConnectorPort + Send + Sync),
        app_handle: Option<AppHandle>,
        runtime: SshSessionRuntime<'a>,
    ) -> Self {
        Self {
            access_gate,
            site_catalog_store,
            ssh_connector,
            ssh_profile_store,
            app_handle,
            runtime,
        }
    }

    pub(crate) async fn status(
        &self,
        request_id: &str,
        site_id: &str,
    ) -> Result<SshSessionStatusResponse, AppError> {
        self.access_gate.require_unlocked().await?;
        self.ensure_site_exists(site_id)?;
        self.runtime.get_status(request_id, site_id).await
    }

    pub(crate) async fn connect(
        &self,
        request_id: &str,
        input: SshConnectInput,
    ) -> Result<SshSessionStatusResponse, AppError> {
        self.access_gate.require_unlocked().await?;
        self.ensure_site_exists(&input.site_id)?;
        if let Some(active_profile_id) = self.runtime.active_profile_id(&input.site_id).await {
            if active_profile_id == input.ssh_profile_id {
                return self.runtime.get_status(request_id, &input.site_id).await;
            }

            return Err(AppError::Config {
                message:
                    "현재 사이트에는 이미 활성 SSH 연결이 있습니다. 먼저 연결을 해제해 주십시오."
                        .to_string(),
            });
        }

        let target = self
            .ssh_profile_store
            .load_ssh_profile_connection_target(&input.site_id, &input.ssh_profile_id)?;
        let profile = target.profile.clone();
        let connection = self.ssh_connector.connect(target).await?;
        self.runtime
            .insert(
                &input.site_id,
                ActiveSshSession {
                    active_profile: SshSessionProfileSummary {
                        ssh_profile_id: profile.id.clone(),
                        name: profile.name.clone(),
                        host: profile.host.clone(),
                        port: profile.port,
                        username: profile.username.clone(),
                        auth_type: port_to_model_auth_type(profile.auth_type),
                    },
                    connected_at: current_session_timestamp(),
                    connection: connection.connection,
                    shell: Arc::new(RwLock::new(None)),
                    shell_subscribers: Arc::new(RwLock::new(Vec::new())),
                    shell_stream_task: Arc::new(RwLock::new(None)),
                    sftp: Arc::new(RwLock::new(None)),
                    server_key_algorithm: connection.server_key_algorithm,
                    server_key_fingerprint: connection.server_key_fingerprint,
                },
            )
            .await?;
        self.site_catalog_store.add_activity(
            Some(&input.site_id),
            "site.ssh.connect",
            Some(&format!("connected SSH profile {}", profile.name)),
        )?;

        self.runtime.get_status(request_id, &input.site_id).await
    }

    pub(crate) async fn disconnect(
        &self,
        request_id: &str,
        input: SshDisconnectInput,
    ) -> Result<SshSessionStatusResponse, AppError> {
        self.access_gate.require_unlocked().await?;
        self.ensure_site_exists(&input.site_id)?;

        if let Some(active) = self.runtime.remove(&input.site_id).await {
            let profile_name = active.active_profile.name.clone();
            abort_shell_stream_task(&active.shell_stream_task).await;
            if let Some(shell) = active.shell.write().await.take() {
                shell.close().await?;
            }
            if let Some(sftp) = active.sftp.write().await.take() {
                sftp.close().await?;
            }
            active.connection.disconnect().await?;
            self.site_catalog_store.add_activity(
                Some(&input.site_id),
                "site.ssh.disconnect",
                Some(&format!("disconnected SSH profile {}", profile_name)),
            )?;
        }

        self.runtime.get_status(request_id, &input.site_id).await
    }

    pub(crate) async fn open_shell(
        &self,
        request_id: &str,
        input: SshShellOpenInput,
    ) -> Result<SshSessionStatusResponse, AppError> {
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
        if active.shell.read().await.is_some() {
            return self.runtime.get_status(request_id, &input.site_id).await;
        }

        let shell = active.connection.open_shell().await?;
        abort_shell_stream_task(&active.shell_stream_task).await;
        *active.shell.write().await = Some(shell);
        let shell = active
            .shell
            .read()
            .await
            .clone()
            .ok_or_else(|| AppError::Config {
                message: "SSH 셸이 열렸지만 세션 상태를 기록하지 못했습니다.".to_string(),
            })?;
        let shell_stream_task = spawn_shell_stream_task(
            self.app_handle.clone(),
            input.site_id.clone(),
            shell.clone(),
            active.shell.clone(),
            active.shell_subscribers.clone(),
            active.shell_stream_task.clone(),
        );
        *active.shell_stream_task.write().await = Some(shell_stream_task);
        self.site_catalog_store.add_activity(
            Some(&input.site_id),
            "site.ssh.shell.open",
            Some("opened interactive SSH shell"),
        )?;

        self.runtime.get_status(request_id, &input.site_id).await
    }

    pub(crate) async fn write_shell(&self, input: SshShellWriteInput) -> Result<(), AppError> {
        self.access_gate.require_unlocked().await?;
        self.ensure_site_exists(&input.site_id)?;

        if input.data.is_empty() {
            return Err(AppError::Config {
                message: "셸에 전송할 입력을 적어 주십시오.".to_string(),
            });
        }

        let active = self
            .runtime
            .connection(&input.site_id)
            .await
            .ok_or_else(|| AppError::Config {
                message:
                    "현재 사이트에 활성 SSH 연결이 없습니다. 먼저 SSH 프로필을 연결해 주십시오."
                        .to_string(),
            })?;
        let shell = active
            .shell
            .read()
            .await
            .clone()
            .ok_or_else(|| AppError::Config {
                message: "SSH 셸이 아직 열려 있지 않습니다. 먼저 셸을 열어 주십시오.".to_string(),
            })?;
        shell.write(&input.data).await?;
        Ok(())
    }

    pub(crate) async fn read_shell(
        &self,
        request_id: &str,
        input: SshShellReadInput,
    ) -> Result<SshShellReadResponse, AppError> {
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
        let shell = active
            .shell
            .read()
            .await
            .clone()
            .ok_or_else(|| AppError::Config {
                message: "SSH 셸이 아직 열려 있지 않습니다. 먼저 셸을 열어 주십시오.".to_string(),
            })?;
        let output = shell.read().await?;
        if output.closed {
            *active.shell.write().await = None;
            abort_shell_stream_task(&active.shell_stream_task).await;
        }

        let trace = ResponseTrace::local(request_id.to_string());
        Ok(SshShellReadResponse {
            site_id: input.site_id,
            stdout: output.stdout,
            stderr: output.stderr,
            closed: output.closed,
            exit_status: output.exit_status,
            exit_signal: output.exit_signal,
            request_id: trace.request_id,
            correlation_id: trace.correlation_id,
            server_request_id: trace.server_request_id,
        })
    }

    pub(crate) async fn close_shell(
        &self,
        request_id: &str,
        input: SshShellCloseInput,
    ) -> Result<SshSessionStatusResponse, AppError> {
        self.access_gate.require_unlocked().await?;
        self.ensure_site_exists(&input.site_id)?;

        if let Some(active) = self.runtime.connection(&input.site_id).await {
            abort_shell_stream_task(&active.shell_stream_task).await;
            if let Some(shell) = active.shell.write().await.take() {
                shell.close().await?;
                self.site_catalog_store.add_activity(
                    Some(&input.site_id),
                    "site.ssh.shell.close",
                    Some("closed interactive SSH shell"),
                )?;
            }
        }

        self.runtime.get_status(request_id, &input.site_id).await
    }

    pub(crate) async fn resize_shell(&self, input: SshShellResizeInput) -> Result<(), AppError> {
        self.access_gate.require_unlocked().await?;
        self.ensure_site_exists(&input.site_id)?;

        if input.cols == 0 || input.rows == 0 {
            return Err(AppError::Config {
                message: "SSH 셸 크기는 1칸 이상이어야 합니다.".to_string(),
            });
        }

        let active = self
            .runtime
            .connection(&input.site_id)
            .await
            .ok_or_else(|| AppError::Config {
                message:
                    "현재 사이트에 활성 SSH 연결이 없습니다. 먼저 SSH 프로필을 연결해 주십시오."
                        .to_string(),
            })?;
        let shell = active
            .shell
            .read()
            .await
            .clone()
            .ok_or_else(|| AppError::Config {
                message: "SSH 셸이 아직 열려 있지 않습니다. 먼저 셸을 열어 주십시오.".to_string(),
            })?;
        shell.resize(input.cols, input.rows).await?;
        Ok(())
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

fn current_session_timestamp() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        .to_string()
}

async fn abort_shell_stream_task(task_slot: &Arc<RwLock<Option<JoinHandle<()>>>>) {
    if let Some(task) = task_slot.write().await.take() {
        task.abort();
    }
}

fn spawn_shell_stream_task(
    app_handle: Option<AppHandle>,
    site_id: String,
    shell: Arc<dyn crate::core::ports::SshShellPort + Send + Sync>,
    shell_slot: Arc<RwLock<Option<Arc<dyn crate::core::ports::SshShellPort + Send + Sync>>>>,
    subscribers: Arc<
        RwLock<Vec<tokio::sync::mpsc::UnboundedSender<TerminalBridgeShellStreamEvent>>>,
    >,
    task_slot: Arc<RwLock<Option<JoinHandle<()>>>>,
) -> JoinHandle<()> {
    tokio::spawn(async move {
        loop {
            let output = match shell.read_blocking().await {
                Ok(output) => output,
                Err(_) => {
                    *shell_slot.write().await = None;
                    break;
                }
            };

            if has_shell_stream_payload(&output) {
                let event = TerminalBridgeShellStreamEvent {
                    site_id: site_id.clone(),
                    stdout: output.stdout.clone(),
                    stderr: output.stderr.clone(),
                    closed: output.closed,
                    exit_status: output.exit_status,
                    exit_signal: output.exit_signal.clone(),
                };
                let has_bridge_subscribers = {
                    let mut subscribers = subscribers.write().await;
                    subscribers.retain(|subscriber| subscriber.send(event.clone()).is_ok());
                    !subscribers.is_empty()
                };
                if !has_bridge_subscribers {
                    if let Some(handle) = &app_handle {
                        let _ = handle.emit(SSH_SHELL_STREAM_EVENT_NAME, event);
                    }
                }
            }

            if output.closed {
                *shell_slot.write().await = None;
                break;
            }
        }

        *task_slot.write().await = None;
    })
}

fn has_shell_stream_payload(output: &crate::core::ports::SshShellReadResult) -> bool {
    !output.stdout.is_empty()
        || !output.stderr.is_empty()
        || output.closed
        || output.exit_status.is_some()
        || output.exit_signal.is_some()
}
