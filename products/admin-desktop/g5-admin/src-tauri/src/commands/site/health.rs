pub(super) use super::shared::perform_health_check;
use crate::error::CommandResult;
use g5_admin_models::models::site::{SiteHealthCheckInput, SiteHealthCheckResult};

#[tauri::command]
pub async fn cmd_site_health_check(
    input: SiteHealthCheckInput,
) -> CommandResult<SiteHealthCheckResult> {
    perform_health_check(&input.api_base_url).await
}
