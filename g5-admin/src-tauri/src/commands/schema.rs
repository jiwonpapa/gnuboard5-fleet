use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::schema::{AdminSchemaCatalogResponse, AdminSchemaDetailResponse};
use g5_admin_models::models::trace::Traced;
use tauri::State;

const SCHEMA_COMPONENT: &str = "g5_admin::commands::schema";

#[tauri::command]
pub async fn cmd_admin_schema_get_catalog(
    state: State<'_, AppState>,
) -> CommandResult<AdminSchemaCatalogResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: catalog,
        trace,
    } = execute_with_access_token(
        &app_state,
        SCHEMA_COMPONENT,
        "cmd_admin_schema_get_catalog",
        "/admin/schema",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .api_client
                .get_admin_schema_catalog(&request_id, &access_token)
                .await
        },
    )
    .await?;

    Ok(AdminSchemaCatalogResponse {
        catalog,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_schema_get(
    state: State<'_, AppState>,
    domain: String,
) -> CommandResult<AdminSchemaDetailResponse> {
    let domain = normalize_domain(domain);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: schema,
        trace,
    } = execute_with_access_token(
        &app_state,
        SCHEMA_COMPONENT,
        "cmd_admin_schema_get",
        "/admin/schema/{domain}",
        &request_id,
        |access_token, app_state, request_id| {
            let domain = domain.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_schema(&request_id, &access_token, &domain)
                    .await
            }
        },
    )
    .await?;

    Ok(AdminSchemaDetailResponse {
        schema,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

fn normalize_domain(domain: String) -> String {
    domain.trim().to_lowercase()
}
