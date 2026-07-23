use super::shared::security_command_error;
use crate::app_state::AppState;
use crate::error::{AppError, CommandResult};
use crate::fast_unlock as fast_unlock_backend;
use crate::request_id::next_request_id;
use g5_admin_models::models::security::{FastUnlockStatus, SecurityStepUpAuthInput};
use g5_admin_models::models::trace::ResponseTrace;
use tauri::{AppHandle, Runtime, State};

#[tauri::command]
pub async fn cmd_security_fast_unlock_status<R: Runtime>(
    state: State<'_, AppState>,
    app: AppHandle<R>,
) -> CommandResult<FastUnlockStatus> {
    let request_id = next_request_id();
    build_fast_unlock_status(state.inner(), &app, &request_id)
        .await
        .map_err(|error| {
            security_command_error(
                "cmd_security_fast_unlock_status",
                "local-security-fast-unlock",
                &request_id,
                error,
            )
        })
}

#[tauri::command]
pub async fn cmd_security_enable_fast_unlock<R: Runtime>(
    state: State<'_, AppState>,
    app: AppHandle<R>,
    input: SecurityStepUpAuthInput,
) -> CommandResult<FastUnlockStatus> {
    let request_id = next_request_id();
    let capability = fast_unlock_backend::detect_capability(&app);
    if !capability.available {
        return Err(security_command_error(
            "cmd_security_enable_fast_unlock",
            "local-security-fast-unlock",
            &request_id,
            AppError::Config {
                message: capability.error.unwrap_or_else(|| {
                    "이 기기에서는 빠른 잠금 해제를 사용할 수 없습니다.".to_string()
                }),
            },
        ));
    }

    let secret = g5_admin_security_core::generate_fast_unlock_secret().map_err(|error| {
        security_command_error(
            "cmd_security_enable_fast_unlock",
            "local-security-fast-unlock",
            &request_id,
            AppError::from(error),
        )
    })?;
    fast_unlock_backend::store_secret(&app, &secret).map_err(|error| {
        security_command_error(
            "cmd_security_enable_fast_unlock",
            "local-security-fast-unlock",
            &request_id,
            error,
        )
    })?;

    if let Err(error) = state
        .security_settings_service()
        .enable_fast_unlock(
            &input.current_password,
            input.current_totp_code.as_deref(),
            &secret,
        )
        .await
    {
        let _ = fast_unlock_backend::remove_secret(&app);
        return Err(security_command_error(
            "cmd_security_enable_fast_unlock",
            "local-security-fast-unlock",
            &request_id,
            error,
        ));
    }

    build_fast_unlock_status(state.inner(), &app, &request_id)
        .await
        .map_err(|error| {
            security_command_error(
                "cmd_security_enable_fast_unlock",
                "local-security-fast-unlock",
                &request_id,
                error,
            )
        })
}

#[tauri::command]
pub async fn cmd_security_disable_fast_unlock<R: Runtime>(
    state: State<'_, AppState>,
    app: AppHandle<R>,
    input: SecurityStepUpAuthInput,
) -> CommandResult<FastUnlockStatus> {
    let request_id = next_request_id();
    state
        .security_settings_service()
        .disable_fast_unlock(&input.current_password, input.current_totp_code.as_deref())
        .await
        .map_err(|error| {
            security_command_error(
                "cmd_security_disable_fast_unlock",
                "local-security-fast-unlock",
                &request_id,
                error,
            )
        })?;

    if let Err(error) = fast_unlock_backend::remove_secret(&app) {
        tracing::warn!(
            operation = "cmd_security_disable_fast_unlock",
            request_id = %request_id,
            error = %error,
            "failed to remove fast unlock secret from biometric storage after local disable"
        );
    }

    build_fast_unlock_status(state.inner(), &app, &request_id)
        .await
        .map_err(|error| {
            security_command_error(
                "cmd_security_disable_fast_unlock",
                "local-security-fast-unlock",
                &request_id,
                error,
            )
        })
}

async fn build_fast_unlock_status<R: Runtime>(
    state: &AppState,
    app: &AppHandle<R>,
    request_id: &str,
) -> Result<FastUnlockStatus, AppError> {
    let trace = ResponseTrace::local(request_id.to_string());
    let capability = fast_unlock_backend::detect_capability(app);
    let local_enabled = state
        .security_settings_service()
        .fast_unlock_enabled()
        .await?;
    // Startup status checks should not touch the OS biometric secret store.
    // On macOS that extra lookup can trigger a second Keychain prompt before the
    // user explicitly chooses fast unlock. Missing secure-store data is handled
    // on actual unlock attempts instead.
    let enabled = local_enabled && capability.available;

    Ok(FastUnlockStatus::from_parts(
        trace,
        capability.available,
        enabled,
        capability.label,
        capability.error,
    ))
}
