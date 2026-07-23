use crate::error::SshClientError;
use crate::types::SshShellReadOutput;
use russh::client;
use russh::{ChannelMsg, ChannelReadHalf, ChannelWriteHalf};
use std::sync::Arc;
use tokio::io::AsyncWriteExt;
use tokio::sync::{mpsc, Mutex, Notify, RwLock};
use tokio::task::JoinHandle;
use tokio::time::{timeout, Duration};

const SHELL_READ_WAIT_MS: u64 = 150;
const SHELL_WRITE_QUEUE_CAPACITY: usize = 256;
const SHELL_WRITE_BATCH_BYTES: usize = 16_384;
const SHELL_HISTORY_MAX_CHARS: usize = 200_000;

enum ShellWriterCommand {
    Write(String),
    Resize { cols: u32, rows: u32 },
}

#[derive(Default)]
struct SshShellBuffer {
    history: String,
    stdout: String,
    stderr: String,
    closed: bool,
    exit_status: Option<u32>,
    exit_signal: Option<String>,
}

impl SshShellBuffer {
    fn has_pending_output(&self) -> bool {
        !self.stdout.is_empty()
            || !self.stderr.is_empty()
            || self.closed
            || self.exit_status.is_some()
            || self.exit_signal.is_some()
    }
}

pub struct SshShell {
    notify: Arc<Notify>,
    reader_task: Mutex<Option<JoinHandle<()>>>,
    writer_queue: Mutex<Option<mpsc::Sender<ShellWriterCommand>>>,
    writer_task: Mutex<Option<JoinHandle<()>>>,
    state: Arc<RwLock<SshShellBuffer>>,
}

impl SshShell {
    pub(crate) fn spawn(reader: ChannelReadHalf, writer: ChannelWriteHalf<client::Msg>) -> Self {
        let notify = Arc::new(Notify::new());
        let state = Arc::new(RwLock::new(SshShellBuffer::default()));
        let reader_task_state = Arc::clone(&state);
        let reader_task_notify = Arc::clone(&notify);
        let writer_task_state = Arc::clone(&state);
        let writer_task_notify = Arc::clone(&notify);
        let (writer_tx, writer_rx) = mpsc::channel(SHELL_WRITE_QUEUE_CAPACITY);
        let reader_task = tokio::spawn(async move {
            run_shell_reader(reader, reader_task_state, reader_task_notify).await;
        });
        let writer_task = tokio::spawn(async move {
            run_shell_writer(writer, writer_rx, writer_task_state, writer_task_notify).await;
        });

        Self {
            notify,
            reader_task: Mutex::new(Some(reader_task)),
            writer_queue: Mutex::new(Some(writer_tx)),
            writer_task: Mutex::new(Some(writer_task)),
            state,
        }
    }

    pub async fn write(&self, data: &str) -> Result<(), SshClientError> {
        let writer_queue = self.writer_queue.lock().await;
        let writer_queue = writer_queue
            .as_ref()
            .ok_or_else(|| SshClientError::Config {
                message: "SSH 셸이 이미 종료되었습니다. 다시 열어 주십시오.".to_string(),
            })?;
        writer_queue
            .send(ShellWriterCommand::Write(data.to_string()))
            .await
            .map_err(|_| SshClientError::Config {
                message: "SSH 셸 입력 큐가 종료되었습니다. 다시 셸을 열어 주십시오.".to_string(),
            })?;
        Ok(())
    }

    pub async fn read(&self) -> Result<SshShellReadOutput, SshClientError> {
        let notified = self.notify.notified();
        {
            let state = self.state.read().await;
            if state.has_pending_output() {
                drop(state);
                return self.take_output().await;
            }
        }

        let _ = timeout(Duration::from_millis(SHELL_READ_WAIT_MS), notified).await;
        self.take_output().await
    }

    pub async fn read_blocking(&self) -> Result<SshShellReadOutput, SshClientError> {
        let notified = self.notify.notified();
        {
            let state = self.state.read().await;
            if state.has_pending_output() {
                drop(state);
                return self.take_output().await;
            }
        }

        notified.await;
        self.take_output().await
    }

    async fn take_output(&self) -> Result<SshShellReadOutput, SshClientError> {
        let mut state = self.state.write().await;
        Ok(SshShellReadOutput {
            stdout: std::mem::take(&mut state.stdout),
            stderr: std::mem::take(&mut state.stderr),
            closed: state.closed,
            exit_status: state.exit_status,
            exit_signal: state.exit_signal.clone(),
        })
    }

