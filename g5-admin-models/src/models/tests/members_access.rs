use crate::models::member::{
    AdminMemberDeleteInput, AdminMemberDetail, AdminMemberDetailResponse,
    AdminMemberLevelUpdateInput, AdminMemberListItem, AdminMemberListQuery,
    AdminMemberListResponse, AdminMemberMediaResponse, AdminMemberMediaResult,
    AdminMemberMediaUploadInput, AdminMemberUpdateInput, MemberProfile, MemberProfileResponse,
    Pagination,
};
use crate::models::permission::{
    AdminAuthDeleteInput, AdminAuthGrant, AdminAuthItem, AdminAuthListQuery, AdminAuthListResponse,
    AdminAuthUpsertInput, AdminAuthUpsertResponse, AdminPermissionDeleteInput, AdminPermissionItem,
    AdminPermissionListQuery, AdminPermissionListResponse, AdminPermissionSaveInput,
    AdminPermissionSaveResponse,
};
use crate::models::point::{
    AdminPointActionInput, AdminPointActionResponse, AdminPointActionResult, AdminPointDeleteInput,
    AdminPointDeleteResponse, AdminPointDeleteResult, AdminPointExpireInput,
    AdminPointExpireResponse, AdminPointExpireResult, AdminPointItem, AdminPointListQuery,
    AdminPointListResponse, AdminPointSummary, AdminPointSummaryResponse,
};
use std::error::Error;
use ts_rs::{Config, TS};

pub(super) fn export(config: &Config) -> Result<(), Box<dyn Error>> {
    Pagination::export(config)?;
    AdminMemberListQuery::export(config)?;
    AdminMemberListItem::export(config)?;
    AdminMemberListResponse::export(config)?;
    AdminMemberDetail::export(config)?;
    AdminMemberDetailResponse::export(config)?;
    AdminMemberLevelUpdateInput::export(config)?;
    AdminMemberUpdateInput::export(config)?;
    AdminMemberDeleteInput::export(config)?;
    AdminMemberMediaUploadInput::export(config)?;
    AdminMemberMediaResult::export(config)?;
    AdminMemberMediaResponse::export(config)?;
    AdminPermissionListQuery::export(config)?;
    AdminPermissionItem::export(config)?;
    AdminPermissionListResponse::export(config)?;
    AdminPermissionSaveInput::export(config)?;
    AdminPermissionSaveResponse::export(config)?;
    AdminPermissionDeleteInput::export(config)?;
    AdminAuthListQuery::export(config)?;
    AdminAuthGrant::export(config)?;
    AdminAuthItem::export(config)?;
    AdminAuthListResponse::export(config)?;
    AdminAuthUpsertInput::export(config)?;
    AdminAuthUpsertResponse::export(config)?;
    AdminAuthDeleteInput::export(config)?;
    AdminPointListQuery::export(config)?;
    AdminPointItem::export(config)?;
    AdminPointListResponse::export(config)?;
    AdminPointSummary::export(config)?;
    AdminPointSummaryResponse::export(config)?;
    AdminPointActionInput::export(config)?;
    AdminPointActionResult::export(config)?;
    AdminPointActionResponse::export(config)?;
    AdminPointDeleteInput::export(config)?;
    AdminPointDeleteResult::export(config)?;
    AdminPointDeleteResponse::export(config)?;
    AdminPointExpireInput::export(config)?;
    AdminPointExpireResult::export(config)?;
    AdminPointExpireResponse::export(config)?;
    MemberProfile::export(config)?;
    MemberProfileResponse::export(config)?;
    Ok(())
}
