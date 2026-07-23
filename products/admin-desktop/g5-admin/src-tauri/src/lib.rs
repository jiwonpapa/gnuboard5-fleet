mod api_client;
mod app_state;
mod commands;
mod core;
mod db;
mod debug_support;
mod error;
mod fast_unlock;
mod request_id;
mod runtime_config;
mod site_manager;
mod token_store;

use app_state::AppState;
use commands::registry::app_invoke_handler;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    debug_support::init_tracing();

    let app_state = AppState::from_env().unwrap_or_else(|error| {
        panic!(
            "failed to initialize app state: {}",
            error.into_payload("bootstrap").message
        )
    });

    let mut builder = tauri::Builder::default()
        .manage(app_state)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init());

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder
            .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.unminimize();
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }))
            .plugin(tauri_plugin_biometry::init())
            .plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
        .setup(|app| {
            let state = app.state::<AppState>();
            state.set_app_handle(app.handle().clone());
            Ok(())
        })
        .invoke_handler(app_invoke_handler!())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
