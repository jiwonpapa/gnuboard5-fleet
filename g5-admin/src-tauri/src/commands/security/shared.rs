use super::SECURITY_COMPONENT;
use crate::commands::common::command_error_payload;
use crate::error::{AppError, AppErrorPayload};

pub(super) fn security_command_error(
    operation: &'static str,
    target: &'static str,
    request_id: &str,
    error: AppError,
) -> AppErrorPayload {
    command_error_payload(SECURITY_COMPONENT, operation, target, request_id, error)
}
