use crate::app_state::AppState;
use crate::commands::common::{
    command_error_payload, load_required_session, refresh_stored_session,
};
use crate::error::{AppError, AppErrorPayload};
use std::future::Future;

pub(crate) async fn execute_with_access_token<T, F, Fut, E>(
    state: &AppState,
    component: &'static str,
    operation: &'static str,
    target: &'static str,
    request_id: &str,
    run: F,
) -> Result<T, AppErrorPayload>
where
    F: Fn(String, AppState, String) -> Fut,
    Fut: Future<Output = Result<T, E>>,
    E: Into<AppError>,
{
    let _request_context = state
        .acquire_active_request_context()
        .await
        .map_err(|error| command_error_payload(component, operation, target, request_id, error))?;
    tracing::debug!(
        component,
        operation,
        request_id,
        active_site_id = _request_context.site_id().unwrap_or("-"),
        active_base_url = _request_context.base_url().unwrap_or("-"),
        "captured atomic active request context"
    );
    let session = load_required_session(state, component, operation, request_id).await?;

    match run(
        session.access_token.clone(),
        state.clone(),
        request_id.to_string(),
    )
    .await
    .map_err(Into::into)
    {
        Ok(result) => Ok(result),
        Err(error) if error.status_code() == Some(401) => {
            let Some(updated_session) =
                refresh_stored_session(state, component, operation, request_id, session).await?
            else {
                return Err(AppError::Auth {
                    message: "No authenticated session".to_string(),
                }
                .into_payload(request_id.to_string()));
            };

            run(
                updated_session.access_token,
                state.clone(),
                request_id.to_string(),
            )
            .await
            .map_err(Into::into)
            .map_err(|error| command_error_payload(component, operation, target, request_id, error))
        }
        Err(error) => Err(command_error_payload(
            component, operation, target, request_id, error,
        )),
    }
}
