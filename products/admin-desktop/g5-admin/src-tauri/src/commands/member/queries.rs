use crate::app_state::AppState;
use crate::commands::{common::command_context, session::execute_with_access_token};
use crate::core::api_records::model_member_profile_from_record;
use crate::error::CommandResult;
use g5_admin_models::models::member::{
    AdminMemberDetailResponse, AdminMemberListQuery, AdminMemberListResponse, MemberProfileResponse,
};
use g5_admin_models::models::trace::Traced;
use tauri::State;

use super::shared::{
    build_member_detail_response, build_member_list_response, normalize_member_list_query,
    MEMBER_COMPONENT,
};

#[tauri::command]
pub async fn cmd_member_me_get(state: State<'_, AppState>) -> CommandResult<MemberProfileResponse> {
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: member,
        trace,
    } = execute_with_access_token(
        &app_state,
        MEMBER_COMPONENT,
        "cmd_member_me_get",
        "/members/me",
        &request_id,
        |access_token, app_state, request_id| async move {
            app_state
                .admin_api()
                .get_my_profile(&request_id, &access_token)
                .await
        },
    )
    .await?
    .map(model_member_profile_from_record);

    Ok(MemberProfileResponse {
        member,
        request_id: trace.request_id,
        correlation_id: trace.correlation_id,
        server_request_id: trace.server_request_id,
    })
}

#[tauri::command]
pub async fn cmd_admin_member_get_list(
    state: State<'_, AppState>,
    query: Option<AdminMemberListQuery>,
) -> CommandResult<AdminMemberListResponse> {
    let query = normalize_member_list_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: (members, pagination),
        trace,
    } = execute_with_access_token(
        &app_state,
        MEMBER_COMPONENT,
        "cmd_admin_member_get_list",
        "/admin/members",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_members(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(build_member_list_response(members, pagination, trace))
}

#[tauri::command]
pub async fn cmd_admin_member_export_excel(
    state: State<'_, AppState>,
    query: Option<AdminMemberListQuery>,
) -> CommandResult<AdminMemberListResponse> {
    let query = normalize_member_list_query(query.unwrap_or_default());
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: (members, pagination),
        trace,
    } = execute_with_access_token(
        &app_state,
        MEMBER_COMPONENT,
        "cmd_admin_member_export_excel",
        "/admin/members/excel",
        &request_id,
        |access_token, app_state, request_id| {
            let query = query.clone();
            async move {
                app_state
                    .api_client
                    .export_admin_members_excel(&request_id, &access_token, &query)
                    .await
            }
        },
    )
    .await?;

    Ok(build_member_list_response(members, pagination, trace))
}

#[tauri::command]
pub async fn cmd_admin_member_get(
    state: State<'_, AppState>,
    mb_id: String,
) -> CommandResult<AdminMemberDetailResponse> {
    let mb_id = mb_id.trim().to_string();
    let (request_id, app_state) = command_context(&state);
    let Traced {
        value: member,
        trace,
    } = execute_with_access_token(
        &app_state,
        MEMBER_COMPONENT,
        "cmd_admin_member_get",
        "/admin/members/{mb_id}",
        &request_id,
        |access_token, app_state, request_id| {
            let mb_id = mb_id.clone();
            async move {
                app_state
                    .api_client
                    .get_admin_member(&request_id, &access_token, &mb_id)
                    .await
            }
        },
    )
    .await?;

    Ok(build_member_detail_response(member, trace))
}
