use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::member::{AdminMemberMediaResponse, AdminMemberMediaUploadInput};
use g5_admin_models::models::trace::Traced;
use tauri::State;

use super::shared::{
    build_member_media_response, normalize_member_media_upload_input, MEMBER_COMPONENT,
};

#[tauri::command]
pub async fn cmd_admin_member_icon_upload(
    state: State<'_, AppState>,
    input: AdminMemberMediaUploadInput,
) -> CommandResult<AdminMemberMediaResponse> {
    upload_member_media(
        state,
        input,
        "cmd_admin_member_icon_upload",
        "/admin/members/{mb_id}/icon",
        true,
    )
    .await
}

#[tauri::command]
pub async fn cmd_admin_member_icon_delete(
    state: State<'_, AppState>,
    mb_id: String,
) -> CommandResult<AdminMemberMediaResponse> {
    delete_member_media(
        state,
        mb_id,
        "cmd_admin_member_icon_delete",
        "/admin/members/{mb_id}/icon",
        true,
    )
    .await
}

#[tauri::command]
pub async fn cmd_admin_member_image_upload(
    state: State<'_, AppState>,
    input: AdminMemberMediaUploadInput,
) -> CommandResult<AdminMemberMediaResponse> {
    upload_member_media(
        state,
        input,
        "cmd_admin_member_image_upload",
        "/admin/members/{mb_id}/image",
        false,
    )
    .await
}

#[tauri::command]
pub async fn cmd_admin_member_image_delete(
    state: State<'_, AppState>,
    mb_id: String,
) -> CommandResult<AdminMemberMediaResponse> {
    delete_member_media(
        state,
        mb_id,
        "cmd_admin_member_image_delete",
        "/admin/members/{mb_id}/image",
        false,
    )
    .await
}

async fn upload_member_media(
    state: State<'_, AppState>,
    input: AdminMemberMediaUploadInput,
    operation: &'static str,
    target: &'static str,
    icon: bool,
) -> CommandResult<AdminMemberMediaResponse> {
    let input = normalize_member_media_upload_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: media,
        trace,
    } = execute_with_access_token(
        &app_state,
        MEMBER_COMPONENT,
        operation,
        target,
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                if icon {
                    app_state
                        .api_client
                        .upload_admin_member_icon(&request_id, &access_token, &input)
                        .await
                } else {
                    app_state
                        .api_client
                        .upload_admin_member_image(&request_id, &access_token, &input)
                        .await
                }
            }
        },
    )
    .await?;

    Ok(build_member_media_response(media, trace))
}

async fn delete_member_media(
    state: State<'_, AppState>,
    mb_id: String,
    operation: &'static str,
    target: &'static str,
    icon: bool,
) -> CommandResult<AdminMemberMediaResponse> {
    let mb_id = mb_id.trim().to_string();
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: media,
        trace,
    } = execute_with_access_token(
        &app_state,
        MEMBER_COMPONENT,
        operation,
        target,
        &request_id,
        |access_token, app_state, request_id| {
            let mb_id = mb_id.clone();
            async move {
                if icon {
                    app_state
                        .api_client
                        .delete_admin_member_icon(&request_id, &access_token, &mb_id)
                        .await
                } else {
                    app_state
                        .api_client
                        .delete_admin_member_image(&request_id, &access_token, &mb_id)
                        .await
                }
            }
        },
    )
    .await?;

    Ok(build_member_media_response(media, trace))
}
