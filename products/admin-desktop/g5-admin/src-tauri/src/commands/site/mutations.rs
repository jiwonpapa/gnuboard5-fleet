use super::health::perform_health_check;
use super::shared::{load_site_catalog, site_command_error};
use crate::app_state::AppState;
use crate::error::{AppError, CommandResult};
use crate::request_id::next_request_id;
use g5_admin_models::models::site::{
    SiteAddInput, SiteCatalog, SiteDeleteInput, SiteSwitchInput, SiteUpdateInput,
};
use tauri::State;

#[tauri::command]
pub async fn cmd_site_add(
    state: State<'_, AppState>,
    input: SiteAddInput,
) -> CommandResult<SiteCatalog> {
    let request_id = next_request_id();
    let check = perform_health_check(&input.api_base_url).await?;
    if !check.reachable {
        return Err(site_command_error(
            "cmd_site_add",
            "site-health-check",
            &request_id,
            AppError::Config {
                message: check.message,
            },
        ));
    }

    let normalized = SiteAddInput {
        api_base_url: check.resolved_url.unwrap_or(input.api_base_url),
        name: input.name,
    };
    state
        .site_catalog_service()
        .add_site(normalized)
        .await
        .map_err(|error| site_command_error("cmd_site_add", "local-site-db", &request_id, error))?;

    load_site_catalog(state.inner(), &request_id, "cmd_site_add").await
}

#[tauri::command]
pub async fn cmd_site_update(
    state: State<'_, AppState>,
    input: SiteUpdateInput,
) -> CommandResult<SiteCatalog> {
    let request_id = next_request_id();
    let check = perform_health_check(&input.api_base_url).await?;
    if !check.reachable {
        return Err(site_command_error(
            "cmd_site_update",
            "site-health-check",
            &request_id,
            AppError::Config {
                message: check.message,
            },
        ));
    }

    state
        .site_catalog_service()
        .update_site(SiteUpdateInput {
            api_base_url: check.resolved_url.unwrap_or(input.api_base_url),
            ..input
        })
        .await
        .map_err(|error| {
            site_command_error("cmd_site_update", "local-site-db", &request_id, error)
        })?;

    load_site_catalog(state.inner(), &request_id, "cmd_site_update").await
}

#[tauri::command]
pub async fn cmd_site_delete(
    state: State<'_, AppState>,
    input: SiteDeleteInput,
) -> CommandResult<SiteCatalog> {
    let request_id = next_request_id();
    state
        .site_catalog_service()
        .delete_site(&input)
        .await
        .map_err(|error| {
            site_command_error("cmd_site_delete", "local-site-db", &request_id, error)
        })?;

    load_site_catalog(state.inner(), &request_id, "cmd_site_delete").await
}

#[tauri::command]
pub async fn cmd_site_switch(
    state: State<'_, AppState>,
    input: SiteSwitchInput,
) -> CommandResult<SiteCatalog> {
    let request_id = next_request_id();
    state
        .site_catalog_service()
        .switch_site(&input.site_id)
        .await
        .map_err(|error| {
            site_command_error("cmd_site_switch", "local-site-db", &request_id, error)
        })?;

    load_site_catalog(state.inner(), &request_id, "cmd_site_switch").await
}
