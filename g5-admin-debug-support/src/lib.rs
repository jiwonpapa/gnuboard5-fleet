use std::fs::{self, File};
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use thiserror::Error;
use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;

#[cfg(test)]
mod tests;

const LOG_DIR_ENV_KEY: &str = "G5_LOG_DIR";
const LOG_FILE_NAME: &str = "g5-admin.log";
const MAX_TAIL_BYTES: u64 = 128 * 1024;

static LOG_FILE_PATH: OnceLock<PathBuf> = OnceLock::new();
static LOG_GUARD: OnceLock<WorkerGuard> = OnceLock::new();

#[derive(Debug, Error)]
pub enum DebugSupportError {
    #[error("{message}")]
    Config { message: String },
}

pub fn init_tracing() {
    let env_filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info,g5_admin_lib=debug"));
    let log_file_path = prepare_log_file_path();
    let log_directory = log_file_path
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| PathBuf::from("."));

    if let Err(error) = fs::create_dir_all(&log_directory) {
        eprintln!(
            "failed to create log directory at {}: {error}",
            log_directory.display()
        );
    }

    let file_appender = tracing_appender::rolling::never(&log_directory, LOG_FILE_NAME);
    let (non_blocking, guard) = tracing_appender::non_blocking(file_appender);
    let _ = LOG_GUARD.set(guard);
    let _ = LOG_FILE_PATH.set(log_file_path);

    #[cfg(debug_assertions)]
    let file_layer = tracing_subscriber::fmt::layer()
        .with_ansi(false)
        .with_target(false)
        .with_file(true)
        .with_line_number(true)
        .with_writer(non_blocking);

    #[cfg(not(debug_assertions))]
    let file_layer = tracing_subscriber::fmt::layer()
        .json()
        .with_ansi(false)
        .with_current_span(true)
        .with_target(false)
        .with_writer(non_blocking);

    #[cfg(debug_assertions)]
    let stdout_layer = tracing_subscriber::fmt::layer().with_target(false);

    #[cfg(not(debug_assertions))]
    let stdout_layer = tracing_subscriber::fmt::layer()
        .json()
        .with_current_span(true)
        .with_target(false);

    let _ = tracing_subscriber::registry()
        .with(env_filter)
        .with(file_layer)
        .with(stdout_layer)
        .try_init();
}

pub fn log_file_path() -> PathBuf {
    LOG_FILE_PATH
        .get()
        .cloned()
        .unwrap_or_else(prepare_log_file_path)
}

pub fn tail_log_lines(limit: usize) -> Result<Vec<String>, DebugSupportError> {
    let limit = limit.clamp(1, 400);
    let path = log_file_path();
    let tail = read_tail(&path)?;
    let lines = tail
        .lines()
        .rev()
        .take(limit)
        .map(ToOwned::to_owned)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect();
    Ok(lines)
}

fn prepare_log_file_path() -> PathBuf {
    resolve_log_dir().join(LOG_FILE_NAME)
}

fn resolve_log_dir() -> PathBuf {
    if let Ok(raw_dir) = std::env::var(LOG_DIR_ENV_KEY) {
        let trimmed = raw_dir.trim();
        if !trimmed.is_empty() {
            return PathBuf::from(trimmed);
        }
    }

    if let Some(local_dir) = dirs::data_local_dir() {
        return local_dir.join("g5-admin").join("logs");
    }

    std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join(".g5-admin")
        .join("logs")
}

fn read_tail(path: &Path) -> Result<String, DebugSupportError> {
    let mut file = File::open(path).map_err(|error| DebugSupportError::Config {
        message: format!("failed to open debug log at {}: {error}", path.display()),
    })?;
    let file_size = file
        .metadata()
        .map_err(|error| DebugSupportError::Config {
            message: format!("failed to stat debug log at {}: {error}", path.display()),
        })?
        .len();
    let start_offset = file_size.saturating_sub(MAX_TAIL_BYTES);
    file.seek(SeekFrom::Start(start_offset))
        .map_err(|error| DebugSupportError::Config {
            message: format!("failed to seek debug log at {}: {error}", path.display()),
        })?;

    let mut tail = String::new();
    file.read_to_string(&mut tail)
        .map_err(|error| DebugSupportError::Config {
            message: format!("failed to read debug log at {}: {error}", path.display()),
        })?;

    if start_offset > 0 {
        if let Some((_, trimmed)) = tail.split_once('\n') {
            return Ok(trimmed.to_string());
        }
    }

    Ok(tail)
}
