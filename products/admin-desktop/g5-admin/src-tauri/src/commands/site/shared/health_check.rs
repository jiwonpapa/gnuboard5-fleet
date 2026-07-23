use crate::error::{AppError, CommandResult};
use g5_admin_models::models::site::SiteHealthCheckResult;

pub(in crate::commands::site) async fn perform_health_check(
    raw_url: &str,
) -> CommandResult<SiteHealthCheckResult> {
    let result = g5_admin_health_check::perform_health_check(raw_url)
        .await
        .map_err(|error| {
            AppError::Config {
                message: error.to_string(),
            }
            .into_payload(error.request_id().to_string())
        })?;

    Ok(SiteHealthCheckResult {
        reachable: result.reachable,
        resolved_url: result.resolved_url,
        message: result.message,
        request_id: result.request_id,
        correlation_id: result.correlation_id,
        server_request_id: result.server_request_id,
    })
}
