use super::shared::{
    faq_image_response, normalize_image_upload_input, normalize_positive_i32, FAQ_COMPONENT,
};
use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::error::CommandResult;
use g5_admin_models::models::faq::{AdminFaqImageResponse, AdminFaqImageUploadInput};
use g5_admin_models::models::trace::Traced;
use tauri::State;

#[tauri::command]
pub async fn cmd_admin_faq_master_header_image_upload(
    state: State<'_, AppState>,
    input: AdminFaqImageUploadInput,
) -> CommandResult<AdminFaqImageResponse> {
    upload_master_image(
        state,
        input,
        "cmd_admin_faq_master_header_image_upload",
        "/admin/faq-masters/{fm_id}/header-image",
        true,
    )
    .await
}

#[tauri::command]
pub async fn cmd_admin_faq_master_header_image_delete(
    state: State<'_, AppState>,
    fm_id: i32,
) -> CommandResult<AdminFaqImageResponse> {
    delete_master_image(
        state,
        fm_id,
        "cmd_admin_faq_master_header_image_delete",
        "/admin/faq-masters/{fm_id}/header-image",
        true,
    )
    .await
}

#[tauri::command]
pub async fn cmd_admin_faq_master_footer_image_upload(
    state: State<'_, AppState>,
    input: AdminFaqImageUploadInput,
) -> CommandResult<AdminFaqImageResponse> {
    upload_master_image(
        state,
        input,
        "cmd_admin_faq_master_footer_image_upload",
        "/admin/faq-masters/{fm_id}/footer-image",
        false,
    )
    .await
}

#[tauri::command]
pub async fn cmd_admin_faq_master_footer_image_delete(
    state: State<'_, AppState>,
    fm_id: i32,
) -> CommandResult<AdminFaqImageResponse> {
    delete_master_image(
        state,
        fm_id,
        "cmd_admin_faq_master_footer_image_delete",
        "/admin/faq-masters/{fm_id}/footer-image",
        false,
    )
    .await
}

async fn upload_master_image(
    state: State<'_, AppState>,
    input: AdminFaqImageUploadInput,
    operation: &'static str,
    target: &'static str,
    header: bool,
) -> CommandResult<AdminFaqImageResponse> {
    let input = normalize_image_upload_input(input);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: image,
        trace,
    } = execute_with_access_token(
        &app_state,
        FAQ_COMPONENT,
        operation,
        target,
        &request_id,
        |access_token, app_state, request_id| {
            let input = input.clone();
            async move {
                if header {
                    app_state
                        .api_client
                        .upload_admin_faq_master_header_image(&request_id, &access_token, &input)
                        .await
                } else {
                    app_state
                        .api_client
                        .upload_admin_faq_master_footer_image(&request_id, &access_token, &input)
                        .await
                }
            }
        },
    )
    .await?;

    Ok(faq_image_response(image, trace))
}

async fn delete_master_image(
    state: State<'_, AppState>,
    fm_id: i32,
    operation: &'static str,
    target: &'static str,
    header: bool,
) -> CommandResult<AdminFaqImageResponse> {
    let fm_id = normalize_positive_i32(fm_id);
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: image,
        trace,
    } = execute_with_access_token(
        &app_state,
        FAQ_COMPONENT,
        operation,
        target,
        &request_id,
        |access_token, app_state, request_id| async move {
            if header {
                app_state
                    .api_client
                    .delete_admin_faq_master_header_image(&request_id, &access_token, fm_id)
                    .await
            } else {
                app_state
                    .api_client
                    .delete_admin_faq_master_footer_image(&request_id, &access_token, fm_id)
                    .await
            }
        },
    )
    .await?;

    Ok(faq_image_response(image, trace))
}
