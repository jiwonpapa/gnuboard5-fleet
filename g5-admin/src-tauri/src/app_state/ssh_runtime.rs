use crate::core::ports::{SftpSessionPort, SshConnectionPort, SshShellPort};
use crate::error::AppError;
use g5_admin_models::models::ssh::{SshSessionProfileSummary, SshSessionStatusResponse};
use g5_admin_models::models::trace::ResponseTrace;
use g5_admin_ssh_terminal_bridge::TerminalBridgeShellStreamEvent;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::sync::RwLock;
use tokio::task::JoinHandle;

pub(super) struct ActiveSshSession {
    pub active_profile: SshSessionProfileSummary,
    pub connected_at: String,
    pub connection: Arc<dyn SshConnectionPort + Send + Sync>,
    pub shell: Arc<RwLock<Option<Arc<dyn SshShellPort + Send + Sync>>>>,
    pub shell_subscribers: Arc<RwLock<Vec<mpsc::UnboundedSender<TerminalBridgeShellStreamEvent>>>>,
    pub shell_stream_task: Arc<RwLock<Option<JoinHandle<()>>>>,
    pub sftp: Arc<RwLock<Option<Arc<dyn SftpSessionPort + Send + Sync>>>>,
    pub server_key_algorithm: String,
    pub server_key_fingerprint: String,
}

pub(super) struct ActiveSshSessionHandle {
    pub connection: Arc<dyn SshConnectionPort + Send + Sync>,
    pub shell: Arc<RwLock<Option<Arc<dyn SshShellPort + Send + Sync>>>>,
    pub shell_subscribers: Arc<RwLock<Vec<mpsc::UnboundedSender<TerminalBridgeShellStreamEvent>>>>,
    pub shell_stream_task: Arc<RwLock<Option<JoinHandle<()>>>>,
    pub sftp: Arc<RwLock<Option<Arc<dyn SftpSessionPort + Send + Sync>>>>,
}

#[derive(Clone, Copy)]
pub(super) struct SshSessionRuntime<'a> {
    sessions: &'a RwLock<HashMap<String, ActiveSshSession>>,
}

impl<'a> SshSessionRuntime<'a> {
    pub(super) fn new(sessions: &'a RwLock<HashMap<String, ActiveSshSession>>) -> Self {
        Self { sessions }
    }

    pub(super) async fn get_status(
        &self,
        request_id: &str,
        site_id: &str,
    ) -> Result<SshSessionStatusResponse, AppError> {
        let trace = ResponseTrace::local(request_id.to_string());
        let current = {
            let sessions = self.sessions.read().await;
            sessions.get(site_id).map(|entry| {
                (
                    entry.active_profile.clone(),
                    entry.connected_at.clone(),
                    entry.server_key_algorithm.clone(),
                    entry.server_key_fingerprint.clone(),
                    entry.shell.clone(),
                )
            })
        };
        let shell_open = if let Some((_, _, _, _, shell)) = &current {
            shell.read().await.is_some()
        } else {
            false
        };

        Ok(SshSessionStatusResponse {
            site_id: site_id.to_string(),
            connected: current.is_some(),
            shell_open,
            active_profile: current.as_ref().map(|entry| entry.0.clone()),
            connected_at: current.as_ref().map(|entry| entry.1.clone()),
            server_key_algorithm: current.as_ref().map(|entry| entry.2.clone()),
            server_key_fingerprint: current.as_ref().map(|entry| entry.3.clone()),
            request_id: trace.request_id,
            correlation_id: trace.correlation_id,
            server_request_id: trace.server_request_id,
        })
    }

    pub(super) async fn active_profile_id(&self, site_id: &str) -> Option<String> {
        self.sessions
            .read()
            .await
            .get(site_id)
            .map(|entry| entry.active_profile.ssh_profile_id.clone())
    }

    pub(super) async fn connection(&self, site_id: &str) -> Option<ActiveSshSessionHandle> {
        self.sessions
            .read()
            .await
            .get(site_id)
            .map(|entry| ActiveSshSessionHandle {
                connection: entry.connection.clone(),
                shell: entry.shell.clone(),
                shell_subscribers: entry.shell_subscribers.clone(),
                shell_stream_task: entry.shell_stream_task.clone(),
                sftp: entry.sftp.clone(),
            })
    }

    pub(super) async fn insert(
        &self,
        site_id: &str,
        session: ActiveSshSession,
    ) -> Result<(), AppError> {
        self.sessions
            .write()
            .await
            .insert(site_id.to_string(), session);
        Ok(())
    }

    pub(super) async fn remove(&self, site_id: &str) -> Option<ActiveSshSession> {
        self.sessions.write().await.remove(site_id)
    }
}
