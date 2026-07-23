use crate::client::SshHandle;
use crate::error::SshClientError;
use crate::sftp::SshSftpSession;
use crate::shell::SshShell;
use russh::{Disconnect, Pty};
use tokio::sync::Mutex;

const SHELL_TERM: &str = "xterm-256color";
const SHELL_COL_WIDTH: u32 = 120;
const SHELL_ROW_HEIGHT: u32 = 32;

pub struct SshConnection {
    pub(crate) handle: Mutex<Option<SshHandle>>,
}

impl SshConnection {
    pub(crate) fn new(handle: SshHandle) -> Self {
        Self {
            handle: Mutex::new(Some(handle)),
        }
    }

    pub async fn open_shell(&self) -> Result<SshShell, SshClientError> {
        let handle = self.handle.lock().await;
        let handle = handle.as_ref().ok_or_else(|| SshClientError::Config {
            message: "SSH 연결이 이미 종료되었습니다. 다시 연결해 주십시오.".to_string(),
        })?;

        let channel = handle.channel_open_session().await?;
        channel
            .request_pty(
                true,
                SHELL_TERM,
                SHELL_COL_WIDTH,
                SHELL_ROW_HEIGHT,
                0,
                0,
                &[(Pty::ECHO, 1)],
            )
            .await?;
        channel.request_shell(true).await?;
        let (reader, writer) = channel.split();
        Ok(SshShell::spawn(reader, writer))
    }

    pub async fn open_sftp(&self) -> Result<SshSftpSession, SshClientError> {
        let handle = self.handle.lock().await;
        let handle = handle.as_ref().ok_or_else(|| SshClientError::Config {
            message: "SSH 연결이 이미 종료되었습니다. 다시 연결해 주십시오.".to_string(),
        })?;

        let channel = handle.channel_open_session().await?;
        channel.request_subsystem(true, "sftp").await?;
        let session = russh_sftp::client::SftpSession::new(channel.into_stream()).await?;
        Ok(SshSftpSession::new(session))
    }

    pub async fn disconnect(&self) -> Result<(), SshClientError> {
        if let Some(handle) = self.handle.lock().await.take() {
            handle
                .disconnect(Disconnect::ByApplication, "disconnect", "en")
                .await?;
        }
        Ok(())
    }
}
