use crate::models::board::{
    AdminBoard, AdminBoardCopyInput, AdminBoardCreateInput, AdminBoardDeleteInput,
    AdminBoardDetailResponse, AdminBoardListQuery, AdminBoardListResponse,
    AdminBoardNewPostDeleteInput, AdminBoardNewPostDeleteResponse, AdminBoardNewPostDeleteResult,
    AdminBoardUpdateInput,
};
use crate::models::board_group::{
    AdminBoardGroup, AdminBoardGroupCreateInput, AdminBoardGroupDeleteInput,
    AdminBoardGroupDetailResponse, AdminBoardGroupListResponse, AdminBoardGroupMember,
    AdminBoardGroupMemberAddInput, AdminBoardGroupMemberDeleteInput,
    AdminBoardGroupMemberListQuery, AdminBoardGroupMemberListResponse,
    AdminBoardGroupMemberResponse, AdminBoardGroupMemberResult, AdminBoardGroupUpdateInput,
};
use crate::models::config::{AdminConfig, AdminConfigResponse, AdminConfigUpdateInput};
use crate::models::content::{
    AdminContentCreateInput, AdminContentDeleteInput, AdminContentDetailResponse, AdminContentItem,
    AdminContentListQuery, AdminContentListResponse, AdminContentUpdateInput,
};
use crate::models::faq::{
    AdminFaqCreateInput, AdminFaqDeleteInput, AdminFaqDetailResponse, AdminFaqImage,
    AdminFaqImageResponse, AdminFaqImageUploadInput, AdminFaqItem, AdminFaqListQuery,
    AdminFaqListResponse, AdminFaqMasterCreateInput, AdminFaqMasterDeleteInput,
    AdminFaqMasterDetail, AdminFaqMasterDetailResponse, AdminFaqMasterListQuery,
    AdminFaqMasterListResponse, AdminFaqMasterSummary, AdminFaqMasterUpdateInput,
    AdminFaqUpdateInput,
};
use crate::models::layout::{
    AdminLayoutActionResponse, AdminLayoutDetail, AdminLayoutDetailResponse, AdminLayoutListQuery,
    AdminLayoutListResponse, AdminLayoutReorderInput, AdminLayoutSaveInput, AdminLayoutSummary,
    AdminLayoutWidgetCreateInput, AdminLayoutWidgetDeleteInput, AdminLayoutWidgetUpdateInput,
};
use crate::models::menu::{
    AdminMenu, AdminMenuCreateInput, AdminMenuDeleteInput, AdminMenuDetailResponse,
    AdminMenuListResponse, AdminMenuReorderInput, AdminMenuReorderItem, AdminMenuReorderResponse,
    AdminMenuUpdateInput,
};
use std::error::Error;
use ts_rs::{Config, TS};

pub(super) fn export(config: &Config) -> Result<(), Box<dyn Error>> {
    AdminBoardListQuery::export(config)?;
    AdminBoard::export(config)?;
    AdminBoardListResponse::export(config)?;
    AdminBoardDetailResponse::export(config)?;
    AdminBoardCreateInput::export(config)?;
    AdminBoardUpdateInput::export(config)?;
    AdminBoardDeleteInput::export(config)?;
    AdminBoardCopyInput::export(config)?;
    AdminBoardNewPostDeleteInput::export(config)?;
    AdminBoardNewPostDeleteResult::export(config)?;
    AdminBoardNewPostDeleteResponse::export(config)?;
    AdminBoardGroup::export(config)?;
    AdminBoardGroupListResponse::export(config)?;
    AdminBoardGroupDetailResponse::export(config)?;
    AdminBoardGroupCreateInput::export(config)?;
    AdminBoardGroupUpdateInput::export(config)?;
    AdminBoardGroupDeleteInput::export(config)?;
    AdminBoardGroupMemberListQuery::export(config)?;
    AdminBoardGroupMember::export(config)?;
    AdminBoardGroupMemberListResponse::export(config)?;
    AdminBoardGroupMemberAddInput::export(config)?;
    AdminBoardGroupMemberResult::export(config)?;
    AdminBoardGroupMemberResponse::export(config)?;
    AdminBoardGroupMemberDeleteInput::export(config)?;
    AdminConfig::export(config)?;
    AdminConfigResponse::export(config)?;
    AdminConfigUpdateInput::export(config)?;
    AdminContentListQuery::export(config)?;
    AdminContentItem::export(config)?;
    AdminContentListResponse::export(config)?;
    AdminContentDetailResponse::export(config)?;
    AdminContentCreateInput::export(config)?;
    AdminContentUpdateInput::export(config)?;
    AdminContentDeleteInput::export(config)?;
    AdminFaqImage::export(config)?;
    AdminFaqMasterSummary::export(config)?;
    AdminFaqMasterDetail::export(config)?;
    AdminFaqMasterListQuery::export(config)?;
    AdminFaqMasterListResponse::export(config)?;
    AdminFaqMasterDetailResponse::export(config)?;
    AdminFaqMasterCreateInput::export(config)?;
    AdminFaqMasterUpdateInput::export(config)?;
    AdminFaqMasterDeleteInput::export(config)?;
    AdminFaqImageUploadInput::export(config)?;
    AdminFaqImageResponse::export(config)?;
    AdminFaqListQuery::export(config)?;
    AdminFaqItem::export(config)?;
    AdminFaqListResponse::export(config)?;
    AdminFaqDetailResponse::export(config)?;
    AdminFaqCreateInput::export(config)?;
    AdminFaqUpdateInput::export(config)?;
    AdminFaqDeleteInput::export(config)?;
    AdminLayoutListQuery::export(config)?;
    AdminLayoutSummary::export(config)?;
    AdminLayoutDetail::export(config)?;
    AdminLayoutListResponse::export(config)?;
    AdminLayoutDetailResponse::export(config)?;
    AdminLayoutSaveInput::export(config)?;
    AdminLayoutWidgetCreateInput::export(config)?;
    AdminLayoutWidgetUpdateInput::export(config)?;
    AdminLayoutWidgetDeleteInput::export(config)?;
    AdminLayoutReorderInput::export(config)?;
    AdminLayoutActionResponse::export(config)?;
    AdminMenu::export(config)?;
    AdminMenuListResponse::export(config)?;
    AdminMenuDetailResponse::export(config)?;
    AdminMenuCreateInput::export(config)?;
    AdminMenuUpdateInput::export(config)?;
    AdminMenuDeleteInput::export(config)?;
    AdminMenuReorderItem::export(config)?;
    AdminMenuReorderInput::export(config)?;
    AdminMenuReorderResponse::export(config)?;
    Ok(())
}