    pub async fn resize(&self, cols: u32, rows: u32) -> Result<(), SshClientError> {
        let writer_queue = self.writer_queue.lock().await;
        let writer_queue = writer_queue
            .as_ref()
            .ok_or_else(|| SshClientError::Config {
                message: "SSH 셸이 이미 종료되었습니다. 다시 열어 주십시오.".to_string(),
            })?;
        writer_queue
            .send(ShellWriterCommand::Resize { cols, rows })
            .await
            .map_err(|_| SshClientError::Config {
                message: "SSH 셸 resize 큐가 종료되었습니다. 다시 셸을 열어 주십시오.".to_string(),
            })?;
        Ok(())
    }

    pub async fn snapshot(&self) -> Result<String, SshClientError> {
        Ok(self.state.read().await.history.clone())
    }

    pub async fn close(&self) -> Result<(), SshClientError> {
        self.writer_queue.lock().await.take();

        if let Some(reader_task) = self.reader_task.lock().await.take() {
            reader_task.abort();
        }
        if let Some(writer_task) = self.writer_task.lock().await.take() {
            writer_task.abort();
        }

        self.state.write().await.closed = true;
        self.notify.notify_waiters();
        Ok(())
    }
}

async fn run_shell_reader(
    mut reader: ChannelReadHalf,
    state: Arc<RwLock<SshShellBuffer>>,
    notify: Arc<Notify>,
) {
    loop {
        let Some(message) = reader.wait().await else {
            state.write().await.closed = true;
            notify.notify_waiters();
            break;
        };

        match message {
            ChannelMsg::Data { data } => {
                let stdout = String::from_utf8_lossy(data.as_ref()).into_owned();
                let mut state = state.write().await;
                state.stdout.push_str(&stdout);
                push_history_chunk(&mut state.history, &stdout);
                notify.notify_waiters();
            }
            ChannelMsg::ExtendedData { data, .. } => {
                let stderr = String::from_utf8_lossy(data.as_ref()).into_owned();
                let mut state = state.write().await;
                state.stderr.push_str(&stderr);
                push_history_chunk(&mut state.history, "[stderr]\n");
                push_history_chunk(&mut state.history, &stderr);
                notify.notify_waiters();
            }
            ChannelMsg::ExitStatus { exit_status } => {
                let mut state = state.write().await;
                state.exit_status = Some(exit_status);
                notify.notify_waiters();
            }
            ChannelMsg::ExitSignal { signal_name, .. } => {
                let mut state = state.write().await;
                state.exit_signal = Some(format!("{signal_name:?}"));
                state.closed = true;
                notify.notify_waiters();
            }
            ChannelMsg::Eof | ChannelMsg::Close => {
                state.write().await.closed = true;
                notify.notify_waiters();
            }
            _ => {}
        }
    }
}

fn push_history_chunk(history: &mut String, chunk: &str) {
    if chunk.is_empty() {
        return;
    }

    history.push_str(chunk);
    if history.len() <= SHELL_HISTORY_MAX_CHARS {
        return;
    }

    let overflow = history.len() - SHELL_HISTORY_MAX_CHARS;
    let trim_index = history
        .char_indices()
        .find_map(|(index, _)| (index >= overflow).then_some(index))
        .unwrap_or(history.len());
    history.drain(..trim_index);
}

async fn run_shell_writer(
    writer: ChannelWriteHalf<client::Msg>,
    mut receiver: mpsc::Receiver<ShellWriterCommand>,
    state: Arc<RwLock<SshShellBuffer>>,
    notify: Arc<Notify>,
) {
    let mut writer = Some(writer);
    while let Some(command) = receiver.recv().await {
        let Some(active_writer) = writer.as_ref() else {
            break;
        };
        let mut writer_failed = false;

        match command {
            ShellWriterCommand::Write(chunk) => {
                let mut batch = chunk;
                while batch.len() < SHELL_WRITE_BATCH_BYTES {
                    match receiver.try_recv() {
                        Ok(ShellWriterCommand::Write(next_chunk)) => batch.push_str(&next_chunk),
                        Ok(ShellWriterCommand::Resize { cols, rows }) => {
                            if active_writer.window_change(cols, rows, 0, 0).await.is_err() {
                                writer_failed = true;
                                break;
                            }
                        }
                        Err(_) => break,
                    }
                }

                if writer_failed {
                    let mut state = state.write().await;
                    state.closed = true;
                    notify.notify_waiters();
                    writer = None;
                    break;
                }

                let mut stream = active_writer.make_writer();
                if stream.write_all(batch.as_bytes()).await.is_err()
                    || stream.flush().await.is_err()
                {
                    writer_failed = true;
                }
            }
            ShellWriterCommand::Resize { cols, rows } => {
                if active_writer.window_change(cols, rows, 0, 0).await.is_err() {
                    writer_failed = true;
                }
            }
        }

        if writer_failed {
            let mut state = state.write().await;
            state.closed = true;
            notify.notify_waiters();
            writer = None;
            break;
        }
    }

    if let Some(active_writer) = writer.take() {
        let _ = active_writer.eof().await;
        let _ = active_writer.close().await;
    }
}
