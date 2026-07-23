use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::auth::CommandMessage;
use g5_admin_models::models::member::{
    AdminMemberDeleteInput, AdminMemberDetailResponse, AdminMemberLevelUpdateInput,
    AdminMemberUpdateInput,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

use super::shared::{
    build_deleted_message, build_member_detail_response, normalize_member_update_input,
    MEMBER_COMPONENT,
};

#[tauri::command]
pub async fn cmd_admin_member_update_level(
    state: State<'_, AppState>,
    input: AdminMemberLevelUpdateInput,
) -> CommandResult<AdminMemberDetailResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: member,
        trace,
    } = execute_with_access_token(
        &app_state,
        MEMBER_COMPONENT,
        "cmd_admin_member_update_level",
        "/admin/members/{mb_id}/level",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .update_admin_member_level(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(build_member_detail_response(member, trace))
}

#[tauri::command]
pub async fn cmd_admin_member_update(
    state: State<'_, AppState>,
    input: AdminMemberUpdateInput,
) -> CommandResult<AdminMemberDetailResponse> {
    let input = normalize_member_update_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: member,
        trace,
    } = execute_with_access_token(
        &app_state,
        MEMBER_COMPONENT,
        "cmd_admin_member_update",
        "/admin/members/{mb_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .update_admin_member(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(build_member_detail_response(member, trace))
}

#[tauri::command]
pub async fn cmd_admin_member_delete(
    state: State<'_, AppState>,
    input: AdminMemberDeleteInput,
) -> CommandResult<CommandMessage> {
    let (request_id, app_state) = command_context(&state);
    let trace = execute_with_access_token(
        &app_state,
        MEMBER_COMPONENT,
        "cmd_admin_member_delete",
        "/admin/members/{mb_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                app_state
                    .api_client
                    .delete_admin_member(&request_id, &access_token, &input)
                    .await
            }
        },
    )
    .await?;

    Ok(build_deleted_message(trace))
}
