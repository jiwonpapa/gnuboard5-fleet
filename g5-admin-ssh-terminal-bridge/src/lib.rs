use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use thiserror::Error;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, Mutex};
use tokio::task::JoinHandle;
use tokio_tungstenite::{accept_async, tungstenite::Message};
use uuid::Uuid;

const BRIDGE_HOST: &str = "127.0.0.1";
const BRIDGE_TOKEN_TTL: Duration = Duration::from_secs(30);

#[derive(Debug, Error)]
pub enum TerminalBridgeError {
    #[error("{message}")]
    Config { message: String },
}

impl TerminalBridgeError {
    pub fn config(message: impl Into<String>) -> Self {
        Self::Config {
            message: message.into(),
        }
    }
}

#[async_trait::async_trait]
pub trait TerminalBridgeShell: Send + Sync {
    async fn snapshot(&self) -> Result<String, TerminalBridgeError>;
    async fn write(&self, data: &str) -> Result<(), TerminalBridgeError>;
    async fn resize(&self, cols: u32, rows: u32) -> Result<(), TerminalBridgeError>;
}

#[derive(Debug, Clone, Serialize)]
pub struct TerminalBridgeShellStreamEvent {
    pub site_id: String,
    pub stdout: String,
    pub stderr: String,
    pub closed: bool,
    pub exit_status: Option<u32>,
    pub exit_signal: Option<String>,
}

pub struct TerminalBridgeSession {
    shell: Arc<dyn TerminalBridgeShell + Send + Sync>,
    events: mpsc::UnboundedReceiver<TerminalBridgeShellStreamEvent>,
}

impl TerminalBridgeSession {
    pub fn new(
        shell: Arc<dyn TerminalBridgeShell + Send + Sync>,
        events: mpsc::UnboundedReceiver<TerminalBridgeShellStreamEvent>,
    ) -> Self {
        Self { shell, events }
    }
}

#[async_trait::async_trait]
pub trait TerminalBridgeSessionProvider: Send + Sync {
    async fn session_for_site(
        &self,
        site_id: &str,
    ) -> Result<TerminalBridgeSession, TerminalBridgeError>;
}

#[derive(Clone)]
struct BridgeTicket {
    expires_at: Instant,
    site_id: String,
}

struct BridgeListenerState {
    port: u16,
    #[allow(dead_code)]
    task: JoinHandle<()>,
}

#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum ClientFrame {
    Auth { token: String },
    Input { data: String },
    Resize { cols: u32, rows: u32 },
}

#[derive(Serialize, Clone)]
#[serde(tag = "type", rename_all = "snake_case")]
enum ServerFrame {
    Ready {
        snapshot: String,
    },
    Output {
        payload: TerminalBridgeShellStreamEvent,
    },
    Error {
        message: String,
    },
}

pub struct SshTerminalBridgeHost {
    listener: Mutex<Option<BridgeListenerState>>,
    tickets: Arc<Mutex<HashMap<String, BridgeTicket>>>,
}

