use super::shared::load_site_catalog;
use crate::app_state::AppState;
use crate::error::CommandResult;
use crate::request_id::next_request_id;
use g5_admin_models::models::site::SiteCatalog;
use tauri::State;

#[tauri::command]
pub async fn cmd_site_catalog_get(state: State<'_, AppState>) -> CommandResult<SiteCatalog> {
    let request_id = next_request_id();
    load_site_catalog(state.inner(), &request_id, "cmd_site_catalog_get").await
}
