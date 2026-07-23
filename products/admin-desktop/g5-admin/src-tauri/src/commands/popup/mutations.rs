use crate::app_state::AppState;
use crate::commands::popup::shared::{
    normalize_popup_create_input, normalize_popup_delete_input, normalize_popup_update_input,
    popup_delete_response, popup_detail_response, POPUP_COMPONENT,
};
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::popup::{
    AdminPopupCreateInput, AdminPopupDeleteInput, AdminPopupDetailResponse, AdminPopupUpdateInput,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_popup_create(
    state: State<'_, AppState>,
    input: AdminPopupCreateInput,
) -> CommandResult<AdminPopupDetailResponse> {
    let input = normalize_popup_create_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        POPUP_COMPONENT,
        "cmd_admin_popup_create",
        "/admin/system/popups",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .create_admin_popup(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(popup_detail_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_popup_update(
    state: State<'_, AppState>,
    input: AdminPopupUpdateInput,
) -> CommandResult<AdminPopupDetailResponse> {
    let input = normalize_popup_update_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced { value, trace } = execute_with_access_token(
        &app_state,
        POPUP_COMPONENT,
        "cmd_admin_popup_update",
        "/admin/system/popups/{nw_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .update_admin_popup(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(popup_detail_response(value, trace))
}

#[tauri::command]
pub async fn cmd_admin_popup_delete(
    state: State<'_, AppState>,
    input: AdminPopupDeleteInput,
) -> CommandResult<CommandMessage> {
    let input = normalize_popup_delete_input(input);
    let (request_id, app_state) = command_context(&state);
    let trace = execute_with_access_token(
        &app_state,
        POPUP_COMPONENT,
        "cmd_admin_popup_delete",
        "/admin/system/popups/{nw_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .delete_admin_popup(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(popup_delete_response(trace))
}
