use crate::error::AppError;
use std::path::PathBuf;

pub fn init_tracing() {
    g5_admin_debug_support::init_tracing();
}

pub fn log_file_path() -> PathBuf {
    g5_admin_debug_support::log_file_path()
}

pub fn tail_log_lines(limit: usize) -> Result<Vec<String>, AppError> {
    g5_admin_debug_support::tail_log_lines(limit).map_err(AppError::from)
}
