use super::shared::{
    normalize_point_action_input, normalize_point_delete_input, normalize_point_expire_input,
    point_action_response, point_delete_response, point_expire_response, POINT_COMPONENT,
};
use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::point::{
    AdminPointActionInput, AdminPointActionResponse, AdminPointDeleteInput,
    AdminPointDeleteResponse, AdminPointExpireInput, AdminPointExpireResponse,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_point_grant(
    state: State<'_, AppState>,
    input: AdminPointActionInput,
) -> CommandResult<AdminPointActionResponse> {
    let input = normalize_point_action_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: result,
        trace,
    } = execute_with_access_token(
        &app_state,
        POINT_COMPONENT,
        "cmd_admin_point_grant",
        "/admin/points",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .grant_admin_point(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(point_action_response(result, trace))
}

#[tauri::command]
pub async fn cmd_admin_point_deduct(
    state: State<'_, AppState>,
    input: AdminPointActionInput,
) -> CommandResult<AdminPointActionResponse> {
    let input = normalize_point_action_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: result,
        trace,
    } = execute_with_access_token(
        &app_state,
        POINT_COMPONENT,
        "cmd_admin_point_deduct",
        "/admin/points",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .deduct_admin_point(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(point_action_response(result, trace))
}

#[tauri::command]
pub async fn cmd_admin_point_delete(
    state: State<'_, AppState>,
    input: AdminPointDeleteInput,
) -> CommandResult<AdminPointDeleteResponse> {
    let input = normalize_point_delete_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: result,
        trace,
    } = execute_with_access_token(
        &app_state,
        POINT_COMPONENT,
        "cmd_admin_point_delete",
        "/admin/points",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .delete_admin_points(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(point_delete_response(result, trace))
}

#[tauri::command]
pub async fn cmd_admin_point_expire(
    state: State<'_, AppState>,
    input: Option<AdminPointExpireInput>,
) -> CommandResult<AdminPointExpireResponse> {
    let input =
        normalize_point_expire_input(input.unwrap_or(AdminPointExpireInput { base_date: None }));
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: result,
        trace,
    } = execute_with_access_token(
        &app_state,
        POINT_COMPONENT,
        "cmd_admin_point_expire",
        "/admin/points",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .expire_admin_points(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(point_expire_response(result, trace))
}
