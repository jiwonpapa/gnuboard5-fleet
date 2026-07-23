use crate::app_state::AppState;
use crate::commands::common::command_error_payload;
use crate::error::{AppError, AppErrorPayload, CommandResult};
use g5_admin_models::models::site::SiteCatalog;

pub(super) const SITE_COMPONENT: &str = "g5_admin::commands::site";

pub(in crate::commands::site) fn site_command_error(
    operation: &'static str,
    target: &'static str,
    request_id: &str,
    error: AppError,
) -> AppErrorPayload {
    command_error_payload(SITE_COMPONENT, operation, target, request_id, error)
}

pub(in crate::commands::site) async fn load_site_catalog(
    state: &AppState,
    request_id: &str,
    operation: &'static str,
) -> CommandResult<SiteCatalog> {
    state
        .site_catalog_service()
        .catalog(request_id)
        .await
        .map_err(|error| site_command_error(operation, "local-site-db", request_id, error))
}
