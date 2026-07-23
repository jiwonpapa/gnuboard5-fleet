use crate::app_state::AppState;
use crate::commands::common::command_error_payload;
use crate::debug_support::{log_file_path, tail_log_lines};
use crate::error::{AppError, CommandResult};
use crate::request_id::next_request_id;
use g5_admin_models::models::debug::{
    DebugDevBootstrapResult, DebugDevBootstrapStatus, DebugLogTailResponse, DebugRuntimeInfo,
};
use g5_admin_models::models::trace::ResponseTrace;
use tauri::{AppHandle, Manager, State};

const DEBUG_COMPONENT: &str = "g5_admin::commands::debug";

#[tauri::command]
pub async fn cmd_debug_runtime_info(state: State<'_, AppState>) -> CommandResult<DebugRuntimeInfo> {
    let request_id = next_request_id();
    let trace = ResponseTrace::local(request_id);
    let active_site = state
        .site_catalog_service()
        .active_site()
        .await
        .map_err(|error| {
            command_error_payload(
                DEBUG_COMPONENT,
                "cmd_debug_runtime_info",
                "local-site-db",
                &trace.request_id,
                error,
            )
        })?;
    let api_base_url = state.admin_api().current_base_url().await;

    Ok(DebugRuntimeInfo {
        active_site_id: active_site.as_ref().map(|site| site.id.clone()),
        active_site_name: active_site.as_ref().map(|site| site.name.clone()),
        api_base_url,
        database_path: state.database_path(),
        debug_build: cfg!(debug_assertions),
        debug_overlay: state.runtime_config.debug_overlay,
        session_storage: state.token_store.backend_label().to_string(),
        session_storage_target: state.token_store.backend_target(),
        log_file_path: log_file_path().display().to_string(),
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_debug_dev_bootstrap_status(
    state: State<'_, AppState>,
) -> CommandResult<DebugDevBootstrapStatus> {
    let request_id = next_request_id();
    let trace = ResponseTrace::local(request_id);
    state
        .dev_bootstrap_service()
        .status(&trace.request_id)
        .await
        .map_err(|error| {
            command_error_payload(
                DEBUG_COMPONENT,
                "cmd_debug_dev_bootstrap_status",
                "local://debug/dev-bootstrap-status",
                &trace.request_id,
                error,
            )
        })
}

#[tauri::command]
pub async fn cmd_debug_dev_bootstrap_apply(
    state: State<'_, AppState>,
) -> CommandResult<DebugDevBootstrapResult> {
    let request_id = next_request_id();
    let trace = ResponseTrace::local(request_id);
    state
        .dev_bootstrap_service()
        .apply(&trace.request_id)
        .await
        .map_err(|error| {
            command_error_payload(
                DEBUG_COMPONENT,
                "cmd_debug_dev_bootstrap_apply",
                "local://debug/dev-bootstrap-apply",
                &trace.request_id,
                error,
            )
        })
}

#[tauri::command]
pub async fn cmd_debug_log_tail(limit: Option<usize>) -> CommandResult<DebugLogTailResponse> {
    let request_id = next_request_id();
    let trace = ResponseTrace::local(request_id);
    let lines = tail_log_lines(limit.unwrap_or(80)).map_err(|error| {
        command_error_payload(
            DEBUG_COMPONENT,
            "cmd_debug_log_tail",
            "local-log-file",
            &trace.request_id,
            error,
        )
    })?;

    Ok(DebugLogTailResponse {
        lines,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_debug_open_devtools(app: AppHandle) -> CommandResult<String> {
    let request_id = next_request_id();
    let trace = ResponseTrace::local(request_id);
    let window = app.get_webview_window("main").ok_or_else(|| {
        command_error_payload(
            DEBUG_COMPONENT,
            "cmd_debug_open_devtools",
            "local://debug/devtools",
            &trace.request_id,
            AppError::Config {
                message: "메인 WebView 창을 찾지 못했습니다.".to_string(),
            },
        )
    })?;

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let _ = window;
        return Err(command_error_payload(
            DEBUG_COMPONENT,
            "cmd_debug_open_devtools",
            "local://debug/devtools",
            &trace.request_id,
            AppError::Config {
                message: "모바일 WebView DOM 검사는 기기 원격 검사 도구를 사용해야 합니다."
                    .to_string(),
            },
        ));
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        if !window.is_devtools_open() {
            window.open_devtools();
            return Ok("opened".to_string());
        }

        Ok("already-open".to_string())
    }
}