impl SshTerminalBridgeHost {
    pub fn new() -> Self {
        Self {
            listener: Mutex::new(None),
            tickets: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn issue_ticket(
        &self,
        session_provider: Arc<dyn TerminalBridgeSessionProvider + Send + Sync>,
        site_id: &str,
    ) -> Result<(u16, String), TerminalBridgeError> {
        let port = self.ensure_listener(session_provider).await?;
        let token = Uuid::new_v4().simple().to_string();
        let mut tickets = self.tickets.lock().await;
        tickets.retain(|_, ticket| ticket.expires_at > Instant::now());
        tickets.insert(
            token.clone(),
            BridgeTicket {
                expires_at: Instant::now() + BRIDGE_TOKEN_TTL,
                site_id: site_id.to_string(),
            },
        );
        Ok((port, token))
    }

    async fn ensure_listener(
        &self,
        session_provider: Arc<dyn TerminalBridgeSessionProvider + Send + Sync>,
    ) -> Result<u16, TerminalBridgeError> {
        let mut listener = self.listener.lock().await;
        if let Some(current) = listener.as_ref() {
            return Ok(current.port);
        }

        let tcp_listener = TcpListener::bind((BRIDGE_HOST, 0)).await.map_err(|error| {
            TerminalBridgeError::Config {
                message: format!("SSH 터미널 브리지 포트를 열지 못했습니다: {error}"),
            }
        })?;
        let port = tcp_listener
            .local_addr()
            .map_err(|error| TerminalBridgeError::Config {
                message: format!("SSH 터미널 브리지 포트를 확인하지 못했습니다: {error}"),
            })?
            .port();
        let tickets = Arc::clone(&self.tickets);
        let task = tokio::spawn(async move {
            run_accept_loop(tcp_listener, tickets, session_provider).await;
        });
        *listener = Some(BridgeListenerState { port, task });
        Ok(port)
    }
}

impl Default for SshTerminalBridgeHost {
    fn default() -> Self {
        Self::new()
    }
}

async fn run_accept_loop(
    listener: TcpListener,
    tickets: Arc<Mutex<HashMap<String, BridgeTicket>>>,
    session_provider: Arc<dyn TerminalBridgeSessionProvider + Send + Sync>,
) {
    loop {
        let Ok((stream, _)) = listener.accept().await else {
            break;
        };
        let next_tickets = Arc::clone(&tickets);
        let next_session_provider = Arc::clone(&session_provider);
        tokio::spawn(async move {
            let _ = handle_connection(stream, next_tickets, next_session_provider).await;
        });
    }
}

async fn handle_connection(
    stream: TcpStream,
    tickets: Arc<Mutex<HashMap<String, BridgeTicket>>>,
    session_provider: Arc<dyn TerminalBridgeSessionProvider + Send + Sync>,
) -> Result<(), TerminalBridgeError> {
    let mut socket = accept_async(stream)
        .await
        .map_err(|error| TerminalBridgeError::Config {
            message: format!("SSH 터미널 브리지 소켓을 열지 못했습니다: {error}"),
        })?;
    let auth_frame = socket
        .next()
        .await
        .ok_or_else(|| TerminalBridgeError::Config {
            message: "SSH 터미널 브리지 인증 메시지를 받지 못했습니다.".to_string(),
        })?;
    let auth_frame = auth_frame.map_err(|error| TerminalBridgeError::Config {
        message: format!("SSH 터미널 브리지 인증 프레임을 읽지 못했습니다: {error}"),
    })?;
    let token = match decode_client_frame(auth_frame)? {
        ClientFrame::Auth { token } => token,
        _ => {
            send_server_frame(
                &mut socket,
                ServerFrame::Error {
                    message: "SSH 터미널 브리지는 auth 프레임으로 시작해야 합니다.".to_string(),
                },
            )
            .await?;
            return Ok(());
        }
    };

    let site_id =
        consume_ticket(&tickets, &token)
            .await
            .ok_or_else(|| TerminalBridgeError::Config {
                message: "SSH 터미널 브리지 티켓이 만료되었거나 유효하지 않습니다.".to_string(),
            })?;
    let TerminalBridgeSession {
        shell,
        events: mut subscriber_rx,
    } = session_provider.session_for_site(&site_id).await?;
    let snapshot = shell.snapshot().await?;
    send_server_frame(&mut socket, ServerFrame::Ready { snapshot }).await?;

    loop {
        tokio::select! {
            message = socket.next() => {
                let Some(message) = message else {
                    break;
                };
                let message = message.map_err(|error| TerminalBridgeError::Config {
                    message: format!("SSH 터미널 브리지 입력 프레임을 읽지 못했습니다: {error}"),
                })?;
                match decode_client_frame(message)? {
                    ClientFrame::Auth { .. } => {
                        send_server_frame(&mut socket, ServerFrame::Error {
                            message: "SSH 터미널 브리지는 인증을 한 번만 허용합니다.".to_string(),
                        }).await?;
                    }
                    ClientFrame::Input { data } => {
                        write_shell(shell.as_ref(), &data).await?;
                    }
                    ClientFrame::Resize { cols, rows } => {
                        resize_shell(shell.as_ref(), cols, rows).await?;
                    }
                }
            }
            event = subscriber_rx.recv() => {
                let Some(event) = event else {
                    break;
                };
                send_server_frame(&mut socket, ServerFrame::Output { payload: event.clone() }).await?;
                if event.closed {
                    break;
                }
            }
        }
    }

    let _ = socket.close(None).await;
    Ok(())
}

async fn send_server_frame(
    socket: &mut tokio_tungstenite::WebSocketStream<TcpStream>,
    frame: ServerFrame,
) -> Result<(), TerminalBridgeError> {
    let payload = serde_json::to_string(&frame).map_err(|error| TerminalBridgeError::Config {
        message: format!("SSH 터미널 브리지 응답을 직렬화하지 못했습니다: {error}"),
    })?;
    socket
        .send(Message::Text(payload.into()))
        .await
        .map_err(|error| TerminalBridgeError::Config {
            message: format!("SSH 터미널 브리지 응답을 전송하지 못했습니다: {error}"),
        })
}

fn decode_client_frame(message: Message) -> Result<ClientFrame, TerminalBridgeError> {
    let payload: String = match message {
        Message::Text(payload) => payload.to_string(),
        Message::Binary(payload) => {
            String::from_utf8(payload.to_vec()).map_err(|error| TerminalBridgeError::Config {
                message: format!("SSH 터미널 브리지 binary 프레임을 해석하지 못했습니다: {error}"),
            })?
        }
        Message::Close(_) => {
            return Err(TerminalBridgeError::Config {
                message: "SSH 터미널 브리지가 종료되었습니다.".to_string(),
            });
        }
        Message::Ping(_) | Message::Pong(_) => {
            return Err(TerminalBridgeError::Config {
                message: "SSH 터미널 브리지 제어 프레임은 지원하지 않습니다.".to_string(),
            });
        }
        Message::Frame(_) => {
            return Err(TerminalBridgeError::Config {
                message: "SSH 터미널 브리지 frame 메시지는 지원하지 않습니다.".to_string(),
            });
        }
    };

    serde_json::from_str::<ClientFrame>(&payload).map_err(|error| TerminalBridgeError::Config {
        message: format!("SSH 터미널 브리지 요청을 해석하지 못했습니다: {error}"),
    })
}

async fn consume_ticket(
    tickets: &Arc<Mutex<HashMap<String, BridgeTicket>>>,
    token: &str,
) -> Option<String> {
    let mut tickets = tickets.lock().await;
    tickets.retain(|_, ticket| ticket.expires_at > Instant::now());
    tickets.remove(token).map(|ticket| ticket.site_id)
}

async fn write_shell(
    shell: &(dyn TerminalBridgeShell + Send + Sync),
    data: &str,
) -> Result<(), TerminalBridgeError> {
    if data.is_empty() {
        return Ok(());
    }
    shell.write(data).await
}

async fn resize_shell(
    shell: &(dyn TerminalBridgeShell + Send + Sync),
    cols: u32,
    rows: u32,
) -> Result<(), TerminalBridgeError> {
    if cols == 0 || rows == 0 {
        return Ok(());
    }
    shell.resize(cols, rows).await
}
