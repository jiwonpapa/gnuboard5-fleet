use std::{
    collections::{BTreeMap, BTreeSet},
    net::SocketAddr,
    sync::{Arc, OnceLock},
    time::Duration,
};

use async_trait::async_trait;
use base64::{Engine, engine::general_purpose::STANDARD as BASE64};
pub use g5_fleet_core::admin::{
    AdminConfig, AdminConfigUpdate, AdminDashboardData, AdminSchemaCatalog, AdminSchemaDetail,
};
pub use g5_fleet_core::boards::{
    AdminBoard, AdminBoardCopy, AdminBoardCreate, AdminBoardList, AdminBoardListQuery,
    AdminBoardUpdate, AdminNewPostsDelete, AdminNewPostsDeleteResult, valid_board_table,
};
pub use g5_fleet_core::contents::{
    AdminContent, AdminContentCreate, AdminContentList, AdminContentListQuery, AdminContentUpdate,
    valid_content_id,
};
pub use g5_fleet_core::faqs::{
    AdminFaqCreate, AdminFaqImage, AdminFaqImageUpload, AdminFaqItem, AdminFaqList,
    AdminFaqListQuery, AdminFaqMasterCreate, AdminFaqMasterDetail, AdminFaqMasterList,
    AdminFaqMasterListQuery, AdminFaqMasterSummary, AdminFaqMasterUpdate, AdminFaqUpdate,
    valid_faq_id,
};
pub use g5_fleet_core::groups::{
    AdminBoardGroup, AdminBoardGroupCreate, AdminBoardGroupList, AdminBoardGroupMember,
    AdminBoardGroupMemberCreate, AdminBoardGroupMemberList, AdminBoardGroupMemberListQuery,
    AdminBoardGroupMemberResult, AdminBoardGroupUpdate, valid_group_id,
};
pub use g5_fleet_core::layouts::{
    AdminLayoutDetail, AdminLayoutList, AdminLayoutListQuery, AdminLayoutSave, AdminLayoutWidget,
    AdminLayoutWidgetCreate, AdminLayoutWidgetReorder, AdminLayoutWidgetUpdate,
    valid_layout_page_id, valid_widget_id,
};
pub use g5_fleet_core::members::{
    AdminMember, AdminMemberLevelUpdate, AdminMemberList, AdminMemberListQuery,
    AdminMemberMediaDeleteResult, AdminMemberMediaUpload, AdminMemberMediaUploadResult,
    AdminMemberUpdate, valid_member_target,
};
pub use g5_fleet_core::menus::{
    AdminMenu, AdminMenuCreate, AdminMenuList, AdminMenuReorder, AdminMenuReorderResult,
    AdminMenuUpdate, valid_menu_id,
};
pub use g5_fleet_core::permissions::{
    AdminAuthListQuery, AdminAuthMember, AdminAuthMemberList, AdminAuthUpsert,
    AdminSystemPermission, AdminSystemPermissionList, AdminSystemPermissionListQuery,
    AdminSystemPermissionSave, MemberProfile, Pagination, valid_member_id, valid_system_menu,
};
pub use g5_fleet_core::points::{
    AdminPointAction, AdminPointActionResult, AdminPointChange, AdminPointChangeResult,
    AdminPointDelete, AdminPointDeleteResult, AdminPointExpire, AdminPointExpireResult,
    AdminPointList, AdminPointListQuery, AdminPointSummary,
};
pub use g5_fleet_core::polls::{
    AdminPoll, AdminPollCreate, AdminPollList, AdminPollListQuery, AdminPollSummary,
    AdminPollUpdate, valid_poll_id,
};
pub use g5_fleet_core::popular::{
    AdminPopularList, AdminPopularListQuery, AdminPopularRankList, AdminPopularRankQuery,
    AdminPopularReset, AdminPopularResetResult,
};
pub use g5_fleet_core::popups::{
    AdminPopup, AdminPopupCreate, AdminPopupList, AdminPopupListQuery, AdminPopupUpdate,
    valid_popup_id,
};
pub use g5_fleet_core::qa::{
    AdminQaBulkDelete, AdminQaBulkDeleteResult, AdminQaConfig, AdminQaConfigUpdate,
};
pub use g5_fleet_core::reports::{
    AdminReportItem, AdminReportList, AdminReportListQuery, AdminReportStats, AdminReportStatus,
    AdminReportTargetType, AdminReportUpdate, valid_report_id,
};
pub use g5_fleet_core::theme::{
    AdminTheme, AdminThemeConfig, AdminThemeList, AdminThemeUpdate, valid_theme_id,
};
pub use g5_fleet_core::visits::{
    AdminVisitDelete, AdminVisitDeleteResult, AdminVisitLogItem, AdminVisitSearchQuery,
    AdminVisitSearchResult, AdminVisitStatItem, AdminVisitStats, AdminVisitStatsQuery,
    AdminVisitStatsSummary, AdminVisitStatsType,
};
use g5_fleet_security::{SystemResolver, UrlGuard};
use reqwest::{
    Method,
    header::CONTENT_TYPE,
    multipart::{Form, Part},
    redirect::Policy,
};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use serde_json::{Map, Value, json};
use url::Url;

const CORE_REGISTRY_JSON: &str = include_str!("../../../contracts/core-operations.json");
const MAX_CORE_RESPONSE_BYTES: usize = 16 * 1024 * 1024;
const MAX_CORE_UPLOAD_BYTES: usize = 16 * 1024 * 1024;

#[derive(Debug, thiserror::Error)]
pub enum ConnectorError {
    #[error("connector URL failed security validation")]
    UrlSecurity,
    #[error("connector transport failed")]
    Transport,
    #[error("connector returned HTTP {0}")]
    Http(u16),
    #[error("connector response contract is invalid")]
    Contract,
    #[error("connector basic config value is invalid")]
    InvalidConfigValue,
    #[error("unknown Core operation")]
    UnknownOperation,
    #[error("operation uses a specialized Fleet route")]
    SpecializedOperation,
    #[error("external-effect operation is blocked by the Core routine policy")]
    ExternalEffectBlocked,
    #[error("Core operation request is invalid")]
    InvalidCoreRequest,
    #[error("Core operation response is too large")]
    ResponseTooLarge,
}

pub type ConnectorResult<T> = Result<T, ConnectorError>;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct ConnectorHealth {
    pub status: String,
    pub version: String,
    pub timestamp: i64,
}

#[derive(Clone, PartialEq, Eq)]
pub struct ConnectorLogin {
    pub mb_id: String,
    pub mb_password: String,
}

#[derive(Clone, Deserialize, Serialize, PartialEq, Eq)]
pub struct ConnectorCredentials {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct BasicConfig {
    pub cf_title: Option<String>,
    pub cf_admin: Option<String>,
    pub cf_10: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct SiteOverview {
    pub connector_status: String,
    pub connector_version: String,
    pub site_title: Option<String>,
    pub administrator_id: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct CoreParameterSpec {
    pub name: String,
    pub location: String,
    pub required: bool,
    #[serde(rename = "type")]
    pub value_type: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct CoreOperationSpec {
    pub operation_id: String,
    pub method: String,
    pub path: String,
    pub domain: String,
    pub risk: String,
    pub transport: String,
    pub requires_step_up: bool,
    pub parameters: Vec<CoreParameterSpec>,
    pub request_body_required: bool,
    pub request_media_types: Vec<String>,
    pub request_fields: Vec<String>,
    pub request_required_fields: Vec<String>,
    pub request_required_alternatives: Vec<Vec<Vec<String>>>,
    pub response_fields: Vec<String>,
    pub schema_refs: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct CoreRegistry {
    operations: Vec<CoreOperationSpec>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
pub struct CoreExecuteRequest {
    #[serde(default)]
    pub path: BTreeMap<String, String>,
    #[serde(default)]
    pub query: BTreeMap<String, Value>,
    pub body: Option<Value>,
    #[serde(default)]
    pub confirm_destructive: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct CoreExecuteResponse {
    pub operation_id: String,
    pub upstream_status: u16,
    pub content_type: Option<String>,
    pub data: Option<Value>,
    pub body_base64: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FaqImageContent {
    pub bytes: Vec<u8>,
}

#[async_trait]
pub trait ConnectorGateway: Send + Sync {
    async fn health(&self, base_url: &str, request_id: &str) -> ConnectorResult<ConnectorHealth>;
    async fn login(
        &self,
        base_url: &str,
        request_id: &str,
        input: &ConnectorLogin,
    ) -> ConnectorResult<ConnectorCredentials>;
    async fn refresh(
        &self,
        base_url: &str,
        request_id: &str,
        refresh_token: &str,
    ) -> ConnectorResult<ConnectorCredentials>;
    async fn logout(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        refresh_token: &str,
    ) -> ConnectorResult<()>;
    async fn basic_config(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
    ) -> ConnectorResult<BasicConfig>;
    async fn update_basic_config(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        cf_10: &str,
    ) -> ConnectorResult<BasicConfig>;
    async fn core_execute(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        operation_id: &str,
        input: &CoreExecuteRequest,
    ) -> ConnectorResult<CoreExecuteResponse>;

    async fn admin_get_faq_master_image_content(
        &self,
        _base_url: &str,
        _request_id: &str,
        _fm_id: i64,
        _kind: &str,
    ) -> ConnectorResult<FaqImageContent> {
        Err(ConnectorError::SpecializedOperation)
    }

    async fn admin_get_dashboard(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        limit: Option<u8>,
    ) -> ConnectorResult<AdminDashboardData> {
        if limit.is_some_and(|value| !(1..=20).contains(&value)) {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let input = CoreExecuteRequest {
            query: limit
                .map(|value| BTreeMap::from([("limit".to_owned(), json!(value))]))
                .unwrap_or_default(),
            ..Default::default()
        };
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminGetDashboard",
                &input,
            )
            .await?;
        typed_core_data("adminGetDashboard", response)
    }

    async fn admin_get_config(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
    ) -> ConnectorResult<AdminConfig> {
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminGetConfig",
                &CoreExecuteRequest::default(),
            )
            .await?;
        typed_core_data("adminGetConfig", response)
    }

    async fn admin_update_config(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        update: &AdminConfigUpdate,
    ) -> ConnectorResult<AdminConfig> {
        if update.is_empty() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let body = serde_json::to_value(update).map_err(|_| ConnectorError::Contract)?;
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminUpdateConfig",
                &CoreExecuteRequest {
                    body: Some(body),
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data("adminUpdateConfig", response)
    }

    async fn admin_list_field_schemas(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
    ) -> ConnectorResult<AdminSchemaCatalog> {
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminListFieldSchemas",
                &CoreExecuteRequest::default(),
            )
            .await?;
        typed_core_data("adminListFieldSchemas", response)
    }

    async fn admin_get_field_schema(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        domain: &str,
    ) -> ConnectorResult<AdminSchemaDetail> {
        if domain.is_empty() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminGetFieldSchema",
                &CoreExecuteRequest {
                    path: BTreeMap::from([("domain".to_owned(), domain.to_owned())]),
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data("adminGetFieldSchema", response)
    }

    async fn member_get_my_profile(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
    ) -> ConnectorResult<MemberProfile> {
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "getMyProfile",
                &CoreExecuteRequest::default(),
            )
            .await?;
        typed_core_data("getMyProfile", response)
    }

    async fn admin_list_auth(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        query: &AdminAuthListQuery,
    ) -> ConnectorResult<AdminAuthMemberList> {
        validate_page(query.page, query.per_page)?;
        if query
            .mb_id
            .as_deref()
            .is_some_and(|value| !valid_member_id(value))
        {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let input = CoreExecuteRequest {
            query: query_map([
                ("page", query.page.map(|value| json!(value))),
                ("per_page", query.per_page.map(|value| json!(value))),
                (
                    "date_from",
                    query.date_from.as_ref().map(|value| json!(value)),
                ),
                ("date_to", query.date_to.as_ref().map(|value| json!(value))),
                ("mb_id", query.mb_id.as_ref().map(|value| json!(value))),
            ]),
            ..Default::default()
        };
        let envelope: TypedListEnvelope<AdminAuthMember> = typed_core_envelope(
            "adminListAuth",
            self.core_execute(base_url, request_id, access_token, "adminListAuth", &input)
                .await?,
        )?;
        Ok(AdminAuthMemberList {
            items: envelope.data,
            pagination: envelope.pagination,
        })
    }

    async fn admin_upsert_auth(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        mb_id: &str,
        update: &AdminAuthUpsert,
    ) -> ConnectorResult<AdminAuthMember> {
        if !valid_member_id(mb_id) {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let update = update
            .normalized()
            .ok_or(ConnectorError::InvalidCoreRequest)?;
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminUpsertAuth",
                &CoreExecuteRequest {
                    path: BTreeMap::from([("mb_id".to_owned(), mb_id.to_owned())]),
                    body: Some(serde_json::to_value(update).map_err(|_| ConnectorError::Contract)?),
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data("adminUpsertAuth", response)
    }

    async fn admin_delete_auth_by_member(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        mb_id: &str,
    ) -> ConnectorResult<()> {
        if !valid_member_id(mb_id) {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminDeleteAuthByMember",
                &CoreExecuteRequest {
                    path: BTreeMap::from([("mb_id".to_owned(), mb_id.to_owned())]),
                    confirm_destructive: true,
                    ..Default::default()
                },
            )
            .await?;
        typed_core_empty("adminDeleteAuthByMember", response)
    }

    async fn admin_system_list_auths(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        query: &AdminSystemPermissionListQuery,
    ) -> ConnectorResult<AdminSystemPermissionList> {
        validate_page(query.page, query.per_page)?;
        if query
            .mb_id
            .as_deref()
            .is_some_and(|value| !valid_member_id(value))
        {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let input = CoreExecuteRequest {
            query: query_map([
                ("page", query.page.map(|value| json!(value))),
                ("per_page", query.per_page.map(|value| json!(value))),
                ("mb_id", query.mb_id.as_ref().map(|value| json!(value))),
            ]),
            ..Default::default()
        };
        let envelope: TypedListEnvelope<AdminSystemPermission> = typed_core_envelope(
            "adminSystemListAuths",
            self.core_execute(
                base_url,
                request_id,
                access_token,
                "adminSystemListAuths",
                &input,
            )
            .await?,
        )?;
        Ok(AdminSystemPermissionList {
            items: envelope.data,
            pagination: envelope.pagination,
        })
    }

    async fn admin_system_save_auth(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        input: &AdminSystemPermissionSave,
    ) -> ConnectorResult<AdminSystemPermission> {
        let input = input
            .normalized()
            .ok_or(ConnectorError::InvalidCoreRequest)?;
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminSystemSaveAuth",
                &CoreExecuteRequest {
                    body: Some(serde_json::to_value(input).map_err(|_| ConnectorError::Contract)?),
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data("adminSystemSaveAuth", response)
    }

    async fn admin_system_delete_auth(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        mb_id: &str,
        au_menu: &str,
    ) -> ConnectorResult<()> {
        if !valid_member_id(mb_id) || !valid_system_menu(au_menu) {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminSystemDeleteAuth",
                &CoreExecuteRequest {
                    path: BTreeMap::from([
                        ("mb_id".to_owned(), mb_id.to_owned()),
                        ("au_menu".to_owned(), au_menu.to_owned()),
                    ]),
                    confirm_destructive: true,
                    ..Default::default()
                },
            )
            .await?;
        typed_core_empty("adminSystemDeleteAuth", response)
    }

    async fn admin_list_board_groups(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
    ) -> ConnectorResult<AdminBoardGroupList> {
        board_group_list_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminListBoardGroups",
        )
        .await
    }

    async fn admin_create_board_group(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        create: &AdminBoardGroupCreate,
    ) -> ConnectorResult<AdminBoardGroup> {
        board_group_create_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminCreateBoardGroup",
            create,
        )
        .await
    }

    async fn admin_get_board_group(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        gr_id: &str,
    ) -> ConnectorResult<AdminBoardGroup> {
        board_group_detail_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminGetBoardGroup",
            gr_id,
            None,
        )
        .await
    }

    async fn admin_update_board_group(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        gr_id: &str,
        update: &AdminBoardGroupUpdate,
    ) -> ConnectorResult<AdminBoardGroup> {
        board_group_update_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminUpdateBoardGroup",
            gr_id,
            update,
        )
        .await
    }

    async fn admin_patch_board_group(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        gr_id: &str,
        update: &AdminBoardGroupUpdate,
    ) -> ConnectorResult<AdminBoardGroup> {
        board_group_update_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminPatchBoardGroup",
            gr_id,
            update,
        )
        .await
    }

    async fn admin_delete_board_group(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        gr_id: &str,
    ) -> ConnectorResult<()> {
        board_group_delete_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminDeleteBoardGroup",
            gr_id,
        )
        .await
    }

    async fn admin_list_board_group_members(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        gr_id: &str,
        query: &AdminBoardGroupMemberListQuery,
    ) -> ConnectorResult<AdminBoardGroupMemberList> {
        board_group_member_list_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminListBoardGroupMembers",
            gr_id,
            query,
        )
        .await
    }

    async fn admin_add_board_group_member(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        gr_id: &str,
        create: &AdminBoardGroupMemberCreate,
    ) -> ConnectorResult<AdminBoardGroupMemberResult> {
        board_group_member_create_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminAddBoardGroupMember",
            gr_id,
            create,
        )
        .await
    }

    async fn admin_delete_board_group_member(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        gr_id: &str,
        mb_id: &str,
    ) -> ConnectorResult<()> {
        board_group_member_delete_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminDeleteBoardGroupMember",
            gr_id,
            mb_id,
        )
        .await
    }

    async fn admin_legacy_list_groups(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
    ) -> ConnectorResult<AdminBoardGroupList> {
        board_group_list_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminLegacyListGroups",
        )
        .await
    }

    async fn admin_legacy_create_group(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        create: &AdminBoardGroupCreate,
    ) -> ConnectorResult<AdminBoardGroup> {
        board_group_create_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminLegacyCreateGroup",
            create,
        )
        .await
    }

    async fn admin_legacy_get_group(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        gr_id: &str,
    ) -> ConnectorResult<AdminBoardGroup> {
        board_group_detail_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminLegacyGetGroup",
            gr_id,
            None,
        )
        .await
    }

    async fn admin_legacy_update_group(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        gr_id: &str,
        update: &AdminBoardGroupUpdate,
    ) -> ConnectorResult<AdminBoardGroup> {
        board_group_update_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminLegacyUpdateGroup",
            gr_id,
            update,
        )
        .await
    }

    async fn admin_legacy_delete_group(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        gr_id: &str,
    ) -> ConnectorResult<()> {
        board_group_delete_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminLegacyDeleteGroup",
            gr_id,
        )
        .await
    }

    async fn admin_legacy_list_group_members(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        gr_id: &str,
        query: &AdminBoardGroupMemberListQuery,
    ) -> ConnectorResult<AdminBoardGroupMemberList> {
        board_group_member_list_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminLegacyListGroupMembers",
            gr_id,
            query,
        )
        .await
    }

    async fn admin_legacy_add_group_member(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        gr_id: &str,
        create: &AdminBoardGroupMemberCreate,
    ) -> ConnectorResult<AdminBoardGroupMemberResult> {
        board_group_member_create_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminLegacyAddGroupMember",
            gr_id,
            create,
        )
        .await
    }

    async fn admin_legacy_delete_group_member(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        gr_id: &str,
        mb_id: &str,
    ) -> ConnectorResult<()> {
        board_group_member_delete_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminLegacyDeleteGroupMember",
            gr_id,
            mb_id,
        )
        .await
    }

    async fn admin_list_members(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        query: &AdminMemberListQuery,
    ) -> ConnectorResult<AdminMemberList> {
        if !query.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let input = CoreExecuteRequest {
            query: query_map([
                ("page", query.page.map(|value| json!(value))),
                ("per_page", query.per_page.map(|value| json!(value))),
                ("search", query.search.as_ref().map(|value| json!(value))),
                (
                    "search_field",
                    query.search_field.as_ref().map(|value| json!(value)),
                ),
                ("sort_by", query.sort_by.as_ref().map(|value| json!(value))),
                (
                    "sort_direction",
                    query.sort_direction.as_ref().map(|value| json!(value)),
                ),
            ]),
            ..Default::default()
        };
        member_list_from_response(
            "adminListMembers",
            self.core_execute(
                base_url,
                request_id,
                access_token,
                "adminListMembers",
                &input,
            )
            .await?,
        )
    }

    async fn admin_export_members(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        query: &AdminMemberListQuery,
    ) -> ConnectorResult<AdminMemberList> {
        if !query.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let input = CoreExecuteRequest {
            query: query_map([
                ("search", query.search.as_ref().map(|value| json!(value))),
                (
                    "search_field",
                    query.search_field.as_ref().map(|value| json!(value)),
                ),
            ]),
            ..Default::default()
        };
        member_list_from_response(
            "adminExportMembersExcel",
            self.core_execute(
                base_url,
                request_id,
                access_token,
                "adminExportMembersExcel",
                &input,
            )
            .await?,
        )
    }

    async fn admin_get_member(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        mb_id: &str,
    ) -> ConnectorResult<AdminMember> {
        member_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminGetMember",
            mb_id,
            None,
        )
        .await
    }

    async fn admin_update_member(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        mb_id: &str,
        update: &AdminMemberUpdate,
    ) -> ConnectorResult<AdminMember> {
        if !update.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        member_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminUpdateMember",
            mb_id,
            Some(serde_json::to_value(update).map_err(|_| ConnectorError::Contract)?),
        )
        .await
    }

    async fn admin_delete_member(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        mb_id: &str,
    ) -> ConnectorResult<()> {
        if !valid_member_target(mb_id) {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminDeleteMember",
                &CoreExecuteRequest {
                    path: BTreeMap::from([("mb_id".to_owned(), mb_id.to_owned())]),
                    confirm_destructive: true,
                    ..Default::default()
                },
            )
            .await?;
        typed_core_empty("adminDeleteMember", response)
    }

    async fn admin_update_member_level(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        mb_id: &str,
        update: &AdminMemberLevelUpdate,
    ) -> ConnectorResult<AdminMember> {
        if !update.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        member_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminUpdateMemberLevel",
            mb_id,
            Some(serde_json::to_value(update).map_err(|_| ConnectorError::Contract)?),
        )
        .await
    }

    async fn admin_upload_member_media(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        mb_id: &str,
        kind: &str,
        upload: &AdminMemberMediaUpload,
    ) -> ConnectorResult<AdminMemberMediaUploadResult> {
        if !valid_member_target(mb_id) || !upload.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let operation_id = match kind {
            "icon" => "adminUploadMemberIcon",
            "image" => "adminUploadMemberImage",
            _ => return Err(ConnectorError::InvalidCoreRequest),
        };
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                operation_id,
                &CoreExecuteRequest {
                    path: BTreeMap::from([("mb_id".to_owned(), mb_id.to_owned())]),
                    body: Some(json!({
                        "file": {
                            "$file": {
                                "filename": upload.file_name,
                                "content_type": upload.mime_type,
                                "base64": upload.bytes_base64,
                            }
                        }
                    })),
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data(operation_id, response)
    }

    async fn admin_delete_member_media(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        mb_id: &str,
        kind: &str,
    ) -> ConnectorResult<AdminMemberMediaDeleteResult> {
        if !valid_member_target(mb_id) {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let operation_id = match kind {
            "icon" => "adminDeleteMemberIcon",
            "image" => "adminDeleteMemberImage",
            _ => return Err(ConnectorError::InvalidCoreRequest),
        };
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                operation_id,
                &CoreExecuteRequest {
                    path: BTreeMap::from([("mb_id".to_owned(), mb_id.to_owned())]),
                    confirm_destructive: true,
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data(operation_id, response)
    }

    async fn admin_list_boards(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        query: &AdminBoardListQuery,
    ) -> ConnectorResult<AdminBoardList> {
        if !query.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminListBoards",
                &CoreExecuteRequest {
                    query: query_map([
                        ("page", query.page.map(|value| json!(value))),
                        ("per_page", query.per_page.map(|value| json!(value))),
                        ("gr_id", query.gr_id.as_ref().map(|value| json!(value))),
                        ("search", query.search.as_ref().map(|value| json!(value))),
                        ("sort_by", query.sort_by.as_ref().map(|value| json!(value))),
                        (
                            "sort_direction",
                            query.sort_direction.as_ref().map(|value| json!(value)),
                        ),
                    ]),
                    ..Default::default()
                },
            )
            .await?;
        let envelope: TypedListEnvelope<AdminBoard> =
            typed_core_envelope("adminListBoards", response)?;
        Ok(AdminBoardList {
            items: envelope.data,
            pagination: envelope.pagination,
        })
    }

    async fn admin_create_board(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        create: &AdminBoardCreate,
    ) -> ConnectorResult<AdminBoard> {
        if !create.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminCreateBoard",
                &CoreExecuteRequest {
                    body: Some(serde_json::to_value(create).map_err(|_| ConnectorError::Contract)?),
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data("adminCreateBoard", response)
    }

    async fn admin_get_board(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        bo_table: &str,
    ) -> ConnectorResult<AdminBoard> {
        board_detail_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminGetBoard",
            bo_table,
            CoreExecuteRequest::default(),
        )
        .await
    }

    async fn admin_update_board(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        bo_table: &str,
        update: &AdminBoardUpdate,
    ) -> ConnectorResult<AdminBoard> {
        if !update.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        board_detail_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminUpdateBoard",
            bo_table,
            CoreExecuteRequest {
                body: Some(serde_json::to_value(update).map_err(|_| ConnectorError::Contract)?),
                ..Default::default()
            },
        )
        .await
    }

    async fn admin_delete_board(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        bo_table: &str,
    ) -> ConnectorResult<()> {
        if !valid_board_table(bo_table) {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminDeleteBoard",
                &CoreExecuteRequest {
                    path: BTreeMap::from([("bo_table".to_owned(), bo_table.to_owned())]),
                    confirm_destructive: true,
                    ..Default::default()
                },
            )
            .await?;
        typed_core_empty("adminDeleteBoard", response)
    }

    async fn admin_copy_board(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        bo_table: &str,
        copy: &AdminBoardCopy,
    ) -> ConnectorResult<AdminBoard> {
        if !copy.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        board_detail_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminCopyBoard",
            bo_table,
            CoreExecuteRequest {
                body: Some(serde_json::to_value(copy).map_err(|_| ConnectorError::Contract)?),
                ..Default::default()
            },
        )
        .await
    }

    async fn admin_delete_new_posts(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        delete: &AdminNewPostsDelete,
    ) -> ConnectorResult<AdminNewPostsDeleteResult> {
        if !delete.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminDeleteNewPosts",
                &CoreExecuteRequest {
                    body: Some(serde_json::to_value(delete).map_err(|_| ConnectorError::Contract)?),
                    confirm_destructive: true,
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data("adminDeleteNewPosts", response)
    }

    async fn admin_list_contents(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        query: &AdminContentListQuery,
    ) -> ConnectorResult<AdminContentList> {
        if !query.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminListContents",
                &CoreExecuteRequest {
                    query: query_map([
                        ("page", query.page.map(|value| json!(value))),
                        ("per_page", query.per_page.map(|value| json!(value))),
                        ("search", query.search.as_ref().map(|value| json!(value))),
                    ]),
                    ..Default::default()
                },
            )
            .await?;
        let envelope: TypedListEnvelope<AdminContent> =
            typed_core_envelope("adminListContents", response)?;
        Ok(AdminContentList {
            items: envelope.data,
            pagination: envelope.pagination,
        })
    }

    async fn admin_create_content(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        create: &AdminContentCreate,
    ) -> ConnectorResult<AdminContent> {
        if !create.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminCreateContent",
                &CoreExecuteRequest {
                    body: Some(serde_json::to_value(create).map_err(|_| ConnectorError::Contract)?),
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data("adminCreateContent", response)
    }

    async fn admin_get_content(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        co_id: &str,
    ) -> ConnectorResult<AdminContent> {
        content_detail_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminGetContent",
            co_id,
            CoreExecuteRequest::default(),
        )
        .await
    }

    async fn admin_update_content(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        co_id: &str,
        update: &AdminContentUpdate,
    ) -> ConnectorResult<AdminContent> {
        if !update.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        content_detail_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminUpdateContent",
            co_id,
            CoreExecuteRequest {
                body: Some(serde_json::to_value(update).map_err(|_| ConnectorError::Contract)?),
                ..Default::default()
            },
        )
        .await
    }

    async fn admin_delete_content(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        co_id: &str,
    ) -> ConnectorResult<()> {
        if !valid_content_id(co_id) {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminDeleteContent",
                &CoreExecuteRequest {
                    path: BTreeMap::from([("co_id".to_owned(), co_id.to_owned())]),
                    confirm_destructive: true,
                    ..Default::default()
                },
            )
            .await?;
        typed_core_empty("adminDeleteContent", response)
    }

    async fn admin_list_faq_masters(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        query: &AdminFaqMasterListQuery,
    ) -> ConnectorResult<AdminFaqMasterList> {
        if !query.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminListFaqMasters",
                &CoreExecuteRequest {
                    query: query_map([
                        ("page", query.page.map(|value| json!(value))),
                        ("per_page", query.per_page.map(|value| json!(value))),
                    ]),
                    ..Default::default()
                },
            )
            .await?;
        let envelope: TypedListEnvelope<AdminFaqMasterSummary> =
            typed_core_envelope("adminListFaqMasters", response)?;
        Ok(AdminFaqMasterList {
            items: envelope.data,
            pagination: envelope.pagination,
        })
    }

    async fn admin_create_faq_master(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        create: &AdminFaqMasterCreate,
    ) -> ConnectorResult<AdminFaqMasterDetail> {
        if !create.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminCreateFaqMaster",
                &CoreExecuteRequest {
                    body: Some(serde_json::to_value(create).map_err(|_| ConnectorError::Contract)?),
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data("adminCreateFaqMaster", response)
    }

    async fn admin_get_faq_master(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        fm_id: i64,
    ) -> ConnectorResult<AdminFaqMasterDetail> {
        faq_master_detail_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminGetFaqMaster",
            fm_id,
            CoreExecuteRequest::default(),
        )
        .await
    }

    async fn admin_update_faq_master(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        fm_id: i64,
        update: &AdminFaqMasterUpdate,
    ) -> ConnectorResult<AdminFaqMasterDetail> {
        if !update.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        faq_master_detail_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminUpdateFaqMaster",
            fm_id,
            CoreExecuteRequest {
                body: Some(serde_json::to_value(update).map_err(|_| ConnectorError::Contract)?),
                ..Default::default()
            },
        )
        .await
    }

    async fn admin_delete_faq_master(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        fm_id: i64,
    ) -> ConnectorResult<()> {
        if !valid_faq_id(fm_id) {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminDeleteFaqMaster",
                &CoreExecuteRequest {
                    path: BTreeMap::from([("fm_id".to_owned(), fm_id.to_string())]),
                    confirm_destructive: true,
                    ..Default::default()
                },
            )
            .await?;
        typed_core_empty("adminDeleteFaqMaster", response)
    }

    async fn admin_upload_faq_master_image(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        fm_id: i64,
        kind: &str,
        upload: &AdminFaqImageUpload,
    ) -> ConnectorResult<AdminFaqImage> {
        if !valid_faq_id(fm_id) || !upload.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let operation_id = match kind {
            "header" => "adminUploadFaqMasterHeaderImage",
            "footer" => "adminUploadFaqMasterFooterImage",
            _ => return Err(ConnectorError::InvalidCoreRequest),
        };
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                operation_id,
                &CoreExecuteRequest {
                    path: BTreeMap::from([("fm_id".to_owned(), fm_id.to_string())]),
                    body: Some(json!({
                        "file": {
                            "$file": {
                                "filename": upload.file_name,
                                "content_type": upload.mime_type,
                                "base64": upload.bytes_base64,
                            }
                        }
                    })),
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data(operation_id, response)
    }

    async fn admin_delete_faq_master_image(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        fm_id: i64,
        kind: &str,
    ) -> ConnectorResult<AdminFaqImage> {
        if !valid_faq_id(fm_id) {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let operation_id = match kind {
            "header" => "adminDeleteFaqMasterHeaderImage",
            "footer" => "adminDeleteFaqMasterFooterImage",
            _ => return Err(ConnectorError::InvalidCoreRequest),
        };
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                operation_id,
                &CoreExecuteRequest {
                    path: BTreeMap::from([("fm_id".to_owned(), fm_id.to_string())]),
                    confirm_destructive: true,
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data(operation_id, response)
    }

    async fn admin_list_faqs(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        query: &AdminFaqListQuery,
    ) -> ConnectorResult<AdminFaqList> {
        if !query.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminListFaqs",
                &CoreExecuteRequest {
                    query: query_map([
                        ("page", query.page.map(|value| json!(value))),
                        ("per_page", query.per_page.map(|value| json!(value))),
                        ("fm_id", query.fm_id.map(|value| json!(value))),
                    ]),
                    ..Default::default()
                },
            )
            .await?;
        let envelope: TypedListEnvelope<AdminFaqItem> =
            typed_core_envelope("adminListFaqs", response)?;
        Ok(AdminFaqList {
            items: envelope.data,
            pagination: envelope.pagination,
        })
    }

    async fn admin_create_faq(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        create: &AdminFaqCreate,
    ) -> ConnectorResult<AdminFaqItem> {
        if !create.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminCreateFaq",
                &CoreExecuteRequest {
                    body: Some(serde_json::to_value(create).map_err(|_| ConnectorError::Contract)?),
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data("adminCreateFaq", response)
    }

    async fn admin_get_faq(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        fa_id: i64,
    ) -> ConnectorResult<AdminFaqItem> {
        faq_detail_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminGetFaq",
            fa_id,
            CoreExecuteRequest::default(),
        )
        .await
    }

    async fn admin_update_faq(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        fa_id: i64,
        update: &AdminFaqUpdate,
    ) -> ConnectorResult<AdminFaqItem> {
        if !update.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        faq_detail_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminUpdateFaq",
            fa_id,
            CoreExecuteRequest {
                body: Some(serde_json::to_value(update).map_err(|_| ConnectorError::Contract)?),
                ..Default::default()
            },
        )
        .await
    }

    async fn admin_delete_faq(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        fa_id: i64,
    ) -> ConnectorResult<()> {
        if !valid_faq_id(fa_id) {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminDeleteFaq",
                &CoreExecuteRequest {
                    path: BTreeMap::from([("fa_id".to_owned(), fa_id.to_string())]),
                    confirm_destructive: true,
                    ..Default::default()
                },
            )
            .await?;
        typed_core_empty("adminDeleteFaq", response)
    }

    async fn admin_list_menus(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
    ) -> ConnectorResult<AdminMenuList> {
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminListMenus",
                &CoreExecuteRequest::default(),
            )
            .await?;
        let envelope: TypedListEnvelope<AdminMenu> =
            typed_core_envelope("adminListMenus", response)?;
        Ok(AdminMenuList {
            items: envelope.data,
            pagination: envelope.pagination,
        })
    }

    async fn admin_create_menu(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        create: &AdminMenuCreate,
    ) -> ConnectorResult<AdminMenu> {
        if !create.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminCreateMenu",
                &CoreExecuteRequest {
                    body: Some(serde_json::to_value(create).map_err(|_| ConnectorError::Contract)?),
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data("adminCreateMenu", response)
    }

    async fn admin_get_menu(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        me_id: i64,
    ) -> ConnectorResult<AdminMenu> {
        menu_detail_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminGetMenu",
            me_id,
            CoreExecuteRequest::default(),
        )
        .await
    }

    async fn admin_update_menu(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        me_id: i64,
        update: &AdminMenuUpdate,
    ) -> ConnectorResult<AdminMenu> {
        if !update.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        menu_detail_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminUpdateMenu",
            me_id,
            CoreExecuteRequest {
                body: Some(serde_json::to_value(update).map_err(|_| ConnectorError::Contract)?),
                ..Default::default()
            },
        )
        .await
    }

    async fn admin_delete_menu(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        me_id: i64,
    ) -> ConnectorResult<()> {
        if !valid_menu_id(me_id) {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminDeleteMenu",
                &CoreExecuteRequest {
                    path: BTreeMap::from([("me_id".to_owned(), me_id.to_string())]),
                    confirm_destructive: true,
                    ..Default::default()
                },
            )
            .await?;
        typed_core_empty("adminDeleteMenu", response)
    }

    async fn admin_reorder_menus(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        reorder: &AdminMenuReorder,
    ) -> ConnectorResult<AdminMenuReorderResult> {
        menu_reorder_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminReorderMenus",
            reorder,
        )
        .await
    }

    async fn admin_reorder_menus_legacy(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        reorder: &AdminMenuReorder,
    ) -> ConnectorResult<AdminMenuReorderResult> {
        menu_reorder_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminReorderMenusLegacy",
            reorder,
        )
        .await
    }

    async fn admin_list_layouts(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        query: &AdminLayoutListQuery,
    ) -> ConnectorResult<AdminLayoutList> {
        if !query.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let mut core_query = BTreeMap::new();
        if let Some(page) = query.page {
            core_query.insert("page".to_owned(), json!(page));
        }
        if let Some(per_page) = query.per_page {
            core_query.insert("per_page".to_owned(), json!(per_page));
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminListLayouts",
                &CoreExecuteRequest {
                    query: core_query,
                    ..Default::default()
                },
            )
            .await?;
        let envelope: TypedListEnvelope<g5_fleet_core::layouts::AdminLayoutSummary> =
            typed_core_envelope("adminListLayouts", response)?;
        Ok(AdminLayoutList {
            items: envelope.data,
            pagination: envelope.pagination,
        })
    }

    async fn admin_get_layout(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        page_id: &str,
    ) -> ConnectorResult<AdminLayoutDetail> {
        layout_detail_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminGetLayout",
            page_id,
            CoreExecuteRequest::default(),
        )
        .await
    }

    async fn admin_save_layout(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        page_id: &str,
        save: &AdminLayoutSave,
    ) -> ConnectorResult<AdminLayoutDetail> {
        if !save.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        layout_detail_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminSaveLayout",
            page_id,
            CoreExecuteRequest {
                body: Some(serde_json::to_value(save).map_err(|_| ConnectorError::Contract)?),
                ..Default::default()
            },
        )
        .await
    }

    async fn admin_add_layout_widget(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        page_id: &str,
        create: &AdminLayoutWidgetCreate,
    ) -> ConnectorResult<AdminLayoutDetail> {
        if !create.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        layout_detail_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminAddWidget",
            page_id,
            CoreExecuteRequest {
                body: Some(serde_json::to_value(create).map_err(|_| ConnectorError::Contract)?),
                ..Default::default()
            },
        )
        .await
    }

    async fn admin_update_layout_widget(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        page_id: &str,
        widget_id: &str,
        update: &AdminLayoutWidgetUpdate,
    ) -> ConnectorResult<AdminLayoutDetail> {
        if !update.is_valid() || !valid_widget_id(widget_id) {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let mut input = CoreExecuteRequest {
            body: Some(serde_json::to_value(update).map_err(|_| ConnectorError::Contract)?),
            ..Default::default()
        };
        input
            .path
            .insert("widget_id".to_owned(), widget_id.to_owned());
        layout_detail_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminUpdateWidget",
            page_id,
            input,
        )
        .await
    }

    async fn admin_delete_layout_widget(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        page_id: &str,
        widget_id: &str,
    ) -> ConnectorResult<AdminLayoutDetail> {
        if !valid_widget_id(widget_id) {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let mut input = CoreExecuteRequest {
            confirm_destructive: true,
            ..Default::default()
        };
        input
            .path
            .insert("widget_id".to_owned(), widget_id.to_owned());
        layout_detail_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminDeleteWidget",
            page_id,
            input,
        )
        .await
    }

    async fn admin_reorder_layout_widgets(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        page_id: &str,
        reorder: &AdminLayoutWidgetReorder,
    ) -> ConnectorResult<AdminLayoutDetail> {
        layout_reorder_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminReorderWidgetCollection",
            page_id,
            reorder,
        )
        .await
    }

    async fn admin_reorder_layout_widgets_legacy(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        page_id: &str,
        reorder: &AdminLayoutWidgetReorder,
    ) -> ConnectorResult<AdminLayoutDetail> {
        layout_reorder_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminReorderWidget",
            page_id,
            reorder,
        )
        .await
    }

    async fn admin_system_list_polls(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        query: &AdminPollListQuery,
    ) -> ConnectorResult<AdminPollList> {
        poll_list_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminSystemListPolls",
            query,
        )
        .await
    }

    async fn admin_system_create_poll(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        create: &AdminPollCreate,
    ) -> ConnectorResult<AdminPoll> {
        if !create.is_valid_system() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        poll_create_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminSystemCreatePoll",
            create,
        )
        .await
    }

    async fn admin_system_get_poll(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        po_id: i64,
    ) -> ConnectorResult<AdminPoll> {
        poll_detail_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminSystemGetPoll",
            po_id,
            CoreExecuteRequest::default(),
        )
        .await
    }

    async fn admin_system_update_poll(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        po_id: i64,
        update: &AdminPollUpdate,
    ) -> ConnectorResult<AdminPoll> {
        poll_update_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminSystemUpdatePoll",
            po_id,
            update,
        )
        .await
    }

    async fn admin_system_delete_poll(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        po_id: i64,
    ) -> ConnectorResult<()> {
        poll_delete_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminSystemDeletePoll",
            po_id,
        )
        .await
    }

    async fn admin_legacy_list_polls(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        query: &AdminPollListQuery,
    ) -> ConnectorResult<AdminPollList> {
        poll_list_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminListPolls",
            query,
        )
        .await
    }

    async fn admin_legacy_create_poll(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        create: &AdminPollCreate,
    ) -> ConnectorResult<AdminPoll> {
        if !create.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        poll_create_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminCreatePoll",
            create,
        )
        .await
    }

    async fn admin_legacy_get_poll(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        po_id: i64,
    ) -> ConnectorResult<AdminPoll> {
        poll_detail_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminGetPoll",
            po_id,
            CoreExecuteRequest::default(),
        )
        .await
    }

    async fn admin_legacy_update_poll(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        po_id: i64,
        update: &AdminPollUpdate,
    ) -> ConnectorResult<AdminPoll> {
        poll_update_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminUpdatePoll",
            po_id,
            update,
        )
        .await
    }

    async fn admin_legacy_delete_poll(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        po_id: i64,
    ) -> ConnectorResult<()> {
        poll_delete_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminDeletePoll",
            po_id,
        )
        .await
    }

    async fn admin_system_list_popups(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        query: &AdminPopupListQuery,
    ) -> ConnectorResult<AdminPopupList> {
        popup_list_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminSystemListPopups",
            query,
        )
        .await
    }

    async fn admin_system_create_popup(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        create: &AdminPopupCreate,
    ) -> ConnectorResult<AdminPopup> {
        popup_create_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminSystemCreatePopup",
            create,
        )
        .await
    }

    async fn admin_system_get_popup(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        nw_id: i64,
    ) -> ConnectorResult<AdminPopup> {
        popup_detail_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminSystemGetPopup",
            nw_id,
            CoreExecuteRequest::default(),
        )
        .await
    }

    async fn admin_system_update_popup(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        nw_id: i64,
        update: &AdminPopupUpdate,
    ) -> ConnectorResult<AdminPopup> {
        popup_update_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminSystemUpdatePopup",
            nw_id,
            update,
        )
        .await
    }

    async fn admin_system_delete_popup(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        nw_id: i64,
    ) -> ConnectorResult<()> {
        popup_delete_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminSystemDeletePopup",
            nw_id,
        )
        .await
    }

    async fn admin_legacy_list_popups(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        query: &AdminPopupListQuery,
    ) -> ConnectorResult<AdminPopupList> {
        popup_list_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminListPopups",
            query,
        )
        .await
    }

    async fn admin_legacy_create_popup(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        create: &AdminPopupCreate,
    ) -> ConnectorResult<AdminPopup> {
        popup_create_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminCreatePopup",
            create,
        )
        .await
    }

    async fn admin_legacy_get_popup(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        nw_id: i64,
    ) -> ConnectorResult<AdminPopup> {
        popup_detail_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminGetPopup",
            nw_id,
            CoreExecuteRequest::default(),
        )
        .await
    }

    async fn admin_legacy_update_popup(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        nw_id: i64,
        update: &AdminPopupUpdate,
    ) -> ConnectorResult<AdminPopup> {
        popup_update_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminUpdatePopup",
            nw_id,
            update,
        )
        .await
    }

    async fn admin_legacy_delete_popup(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        nw_id: i64,
    ) -> ConnectorResult<()> {
        popup_delete_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminDeletePopup",
            nw_id,
        )
        .await
    }

    async fn admin_list_popular(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        query: &AdminPopularListQuery,
    ) -> ConnectorResult<AdminPopularList> {
        if !query.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminListPopular",
                &CoreExecuteRequest {
                    query: query_map([
                        ("page", query.page.map(|value| json!(value))),
                        ("per_page", query.per_page.map(|value| json!(value))),
                        (
                            "date_from",
                            query.date_from.as_ref().map(|value| json!(value)),
                        ),
                        ("date_to", query.date_to.as_ref().map(|value| json!(value))),
                    ]),
                    ..Default::default()
                },
            )
            .await?;
        let envelope: TypedListEnvelope<g5_fleet_core::popular::AdminPopularItem> =
            typed_core_envelope("adminListPopular", response)?;
        Ok(AdminPopularList {
            items: envelope.data,
            pagination: envelope.pagination,
        })
    }

    async fn admin_popular_rank(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        query: &AdminPopularRankQuery,
    ) -> ConnectorResult<AdminPopularRankList> {
        if !query.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminPopularRank",
                &CoreExecuteRequest {
                    query: query_map([
                        ("limit", query.limit.map(|value| json!(value))),
                        (
                            "date_from",
                            query.date_from.as_ref().map(|value| json!(value)),
                        ),
                        ("date_to", query.date_to.as_ref().map(|value| json!(value))),
                    ]),
                    ..Default::default()
                },
            )
            .await?;
        let envelope: TypedListEnvelope<g5_fleet_core::popular::AdminPopularRankItem> =
            typed_core_envelope("adminPopularRank", response)?;
        Ok(AdminPopularRankList {
            items: envelope.data,
            pagination: envelope.pagination,
        })
    }

    async fn admin_reset_popular(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        reset: &AdminPopularReset,
    ) -> ConnectorResult<AdminPopularResetResult> {
        if !reset.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminResetPopular",
                &CoreExecuteRequest {
                    body: Some(serde_json::to_value(reset).map_err(|_| ConnectorError::Contract)?),
                    confirm_destructive: true,
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data("adminResetPopular", response)
    }

    async fn admin_visit_stats(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        query: &AdminVisitStatsQuery,
    ) -> ConnectorResult<AdminVisitStats> {
        if !query.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminVisitStats",
                &CoreExecuteRequest {
                    query: query_map([
                        (
                            "date_from",
                            query.date_from.as_ref().map(|value| json!(value)),
                        ),
                        ("date_to", query.date_to.as_ref().map(|value| json!(value))),
                        ("type", query.stats_type.map(|value| json!(value))),
                        ("limit", query.limit.map(|value| json!(value))),
                    ]),
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data("adminVisitStats", response)
    }

    async fn admin_search_visits(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        query: &AdminVisitSearchQuery,
    ) -> ConnectorResult<AdminVisitSearchResult> {
        if !query.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminSearchVisits",
                &CoreExecuteRequest {
                    query: query_map([
                        ("page", query.page.map(|value| json!(value))),
                        ("per_page", query.per_page.map(|value| json!(value))),
                        (
                            "date_from",
                            query.date_from.as_ref().map(|value| json!(value)),
                        ),
                        ("date_to", query.date_to.as_ref().map(|value| json!(value))),
                        ("ip", query.ip.as_ref().map(|value| json!(value))),
                        ("referer", query.referer.as_ref().map(|value| json!(value))),
                        ("agent", query.agent.as_ref().map(|value| json!(value))),
                    ]),
                    ..Default::default()
                },
            )
            .await?;
        let envelope: TypedListEnvelope<AdminVisitLogItem> =
            typed_core_envelope("adminSearchVisits", response)?;
        Ok(AdminVisitSearchResult {
            items: envelope.data,
            pagination: envelope.pagination,
        })
    }

    async fn admin_delete_visits(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        delete: &AdminVisitDelete,
    ) -> ConnectorResult<AdminVisitDeleteResult> {
        if !delete.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminDeleteVisits",
                &CoreExecuteRequest {
                    body: Some(serde_json::to_value(delete).map_err(|_| ConnectorError::Contract)?),
                    confirm_destructive: true,
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data("adminDeleteVisits", response)
    }

    async fn admin_list_reports(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        query: &AdminReportListQuery,
    ) -> ConnectorResult<AdminReportList> {
        if !query.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminListReports",
                &CoreExecuteRequest {
                    query: query_map([
                        ("status", query.status.map(|value| json!(value))),
                        ("target_type", query.target_type.map(|value| json!(value))),
                        ("page", query.page.map(|value| json!(value))),
                        ("per_page", query.per_page.map(|value| json!(value))),
                    ]),
                    ..Default::default()
                },
            )
            .await?;
        let envelope: TypedListEnvelope<AdminReportItem> =
            typed_core_envelope("adminListReports", response)?;
        Ok(AdminReportList {
            items: envelope.data,
            pagination: envelope.pagination,
        })
    }

    async fn admin_report_stats(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
    ) -> ConnectorResult<AdminReportStats> {
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminReportStats",
                &CoreExecuteRequest::default(),
            )
            .await?;
        typed_core_data("adminReportStats", response)
    }

    async fn admin_update_report(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        report_id: i64,
        update: &AdminReportUpdate,
    ) -> ConnectorResult<AdminReportItem> {
        if !valid_report_id(report_id) || !update.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminUpdateReport",
                &CoreExecuteRequest {
                    path: BTreeMap::from([("report_id".to_owned(), report_id.to_string())]),
                    body: Some(serde_json::to_value(update).map_err(|_| ConnectorError::Contract)?),
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data("adminUpdateReport", response)
    }

    async fn admin_get_qa_config(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
    ) -> ConnectorResult<AdminQaConfig> {
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminSystemGetQaConfig",
                &CoreExecuteRequest::default(),
            )
            .await?;
        typed_core_data("adminSystemGetQaConfig", response)
    }

    async fn admin_update_qa_config(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        update: &AdminQaConfigUpdate,
    ) -> ConnectorResult<AdminQaConfig> {
        if !update.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminSystemUpdateQaConfig",
                &CoreExecuteRequest {
                    body: Some(serde_json::to_value(update).map_err(|_| ConnectorError::Contract)?),
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data("adminSystemUpdateQaConfig", response)
    }

    async fn admin_delete_qa_bulk(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        delete: &AdminQaBulkDelete,
    ) -> ConnectorResult<AdminQaBulkDeleteResult> {
        if !delete.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminDeleteQaBulk",
                &CoreExecuteRequest {
                    body: Some(serde_json::to_value(delete).map_err(|_| ConnectorError::Contract)?),
                    confirm_destructive: true,
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data("adminDeleteQaBulk", response)
    }

    async fn admin_list_points(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        query: &AdminPointListQuery,
    ) -> ConnectorResult<AdminPointList> {
        if !query.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let mut core_query = BTreeMap::new();
        if let Some(value) = query.page {
            core_query.insert("page".to_owned(), json!(value));
        }
        if let Some(value) = query.per_page {
            core_query.insert("per_page".to_owned(), json!(value));
        }
        if let Some(value) = &query.mb_id {
            core_query.insert("mb_id".to_owned(), json!(value));
        }
        if let Some(value) = &query.search_field {
            core_query.insert("search_field".to_owned(), json!(value));
        }
        if let Some(value) = &query.search {
            core_query.insert("search".to_owned(), json!(value));
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminListPoints",
                &CoreExecuteRequest {
                    query: core_query,
                    ..Default::default()
                },
            )
            .await?;
        let envelope: TypedListEnvelope<g5_fleet_core::points::AdminPointItem> =
            typed_core_envelope("adminListPoints", response)?;
        Ok(AdminPointList {
            items: envelope.data,
            pagination: envelope.pagination,
        })
    }

    async fn admin_create_point_action(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        action: &AdminPointAction,
    ) -> ConnectorResult<AdminPointActionResult> {
        if !action.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminCreatePointAction",
                &CoreExecuteRequest {
                    body: Some(serde_json::to_value(action).map_err(|_| ConnectorError::Contract)?),
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data("adminCreatePointAction", response)
    }

    async fn admin_delete_points(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        delete: &AdminPointDelete,
    ) -> ConnectorResult<AdminPointDeleteResult> {
        if !delete.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminDeletePoints",
                &CoreExecuteRequest {
                    body: Some(serde_json::to_value(delete).map_err(|_| ConnectorError::Contract)?),
                    confirm_destructive: true,
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data("adminDeletePoints", response)
    }

    async fn admin_grant_point(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        change: &AdminPointChange,
    ) -> ConnectorResult<AdminPointChangeResult> {
        point_change_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminGrantPoint",
            change,
        )
        .await
    }

    async fn admin_deduct_point(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        change: &AdminPointChange,
    ) -> ConnectorResult<AdminPointChangeResult> {
        point_change_operation(
            self,
            base_url,
            request_id,
            access_token,
            "adminDeductPoint",
            change,
        )
        .await
    }

    async fn admin_point_summary(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        mb_id: Option<&str>,
    ) -> ConnectorResult<AdminPointSummary> {
        if mb_id.is_some_and(|value| value.trim().is_empty() || value.len() > 255) {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminPointSummary",
                &CoreExecuteRequest {
                    query: mb_id
                        .map(|value| BTreeMap::from([("mb_id".to_owned(), json!(value))]))
                        .unwrap_or_default(),
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data("adminPointSummary", response)
    }

    async fn admin_expire_points(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        expire: &AdminPointExpire,
    ) -> ConnectorResult<AdminPointExpireResult> {
        if !expire.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminExpirePoints",
                &CoreExecuteRequest {
                    body: Some(serde_json::to_value(expire).map_err(|_| ConnectorError::Contract)?),
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data("adminExpirePoints", response)
    }

    async fn admin_get_theme_config(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
    ) -> ConnectorResult<AdminThemeConfig> {
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminSystemGetTheme",
                &CoreExecuteRequest::default(),
            )
            .await?;
        typed_core_data("adminSystemGetTheme", response)
    }

    async fn admin_update_theme_config(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        update: &AdminThemeUpdate,
    ) -> ConnectorResult<AdminThemeConfig> {
        if !update.is_valid() {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminSystemUpdateTheme",
                &CoreExecuteRequest {
                    body: Some(serde_json::to_value(update).map_err(|_| ConnectorError::Contract)?),
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data("adminSystemUpdateTheme", response)
    }

    async fn admin_list_themes(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
    ) -> ConnectorResult<AdminThemeList> {
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminSystemListThemes",
                &CoreExecuteRequest::default(),
            )
            .await?;
        let envelope: ThemeListEnvelope = typed_core_envelope("adminSystemListThemes", response)?;
        Ok(AdminThemeList {
            total: envelope.meta.total.unwrap_or(envelope.data.len() as i64),
            items: envelope.data,
        })
    }

    async fn admin_get_theme(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        theme: &str,
    ) -> ConnectorResult<AdminTheme> {
        if !valid_theme_id(theme) {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        let response = self
            .core_execute(
                base_url,
                request_id,
                access_token,
                "adminSystemDetailTheme",
                &CoreExecuteRequest {
                    path: BTreeMap::from([("theme".to_owned(), theme.to_owned())]),
                    ..Default::default()
                },
            )
            .await?;
        typed_core_data("adminSystemDetailTheme", response)
    }
}

#[derive(Deserialize)]
struct TypedListEnvelope<T> {
    data: Vec<T>,
    pagination: Pagination,
}

#[derive(Deserialize)]
struct ThemeListEnvelope {
    data: Vec<AdminTheme>,
    #[serde(default)]
    meta: ThemeListMeta,
}

#[derive(Default, Deserialize)]
struct ThemeListMeta {
    total: Option<i64>,
}

async fn poll_list_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    query: &AdminPollListQuery,
) -> ConnectorResult<AdminPollList> {
    if !query.is_valid() {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    let response = gateway
        .core_execute(
            base_url,
            request_id,
            access_token,
            operation_id,
            &CoreExecuteRequest {
                query: query_map([
                    ("page", query.page.map(|value| json!(value))),
                    ("per_page", query.per_page.map(|value| json!(value))),
                ]),
                ..Default::default()
            },
        )
        .await?;
    let envelope: TypedListEnvelope<AdminPollSummary> =
        typed_core_envelope(operation_id, response)?;
    Ok(AdminPollList {
        items: envelope.data,
        pagination: envelope.pagination,
    })
}

async fn poll_create_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    create: &AdminPollCreate,
) -> ConnectorResult<AdminPoll> {
    let response = gateway
        .core_execute(
            base_url,
            request_id,
            access_token,
            operation_id,
            &CoreExecuteRequest {
                body: Some(serde_json::to_value(create).map_err(|_| ConnectorError::Contract)?),
                ..Default::default()
            },
        )
        .await?;
    typed_core_data(operation_id, response)
}

async fn poll_detail_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    po_id: i64,
    mut input: CoreExecuteRequest,
) -> ConnectorResult<AdminPoll> {
    if !valid_poll_id(po_id) {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    input.path.insert("po_id".to_owned(), po_id.to_string());
    let response = gateway
        .core_execute(base_url, request_id, access_token, operation_id, &input)
        .await?;
    typed_core_data(operation_id, response)
}

async fn poll_update_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    po_id: i64,
    update: &AdminPollUpdate,
) -> ConnectorResult<AdminPoll> {
    if !update.is_valid() {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    poll_detail_operation(
        gateway,
        base_url,
        request_id,
        access_token,
        operation_id,
        po_id,
        CoreExecuteRequest {
            body: Some(serde_json::to_value(update).map_err(|_| ConnectorError::Contract)?),
            ..Default::default()
        },
    )
    .await
}

async fn poll_delete_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    po_id: i64,
) -> ConnectorResult<()> {
    if !valid_poll_id(po_id) {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    let response = gateway
        .core_execute(
            base_url,
            request_id,
            access_token,
            operation_id,
            &CoreExecuteRequest {
                path: BTreeMap::from([("po_id".to_owned(), po_id.to_string())]),
                confirm_destructive: true,
                ..Default::default()
            },
        )
        .await?;
    typed_core_empty(operation_id, response)
}

async fn popup_list_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    query: &AdminPopupListQuery,
) -> ConnectorResult<AdminPopupList> {
    if !query.is_valid() {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    let response = gateway
        .core_execute(
            base_url,
            request_id,
            access_token,
            operation_id,
            &CoreExecuteRequest {
                query: query_map([
                    ("page", query.page.map(|value| json!(value))),
                    ("per_page", query.per_page.map(|value| json!(value))),
                ]),
                ..Default::default()
            },
        )
        .await?;
    let envelope: TypedListEnvelope<AdminPopup> = typed_core_envelope(operation_id, response)?;
    Ok(AdminPopupList {
        items: envelope.data,
        pagination: envelope.pagination,
    })
}

async fn popup_create_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    create: &AdminPopupCreate,
) -> ConnectorResult<AdminPopup> {
    if !create.is_valid() {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    let response = gateway
        .core_execute(
            base_url,
            request_id,
            access_token,
            operation_id,
            &CoreExecuteRequest {
                body: Some(serde_json::to_value(create).map_err(|_| ConnectorError::Contract)?),
                ..Default::default()
            },
        )
        .await?;
    typed_core_data(operation_id, response)
}

async fn popup_detail_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    nw_id: i64,
    mut input: CoreExecuteRequest,
) -> ConnectorResult<AdminPopup> {
    if !valid_popup_id(nw_id) {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    input.path.insert("nw_id".to_owned(), nw_id.to_string());
    let response = gateway
        .core_execute(base_url, request_id, access_token, operation_id, &input)
        .await?;
    typed_core_data(operation_id, response)
}

async fn popup_update_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    nw_id: i64,
    update: &AdminPopupUpdate,
) -> ConnectorResult<AdminPopup> {
    if !update.is_valid() {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    popup_detail_operation(
        gateway,
        base_url,
        request_id,
        access_token,
        operation_id,
        nw_id,
        CoreExecuteRequest {
            body: Some(serde_json::to_value(update).map_err(|_| ConnectorError::Contract)?),
            ..Default::default()
        },
    )
    .await
}

async fn popup_delete_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    nw_id: i64,
) -> ConnectorResult<()> {
    if !valid_popup_id(nw_id) {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    let response = gateway
        .core_execute(
            base_url,
            request_id,
            access_token,
            operation_id,
            &CoreExecuteRequest {
                path: BTreeMap::from([("nw_id".to_owned(), nw_id.to_string())]),
                confirm_destructive: true,
                ..Default::default()
            },
        )
        .await?;
    typed_core_empty(operation_id, response)
}

async fn point_change_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    change: &AdminPointChange,
) -> ConnectorResult<AdminPointChangeResult> {
    if !change.is_valid() {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    let response = gateway
        .core_execute(
            base_url,
            request_id,
            access_token,
            operation_id,
            &CoreExecuteRequest {
                body: Some(serde_json::to_value(change).map_err(|_| ConnectorError::Contract)?),
                ..Default::default()
            },
        )
        .await?;
    typed_core_data(operation_id, response)
}

async fn board_detail_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    bo_table: &str,
    mut request: CoreExecuteRequest,
) -> ConnectorResult<AdminBoard> {
    if !valid_board_table(bo_table) {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    request.path = BTreeMap::from([("bo_table".to_owned(), bo_table.to_owned())]);
    let response = gateway
        .core_execute(base_url, request_id, access_token, operation_id, &request)
        .await?;
    typed_core_data(operation_id, response)
}

async fn content_detail_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    co_id: &str,
    input: CoreExecuteRequest,
) -> ConnectorResult<AdminContent> {
    if !valid_content_id(co_id) {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    let mut input = input;
    input.path.insert("co_id".to_owned(), co_id.to_owned());
    let response = gateway
        .core_execute(base_url, request_id, access_token, operation_id, &input)
        .await?;
    typed_core_data(operation_id, response)
}

async fn faq_master_detail_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    fm_id: i64,
    mut input: CoreExecuteRequest,
) -> ConnectorResult<AdminFaqMasterDetail> {
    if !valid_faq_id(fm_id) {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    input.path.insert("fm_id".to_owned(), fm_id.to_string());
    let response = gateway
        .core_execute(base_url, request_id, access_token, operation_id, &input)
        .await?;
    typed_core_data(operation_id, response)
}

async fn faq_detail_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    fa_id: i64,
    mut input: CoreExecuteRequest,
) -> ConnectorResult<AdminFaqItem> {
    if !valid_faq_id(fa_id) {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    input.path.insert("fa_id".to_owned(), fa_id.to_string());
    let response = gateway
        .core_execute(base_url, request_id, access_token, operation_id, &input)
        .await?;
    typed_core_data(operation_id, response)
}

async fn menu_detail_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    me_id: i64,
    mut input: CoreExecuteRequest,
) -> ConnectorResult<AdminMenu> {
    if !valid_menu_id(me_id) {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    input.path.insert("me_id".to_owned(), me_id.to_string());
    let response = gateway
        .core_execute(base_url, request_id, access_token, operation_id, &input)
        .await?;
    typed_core_data(operation_id, response)
}

async fn menu_reorder_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    reorder: &AdminMenuReorder,
) -> ConnectorResult<AdminMenuReorderResult> {
    if !reorder.is_valid() {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    let response = gateway
        .core_execute(
            base_url,
            request_id,
            access_token,
            operation_id,
            &CoreExecuteRequest {
                body: Some(serde_json::to_value(reorder).map_err(|_| ConnectorError::Contract)?),
                ..Default::default()
            },
        )
        .await?;
    typed_core_data(operation_id, response)
}

async fn layout_detail_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    page_id: &str,
    mut input: CoreExecuteRequest,
) -> ConnectorResult<AdminLayoutDetail> {
    if !valid_layout_page_id(page_id) {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    input.path.insert("page_id".to_owned(), page_id.to_owned());
    let response = gateway
        .core_execute(base_url, request_id, access_token, operation_id, &input)
        .await?;
    typed_core_data(operation_id, response)
}

async fn layout_reorder_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    page_id: &str,
    reorder: &AdminLayoutWidgetReorder,
) -> ConnectorResult<AdminLayoutDetail> {
    if !reorder.is_valid() {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    layout_detail_operation(
        gateway,
        base_url,
        request_id,
        access_token,
        operation_id,
        page_id,
        CoreExecuteRequest {
            body: Some(serde_json::to_value(reorder).map_err(|_| ConnectorError::Contract)?),
            ..Default::default()
        },
    )
    .await
}

async fn board_group_list_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
) -> ConnectorResult<AdminBoardGroupList> {
    let envelope: TypedListEnvelope<AdminBoardGroup> = typed_core_envelope(
        operation_id,
        gateway
            .core_execute(
                base_url,
                request_id,
                access_token,
                operation_id,
                &CoreExecuteRequest::default(),
            )
            .await?,
    )?;
    Ok(AdminBoardGroupList {
        items: envelope.data,
        pagination: envelope.pagination,
    })
}

async fn board_group_create_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    create: &AdminBoardGroupCreate,
) -> ConnectorResult<AdminBoardGroup> {
    if !create.is_valid() {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    let response = gateway
        .core_execute(
            base_url,
            request_id,
            access_token,
            operation_id,
            &CoreExecuteRequest {
                body: Some(serde_json::to_value(create).map_err(|_| ConnectorError::Contract)?),
                ..Default::default()
            },
        )
        .await?;
    typed_core_data(operation_id, response)
}

async fn board_group_detail_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    gr_id: &str,
    body: Option<Value>,
) -> ConnectorResult<AdminBoardGroup> {
    if !valid_group_id(gr_id) {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    let response = gateway
        .core_execute(
            base_url,
            request_id,
            access_token,
            operation_id,
            &CoreExecuteRequest {
                path: BTreeMap::from([("gr_id".to_owned(), gr_id.to_owned())]),
                body,
                ..Default::default()
            },
        )
        .await?;
    typed_core_data(operation_id, response)
}

async fn board_group_update_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    gr_id: &str,
    update: &AdminBoardGroupUpdate,
) -> ConnectorResult<AdminBoardGroup> {
    if !update.is_valid() {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    board_group_detail_operation(
        gateway,
        base_url,
        request_id,
        access_token,
        operation_id,
        gr_id,
        Some(serde_json::to_value(update).map_err(|_| ConnectorError::Contract)?),
    )
    .await
}

async fn board_group_delete_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    gr_id: &str,
) -> ConnectorResult<()> {
    if !valid_group_id(gr_id) {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    let response = gateway
        .core_execute(
            base_url,
            request_id,
            access_token,
            operation_id,
            &CoreExecuteRequest {
                path: BTreeMap::from([("gr_id".to_owned(), gr_id.to_owned())]),
                confirm_destructive: true,
                ..Default::default()
            },
        )
        .await?;
    typed_core_empty(operation_id, response)
}

async fn board_group_member_list_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    gr_id: &str,
    query: &AdminBoardGroupMemberListQuery,
) -> ConnectorResult<AdminBoardGroupMemberList> {
    if !valid_group_id(gr_id) || !query.is_valid() {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    let response = gateway
        .core_execute(
            base_url,
            request_id,
            access_token,
            operation_id,
            &CoreExecuteRequest {
                path: BTreeMap::from([("gr_id".to_owned(), gr_id.to_owned())]),
                query: query_map([
                    ("page", query.page.map(|value| json!(value))),
                    ("per_page", query.per_page.map(|value| json!(value))),
                    ("search", query.search.as_ref().map(|value| json!(value))),
                ]),
                ..Default::default()
            },
        )
        .await?;
    let envelope: TypedListEnvelope<AdminBoardGroupMember> =
        typed_core_envelope(operation_id, response)?;
    Ok(AdminBoardGroupMemberList {
        items: envelope.data,
        pagination: envelope.pagination,
    })
}

async fn board_group_member_create_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    gr_id: &str,
    create: &AdminBoardGroupMemberCreate,
) -> ConnectorResult<AdminBoardGroupMemberResult> {
    if !valid_group_id(gr_id) || !create.is_valid() {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    let response = gateway
        .core_execute(
            base_url,
            request_id,
            access_token,
            operation_id,
            &CoreExecuteRequest {
                path: BTreeMap::from([("gr_id".to_owned(), gr_id.to_owned())]),
                body: Some(serde_json::to_value(create).map_err(|_| ConnectorError::Contract)?),
                ..Default::default()
            },
        )
        .await?;
    typed_core_data(operation_id, response)
}

async fn board_group_member_delete_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    gr_id: &str,
    mb_id: &str,
) -> ConnectorResult<()> {
    if !valid_group_id(gr_id) || !valid_member_id(mb_id) {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    let response = gateway
        .core_execute(
            base_url,
            request_id,
            access_token,
            operation_id,
            &CoreExecuteRequest {
                path: BTreeMap::from([
                    ("gr_id".to_owned(), gr_id.to_owned()),
                    ("mb_id".to_owned(), mb_id.to_owned()),
                ]),
                confirm_destructive: true,
                ..Default::default()
            },
        )
        .await?;
    typed_core_empty(operation_id, response)
}

fn member_list_from_response(
    operation_id: &str,
    response: CoreExecuteResponse,
) -> ConnectorResult<AdminMemberList> {
    let envelope: TypedListEnvelope<AdminMember> = typed_core_envelope(operation_id, response)?;
    Ok(AdminMemberList {
        items: envelope.data,
        pagination: envelope.pagination,
    })
}

async fn member_operation<T: ConnectorGateway + ?Sized>(
    gateway: &T,
    base_url: &str,
    request_id: &str,
    access_token: &str,
    operation_id: &str,
    mb_id: &str,
    body: Option<Value>,
) -> ConnectorResult<AdminMember> {
    if !valid_member_target(mb_id) {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    let response = gateway
        .core_execute(
            base_url,
            request_id,
            access_token,
            operation_id,
            &CoreExecuteRequest {
                path: BTreeMap::from([("mb_id".to_owned(), mb_id.to_owned())]),
                body,
                ..Default::default()
            },
        )
        .await?;
    typed_core_data(operation_id, response)
}

fn typed_core_data<T: DeserializeOwned>(
    operation_id: &str,
    response: CoreExecuteResponse,
) -> ConnectorResult<T> {
    if response.operation_id != operation_id
        || response.body_base64.is_some()
        || !(200..300).contains(&response.upstream_status)
    {
        return Err(ConnectorError::Contract);
    }
    let data = response
        .data
        .and_then(|value| value.get("data").cloned())
        .ok_or(ConnectorError::Contract)?;
    serde_json::from_value(data).map_err(|_| ConnectorError::Contract)
}

fn typed_core_envelope<T: DeserializeOwned>(
    operation_id: &str,
    response: CoreExecuteResponse,
) -> ConnectorResult<T> {
    if response.operation_id != operation_id
        || response.body_base64.is_some()
        || !(200..300).contains(&response.upstream_status)
    {
        return Err(ConnectorError::Contract);
    }
    serde_json::from_value(response.data.ok_or(ConnectorError::Contract)?)
        .map_err(|_| ConnectorError::Contract)
}

fn typed_core_empty(operation_id: &str, response: CoreExecuteResponse) -> ConnectorResult<()> {
    if response.operation_id != operation_id
        || response.body_base64.is_some()
        || !(200..300).contains(&response.upstream_status)
    {
        return Err(ConnectorError::Contract);
    }
    Ok(())
}

fn validate_page(page: Option<u32>, per_page: Option<u32>) -> ConnectorResult<()> {
    if page.is_some_and(|value| value == 0)
        || per_page.is_some_and(|value| !(1..=100).contains(&value))
    {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    Ok(())
}

fn query_map<const N: usize>(values: [(&str, Option<Value>); N]) -> BTreeMap<String, Value> {
    values
        .into_iter()
        .filter_map(|(name, value)| value.map(|value| (name.to_owned(), value)))
        .collect()
}

#[derive(Clone, Debug, Default)]
pub struct ProductionConnectorGateway;

#[async_trait]
impl ConnectorGateway for ProductionConnectorGateway {
    async fn health(&self, base_url: &str, request_id: &str) -> ConnectorResult<ConnectorHealth> {
        G5Client::connect(base_url).await?.health(request_id).await
    }

    async fn login(
        &self,
        base_url: &str,
        request_id: &str,
        input: &ConnectorLogin,
    ) -> ConnectorResult<ConnectorCredentials> {
        G5Client::connect(base_url)
            .await?
            .login(request_id, input)
            .await
    }

    async fn refresh(
        &self,
        base_url: &str,
        request_id: &str,
        refresh_token: &str,
    ) -> ConnectorResult<ConnectorCredentials> {
        G5Client::connect(base_url)
            .await?
            .refresh(request_id, refresh_token)
            .await
    }

    async fn logout(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        refresh_token: &str,
    ) -> ConnectorResult<()> {
        G5Client::connect(base_url)
            .await?
            .logout(request_id, access_token, refresh_token)
            .await
    }

    async fn basic_config(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
    ) -> ConnectorResult<BasicConfig> {
        G5Client::connect(base_url)
            .await?
            .basic_config(request_id, access_token)
            .await
    }

    async fn update_basic_config(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        cf_10: &str,
    ) -> ConnectorResult<BasicConfig> {
        G5Client::connect(base_url)
            .await?
            .update_basic_config(request_id, access_token, cf_10)
            .await
    }

    async fn core_execute(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        operation_id: &str,
        input: &CoreExecuteRequest,
    ) -> ConnectorResult<CoreExecuteResponse> {
        G5Client::connect(base_url)
            .await?
            .core_execute(request_id, access_token, operation_id, input)
            .await
    }

    async fn admin_get_faq_master_image_content(
        &self,
        base_url: &str,
        request_id: &str,
        fm_id: i64,
        kind: &str,
    ) -> ConnectorResult<FaqImageContent> {
        G5Client::connect(base_url)
            .await?
            .faq_master_image_content(request_id, fm_id, kind)
            .await
    }
}

#[cfg(feature = "local-certification")]
#[derive(Clone, Debug, Default)]
pub struct LocalCertificationConnectorGateway;

#[cfg(feature = "local-certification")]
#[async_trait]
impl ConnectorGateway for LocalCertificationConnectorGateway {
    async fn health(&self, base_url: &str, request_id: &str) -> ConnectorResult<ConnectorHealth> {
        G5Client::connect_local_certification(base_url)
            .await?
            .health(request_id)
            .await
    }

    async fn login(
        &self,
        base_url: &str,
        request_id: &str,
        input: &ConnectorLogin,
    ) -> ConnectorResult<ConnectorCredentials> {
        G5Client::connect_local_certification(base_url)
            .await?
            .login(request_id, input)
            .await
    }

    async fn refresh(
        &self,
        base_url: &str,
        request_id: &str,
        refresh_token: &str,
    ) -> ConnectorResult<ConnectorCredentials> {
        G5Client::connect_local_certification(base_url)
            .await?
            .refresh(request_id, refresh_token)
            .await
    }

    async fn logout(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        refresh_token: &str,
    ) -> ConnectorResult<()> {
        G5Client::connect_local_certification(base_url)
            .await?
            .logout(request_id, access_token, refresh_token)
            .await
    }

    async fn basic_config(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
    ) -> ConnectorResult<BasicConfig> {
        G5Client::connect_local_certification(base_url)
            .await?
            .basic_config(request_id, access_token)
            .await
    }

    async fn update_basic_config(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        cf_10: &str,
    ) -> ConnectorResult<BasicConfig> {
        G5Client::connect_local_certification(base_url)
            .await?
            .update_basic_config(request_id, access_token, cf_10)
            .await
    }

    async fn core_execute(
        &self,
        base_url: &str,
        request_id: &str,
        access_token: &str,
        operation_id: &str,
        input: &CoreExecuteRequest,
    ) -> ConnectorResult<CoreExecuteResponse> {
        G5Client::connect_local_certification(base_url)
            .await?
            .core_execute(request_id, access_token, operation_id, input)
            .await
    }

    async fn admin_get_faq_master_image_content(
        &self,
        base_url: &str,
        request_id: &str,
        fm_id: i64,
        kind: &str,
    ) -> ConnectorResult<FaqImageContent> {
        G5Client::connect_local_certification(base_url)
            .await?
            .faq_master_image_content(request_id, fm_id, kind)
            .await
    }
}

pub fn core_operations() -> &'static [CoreOperationSpec] {
    static REGISTRY: OnceLock<Vec<CoreOperationSpec>> = OnceLock::new();
    REGISTRY
        .get_or_init(|| {
            serde_json::from_str::<CoreRegistry>(CORE_REGISTRY_JSON)
                .expect("tracked Core operation registry must be valid")
                .operations
        })
        .as_slice()
}

pub fn core_operation(operation_id: &str) -> Option<&'static CoreOperationSpec> {
    core_operations()
        .iter()
        .find(|operation| operation.operation_id == operation_id)
}

#[derive(Clone)]
#[cfg_attr(test, allow(dead_code))]
struct G5Client {
    base_url: Url,
    client: reqwest::Client,
    guard: Arc<UrlGuard<SystemResolver>>,
    target: g5_fleet_security::OutboundTarget,
}

impl G5Client {
    async fn connect(raw_base_url: &str) -> ConnectorResult<Self> {
        let base_url = normalize_base_url(raw_base_url)?;
        let guard = Arc::new(UrlGuard::new(SystemResolver));
        let target = guard
            .resolve_initial(base_url.as_str())
            .await
            .map_err(|_| ConnectorError::UrlSecurity)?;
        let address = target
            .pinned_addresses
            .iter()
            .next()
            .copied()
            .ok_or(ConnectorError::UrlSecurity)?;
        let client = build_client(Some((
            target.host.clone(),
            SocketAddr::new(address, target.port),
        )))?;
        Ok(Self {
            base_url,
            client,
            guard,
            target,
        })
    }

    #[cfg(feature = "local-certification")]
    async fn connect_local_certification(raw_base_url: &str) -> ConnectorResult<Self> {
        let base_url = normalize_base_url(raw_base_url)?;
        let guard = Arc::new(UrlGuard::local_certification(SystemResolver));
        let target = guard
            .resolve_initial(base_url.as_str())
            .await
            .map_err(|_| ConnectorError::UrlSecurity)?;
        let address = target
            .pinned_addresses
            .iter()
            .next()
            .copied()
            .ok_or(ConnectorError::UrlSecurity)?;
        let client = build_client(Some((
            target.host.clone(),
            SocketAddr::new(address, target.port),
        )))?;
        Ok(Self {
            base_url,
            client,
            guard,
            target,
        })
    }

    #[cfg(test)]
    fn for_test(raw_base_url: &str) -> ConnectorResult<Self> {
        let base_url = normalize_base_url(raw_base_url)?;
        let target = g5_fleet_security::OutboundTarget {
            url: base_url.clone(),
            host: base_url
                .host_str()
                .ok_or(ConnectorError::UrlSecurity)?
                .to_owned(),
            port: base_url
                .port_or_known_default()
                .ok_or(ConnectorError::UrlSecurity)?,
            pinned_addresses: Default::default(),
        };
        Ok(Self {
            base_url,
            client: build_client(None)?,
            guard: Arc::new(UrlGuard::new(SystemResolver)),
            target,
        })
    }

    #[cfg(test)]
    fn for_test_resolved(raw_base_url: &str, address: SocketAddr) -> ConnectorResult<Self> {
        let base_url = normalize_base_url(raw_base_url)?;
        let host = base_url
            .host_str()
            .ok_or(ConnectorError::UrlSecurity)?
            .to_owned();
        let target = g5_fleet_security::OutboundTarget {
            url: base_url.clone(),
            host: host.clone(),
            port: base_url
                .port_or_known_default()
                .ok_or(ConnectorError::UrlSecurity)?,
            pinned_addresses: Default::default(),
        };
        Ok(Self {
            base_url,
            client: build_client(Some((host, address)))?,
            guard: Arc::new(UrlGuard::new(SystemResolver)),
            target,
        })
    }

    async fn health(&self, request_id: &str) -> ConnectorResult<ConnectorHealth> {
        let envelope: HealthEnvelope = self
            .request(Method::GET, "health", request_id, None, None)
            .await?;
        if envelope.status.is_empty() || envelope.version.is_empty() {
            return Err(ConnectorError::Contract);
        }
        Ok(ConnectorHealth {
            status: envelope.status,
            version: envelope.version,
            timestamp: envelope.timestamp,
        })
    }

    async fn login(
        &self,
        request_id: &str,
        input: &ConnectorLogin,
    ) -> ConnectorResult<ConnectorCredentials> {
        let envelope: DataEnvelope<ConnectorCredentials> = self
            .request(
                Method::POST,
                "auth/login",
                request_id,
                None,
                Some(json!({
                    "mb_id": input.mb_id,
                    "mb_password": input.mb_password,
                })),
            )
            .await?;
        if envelope.data.access_token.is_empty()
            || envelope.data.refresh_token.is_empty()
            || envelope.data.expires_in <= 0
        {
            return Err(ConnectorError::Contract);
        }
        Ok(envelope.data)
    }

    async fn refresh(
        &self,
        request_id: &str,
        refresh_token: &str,
    ) -> ConnectorResult<ConnectorCredentials> {
        let envelope: DataEnvelope<ConnectorCredentials> = self
            .request(
                Method::POST,
                "auth/refresh",
                request_id,
                None,
                Some(json!({"refresh_token": refresh_token})),
            )
            .await?;
        validate_credentials(envelope.data)
    }

    async fn logout(
        &self,
        request_id: &str,
        access_token: &str,
        refresh_token: &str,
    ) -> ConnectorResult<()> {
        let _: Value = self
            .request(
                Method::POST,
                "auth/logout",
                request_id,
                Some(access_token),
                Some(json!({"refresh_token": refresh_token})),
            )
            .await?;
        Ok(())
    }

    async fn basic_config(
        &self,
        request_id: &str,
        access_token: &str,
    ) -> ConnectorResult<BasicConfig> {
        let envelope: DataEnvelope<Map<String, Value>> = self
            .request(
                Method::GET,
                "admin/config",
                request_id,
                Some(access_token),
                None,
            )
            .await?;
        basic_config_from_map(&envelope.data)
    }

    async fn update_basic_config(
        &self,
        request_id: &str,
        access_token: &str,
        cf_10: &str,
    ) -> ConnectorResult<BasicConfig> {
        validate_cf_10(cf_10)?;
        let envelope: DataEnvelope<Map<String, Value>> = self
            .request(
                Method::PUT,
                "admin/config",
                request_id,
                Some(access_token),
                Some(json!({"cf_10": cf_10})),
            )
            .await?;
        basic_config_from_map(&envelope.data)
    }

    async fn core_execute(
        &self,
        request_id: &str,
        access_token: &str,
        operation_id: &str,
        input: &CoreExecuteRequest,
    ) -> ConnectorResult<CoreExecuteResponse> {
        let operation = core_operation(operation_id).ok_or(ConnectorError::UnknownOperation)?;
        if operation.transport != "core_proxy" {
            return Err(ConnectorError::SpecializedOperation);
        }
        if operation.risk == "external_effect" {
            return Err(ConnectorError::ExternalEffectBlocked);
        }
        if operation.risk == "destructive" && !input.confirm_destructive {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        validate_core_request(operation, input)?;
        #[cfg(not(test))]
        self.guard
            .revalidate_before_connect(&self.target)
            .await
            .map_err(|_| ConnectorError::UrlSecurity)?;
        let url = core_url(&self.base_url, operation, input)?;
        let method = Method::from_bytes(operation.method.as_bytes())
            .map_err(|_| ConnectorError::InvalidCoreRequest)?;
        let mut request = self
            .client
            .request(method, url)
            .header("accept", "application/json, application/octet-stream;q=0.5")
            .header("x-request-id", request_id)
            .bearer_auth(access_token);
        if let Some(body) = input.body.as_ref() {
            if operation
                .request_media_types
                .iter()
                .any(|value| value == "multipart/form-data")
            {
                request = request.multipart(multipart_form(body)?);
            } else if operation
                .request_media_types
                .iter()
                .any(|value| value == "application/x-www-form-urlencoded")
            {
                request = request.form(body);
            } else {
                request = request.json(body);
            }
        }
        let response = request
            .send()
            .await
            .map_err(|_| ConnectorError::Transport)?;
        let status = response.status();
        if !status.is_success() {
            return Err(ConnectorError::Http(status.as_u16()));
        }
        let content_type = response
            .headers()
            .get(CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned);
        let bytes = response
            .bytes()
            .await
            .map_err(|_| ConnectorError::Transport)?;
        if bytes.len() > MAX_CORE_RESPONSE_BYTES {
            return Err(ConnectorError::ResponseTooLarge);
        }
        let is_json = content_type
            .as_deref()
            .is_some_and(|value| value.starts_with("application/json") || value.contains("+json"));
        let (data, body_base64) = if is_json || bytes.is_empty() {
            let data = if bytes.is_empty() {
                Some(Value::Null)
            } else {
                Some(serde_json::from_slice(&bytes).map_err(|_| ConnectorError::Contract)?)
            };
            (data, None)
        } else {
            (None, Some(BASE64.encode(bytes)))
        };
        Ok(CoreExecuteResponse {
            operation_id: operation.operation_id.clone(),
            upstream_status: status.as_u16(),
            content_type,
            data,
            body_base64,
        })
    }

    async fn faq_master_image_content(
        &self,
        request_id: &str,
        fm_id: i64,
        kind: &str,
    ) -> ConnectorResult<FaqImageContent> {
        let suffix = match kind {
            "header" => "h",
            "footer" => "t",
            _ => return Err(ConnectorError::InvalidCoreRequest),
        };
        if fm_id < 1 {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        #[cfg(not(test))]
        self.guard
            .revalidate_before_connect(&self.target)
            .await
            .map_err(|_| ConnectorError::UrlSecurity)?;
        let url = self
            .base_url
            .join(&format!("../../data/faq/{fm_id}_{suffix}"))
            .map_err(|_| ConnectorError::UrlSecurity)?;
        let response = self
            .client
            .get(url)
            .header("accept", "image/png, image/jpeg, image/gif")
            .header("x-request-id", request_id)
            .send()
            .await
            .map_err(|_| ConnectorError::Transport)?;
        let status = response.status();
        if !status.is_success() {
            return Err(ConnectorError::Http(status.as_u16()));
        }
        let bytes = response
            .bytes()
            .await
            .map_err(|_| ConnectorError::Transport)?;
        if bytes.is_empty() || bytes.len() > MAX_CORE_RESPONSE_BYTES {
            return Err(ConnectorError::ResponseTooLarge);
        }
        Ok(FaqImageContent {
            bytes: bytes.to_vec(),
        })
    }

    async fn request<T: DeserializeOwned>(
        &self,
        method: Method,
        relative: &str,
        request_id: &str,
        access_token: Option<&str>,
        body: Option<Value>,
    ) -> ConnectorResult<T> {
        #[cfg(not(test))]
        self.guard
            .revalidate_before_connect(&self.target)
            .await
            .map_err(|_| ConnectorError::UrlSecurity)?;
        let url = self
            .base_url
            .join(relative)
            .map_err(|_| ConnectorError::UrlSecurity)?;
        let mut request = self
            .client
            .request(method, url)
            .header("accept", "application/json")
            .header("x-request-id", request_id);
        if let Some(token) = access_token {
            request = request.bearer_auth(token);
        }
        if let Some(body) = body {
            request = request.json(&body);
        }
        let response = request
            .send()
            .await
            .map_err(|_| ConnectorError::Transport)?;
        let status = response.status();
        if !status.is_success() {
            return Err(ConnectorError::Http(status.as_u16()));
        }
        response.json().await.map_err(|_| ConnectorError::Contract)
    }
}

#[derive(Debug, Deserialize)]
struct HealthEnvelope {
    status: String,
    version: String,
    timestamp: i64,
}

#[derive(Debug, Deserialize)]
struct DataEnvelope<T> {
    data: T,
}

fn normalize_base_url(raw: &str) -> ConnectorResult<Url> {
    let mut url = Url::parse(raw).map_err(|_| ConnectorError::UrlSecurity)?;
    if !matches!(url.scheme(), "http" | "https")
        || url.host().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.fragment().is_some()
    {
        return Err(ConnectorError::UrlSecurity);
    }
    let path = url.path().trim_end_matches('/');
    let normalized_path = if path.ends_with("/api/v1") {
        format!("{path}/")
    } else {
        format!("{path}/api/v1/")
    };
    url.set_path(&normalized_path);
    url.set_query(None);
    Ok(url)
}

fn build_client(resolve: Option<(String, SocketAddr)>) -> ConnectorResult<reqwest::Client> {
    let mut builder = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(3))
        .timeout(Duration::from_secs(10))
        .redirect(Policy::none());
    if let Some((host, address)) = resolve {
        builder = builder.resolve(&host, address);
    }
    builder.build().map_err(|_| ConnectorError::Transport)
}

fn basic_config_from_map(data: &Map<String, Value>) -> ConnectorResult<BasicConfig> {
    Ok(BasicConfig {
        cf_title: optional_string(data, "cf_title")?,
        cf_admin: optional_string(data, "cf_admin")?,
        cf_10: optional_string(data, "cf_10")?,
    })
}

fn optional_string(data: &Map<String, Value>, key: &str) -> ConnectorResult<Option<String>> {
    match data.get(key) {
        None | Some(Value::Null) => Ok(None),
        Some(Value::String(value)) => Ok(Some(value.clone())),
        _ => Err(ConnectorError::Contract),
    }
}

fn validate_cf_10(value: &str) -> ConnectorResult<()> {
    if value.len() <= 255 && !value.chars().any(char::is_control) {
        Ok(())
    } else {
        Err(ConnectorError::InvalidConfigValue)
    }
}

fn validate_credentials(
    credentials: ConnectorCredentials,
) -> ConnectorResult<ConnectorCredentials> {
    if credentials.access_token.is_empty()
        || credentials.refresh_token.is_empty()
        || credentials.expires_in <= 0
    {
        Err(ConnectorError::Contract)
    } else {
        Ok(credentials)
    }
}

fn validate_core_request(
    operation: &CoreOperationSpec,
    input: &CoreExecuteRequest,
) -> ConnectorResult<()> {
    let path_names = operation
        .parameters
        .iter()
        .filter(|parameter| parameter.location == "path")
        .map(|parameter| parameter.name.as_str())
        .collect::<BTreeSet<_>>();
    let query_names = operation
        .parameters
        .iter()
        .filter(|parameter| parameter.location == "query")
        .map(|parameter| parameter.name.as_str())
        .collect::<BTreeSet<_>>();
    if input
        .path
        .keys()
        .any(|name| !path_names.contains(name.as_str()))
        || input
            .query
            .keys()
            .any(|name| !query_names.contains(name.as_str()))
    {
        return Err(ConnectorError::InvalidCoreRequest);
    }
    for parameter in operation.parameters.iter().filter(|value| value.required) {
        let present = match parameter.location.as_str() {
            "path" => input
                .path
                .get(&parameter.name)
                .is_some_and(|value| !value.is_empty()),
            "query" => input.query.contains_key(&parameter.name),
            _ => false,
        };
        if !present {
            return Err(ConnectorError::InvalidCoreRequest);
        }
    }
    match input.body.as_ref() {
        Some(Value::Object(body)) => {
            let fields = operation
                .request_fields
                .iter()
                .map(String::as_str)
                .collect::<BTreeSet<_>>();
            if body.keys().any(|name| !fields.contains(name.as_str())) {
                return Err(ConnectorError::InvalidCoreRequest);
            }
            let required_fields_missing = operation
                .request_required_fields
                .iter()
                .any(|name| !body.contains_key(name));
            if required_fields_missing {
                return Err(ConnectorError::InvalidCoreRequest);
            }
            if !operation.request_required_alternatives.is_empty()
                && !operation
                    .request_required_alternatives
                    .iter()
                    .all(|constraint| {
                        constraint
                            .iter()
                            .any(|group| group.iter().all(|name| body.contains_key(name)))
                    })
            {
                return Err(ConnectorError::InvalidCoreRequest);
            }
        }
        Some(_) => return Err(ConnectorError::InvalidCoreRequest),
        None if operation.request_body_required => {
            return Err(ConnectorError::InvalidCoreRequest);
        }
        None => {}
    }
    Ok(())
}

#[cfg(test)]
fn is_mysql_datetime(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() == 19
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && bytes[10] == b' '
        && bytes[13] == b':'
        && bytes[16] == b':'
        && bytes
            .iter()
            .enumerate()
            .all(|(index, value)| matches!(index, 4 | 7 | 10 | 13 | 16) || value.is_ascii_digit())
}

fn core_url(
    base_url: &Url,
    operation: &CoreOperationSpec,
    input: &CoreExecuteRequest,
) -> ConnectorResult<Url> {
    let mut url = base_url.clone();
    {
        let mut segments = url
            .path_segments_mut()
            .map_err(|_| ConnectorError::InvalidCoreRequest)?;
        segments.pop_if_empty();
        for segment in operation.path.trim_start_matches('/').split('/') {
            if let Some(name) = segment
                .strip_prefix('{')
                .and_then(|value| value.strip_suffix('}'))
            {
                segments.push(
                    input
                        .path
                        .get(name)
                        .ok_or(ConnectorError::InvalidCoreRequest)?,
                );
            } else {
                segments.push(segment);
            }
        }
    }
    {
        let mut query = url.query_pairs_mut();
        for (name, value) in &input.query {
            match value {
                Value::Array(values) => {
                    for value in values {
                        query.append_pair(name, &query_value(value)?);
                    }
                }
                value => {
                    query.append_pair(name, &query_value(value)?);
                }
            }
        }
    }
    Ok(url)
}

fn query_value(value: &Value) -> ConnectorResult<String> {
    match value {
        Value::String(value) => Ok(value.clone()),
        Value::Number(value) => Ok(value.to_string()),
        Value::Bool(value) => Ok(value.to_string()),
        Value::Null => Ok(String::new()),
        _ => Err(ConnectorError::InvalidCoreRequest),
    }
}

fn multipart_form(body: &Value) -> ConnectorResult<Form> {
    let fields = body.as_object().ok_or(ConnectorError::InvalidCoreRequest)?;
    let mut form = Form::new();
    for (name, value) in fields {
        if let Some(file) = value.as_object().and_then(|value| value.get("$file")) {
            let file = file.as_object().ok_or(ConnectorError::InvalidCoreRequest)?;
            let filename = file
                .get("filename")
                .and_then(Value::as_str)
                .ok_or(ConnectorError::InvalidCoreRequest)?;
            let encoded = file
                .get("base64")
                .and_then(Value::as_str)
                .ok_or(ConnectorError::InvalidCoreRequest)?;
            let bytes = BASE64
                .decode(encoded)
                .map_err(|_| ConnectorError::InvalidCoreRequest)?;
            if bytes.len() > MAX_CORE_UPLOAD_BYTES {
                return Err(ConnectorError::InvalidCoreRequest);
            }
            let mut part = Part::bytes(bytes).file_name(filename.to_owned());
            if let Some(content_type) = file.get("content_type").and_then(Value::as_str) {
                part = part
                    .mime_str(content_type)
                    .map_err(|_| ConnectorError::InvalidCoreRequest)?;
            }
            form = form.part(name.clone(), part);
        } else {
            form = form.text(name.clone(), query_value(value)?);
        }
    }
    Ok(form)
}

#[cfg(test)]
mod tests {
    use std::{
        collections::BTreeMap,
        net::{IpAddr, Ipv4Addr, SocketAddr},
        sync::{Arc, Mutex},
    };

    use axum::{
        Json, Router,
        extract::State,
        http::{HeaderMap, StatusCode},
        routing::{get, post},
    };
    use serde_json::{Value, json};
    use tokio::{
        io::{AsyncReadExt, AsyncWriteExt},
        net::TcpListener,
    };

    use super::{
        ConnectorError, ConnectorLogin, CoreExecuteRequest, G5Client, HealthEnvelope,
        core_operation, core_operations, is_mysql_datetime, normalize_base_url,
        validate_core_request,
    };

    #[test]
    fn resolve_constructor_rejects_invalid_url() {
        assert!(matches!(
            normalize_base_url("://invalid"),
            Err(ConnectorError::UrlSecurity)
        ));
    }

    #[test]
    fn resolve_constructor_rejects_url_without_host() {
        assert!(matches!(
            normalize_base_url("file:///tmp/gnuboard5"),
            Err(ConnectorError::UrlSecurity)
        ));
    }

    #[tokio::test]
    async fn resolve_constructor_routes_hostname_to_supplied_socket() {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0))
            .await
            .expect("bind");
        let address = listener.local_addr().expect("address");
        let server = tokio::spawn(async move {
            let (mut stream, _) = listener.accept().await.expect("accept");
            let mut request = Vec::new();
            let mut buffer = [0_u8; 1024];
            loop {
                let read = stream.read(&mut buffer).await.expect("read");
                if read == 0 {
                    break;
                }
                request.extend_from_slice(&buffer[..read]);
                if request.windows(4).any(|window| window == b"\r\n\r\n") {
                    break;
                }
            }
            assert!(request.starts_with(b"GET /api/v1/health HTTP/1.1\r\n"));
            let body = r#"{"status":"ok","version":"test","timestamp":1}"#;
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                body.len(),
                body
            );
            stream.write_all(response.as_bytes()).await.expect("write");
        });
        let socket = SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), address.port());
        let client = G5Client::for_test_resolved(
            &format!("http://g5-resolve.invalid:{}", address.port()),
            socket,
        )
        .expect("client");
        assert_eq!(
            client.health("resolve-test").await.expect("health").status,
            "ok"
        );
        server.await.expect("server");
    }

    #[test]
    fn request_validator_rejects_missing_required_board_fields() {
        let operation = core_operation("adminCreateBoard").expect("operation");
        let request = CoreExecuteRequest {
            body: Some(json!({"bo_table":"notice"})),
            ..Default::default()
        };
        assert!(matches!(
            validate_core_request(operation, &request),
            Err(ConnectorError::InvalidCoreRequest)
        ));
    }

    #[test]
    fn request_validator_accepts_exact_system_mail_payload() {
        let operation = core_operation("adminSystemSendMemberMail").expect("operation");
        let request = CoreExecuteRequest {
            body: Some(json!({
                "ma_id":1,
                "mb_ids":["admin"],
                "subject":"subject",
                "content":"content"
            })),
            ..Default::default()
        };
        validate_core_request(operation, &request).expect("exact mail payload");
    }

    #[test]
    fn request_validator_treats_optional_null_query_as_omitted() {
        let operation = core_operation("adminListMembers").expect("operation");
        let request = CoreExecuteRequest {
            query: BTreeMap::from([
                ("page".into(), json!(1)),
                ("per_page".into(), json!(20)),
                ("search".into(), Value::Null),
                ("search_field".into(), Value::Null),
            ]),
            ..Default::default()
        };
        validate_core_request(operation, &request).expect("optional null query");
    }

    #[test]
    fn request_validator_accepts_one_multipart_file_alias() {
        let operation = core_operation("adminUploadMemberIcon").expect("operation");
        let request = CoreExecuteRequest {
            path: BTreeMap::from([("mb_id".into(), "fleetcert".into())]),
            body: Some(json!({
                "file": {
                    "$file": {
                        "filename": "icon.png",
                        "content_type": "image/png",
                        "base64": "AA=="
                    }
                }
            })),
            ..Default::default()
        };
        validate_core_request(operation, &request).expect("one multipart alias");

        let missing = CoreExecuteRequest {
            path: request.path.clone(),
            body: Some(json!({})),
            ..Default::default()
        };
        assert!(matches!(
            validate_core_request(operation, &missing),
            Err(ConnectorError::InvalidCoreRequest)
        ));
    }

    #[test]
    fn request_validator_enforces_poll_required_alternatives() {
        let operation = core_operation("adminCreatePoll").expect("operation");
        for body in [
            json!({"po_subject": "poll", "options": ["one", "two"]}),
            json!({"po_subject": "poll", "po_poll1": "one", "po_poll2": "two"}),
        ] {
            validate_core_request(
                operation,
                &CoreExecuteRequest {
                    body: Some(body),
                    ..Default::default()
                },
            )
            .expect("valid poll alternative");
        }

        let missing = CoreExecuteRequest {
            body: Some(json!({"po_subject": "poll"})),
            ..Default::default()
        };
        assert!(matches!(
            validate_core_request(operation, &missing),
            Err(ConnectorError::InvalidCoreRequest)
        ));
    }

    #[test]
    fn response_validator_rejects_wrong_required_field_type() {
        let result = serde_json::from_value::<HealthEnvelope>(json!({
            "status":"ok",
            "version":"1",
            "timestamp":"not-an-integer"
        }));
        assert!(result.is_err());
    }

    #[test]
    fn response_validator_accepts_runtime_mysql_mail_datetime() {
        assert!(is_mysql_datetime("2026-07-22 10:36:17"));
        assert!(!is_mysql_datetime("2026/07/22"));
    }

    #[test]
    fn response_validator_rejects_malformed_rfc7807_error() {
        let result = serde_json::from_value::<g5_fleet_core::ProblemDetails>(json!({
            "type":"about:blank",
            "status":500,
            "title":"broken"
        }));
        assert!(result.is_err());
    }

    #[derive(Clone)]
    struct MockState {
        cf_10: Arc<Mutex<String>>,
    }

    #[tokio::test]
    async fn canonical_health_login_config_update_readback_and_rollback() {
        let state = MockState {
            cf_10: Arc::new(Mutex::new("baseline".to_owned())),
        };
        let app = Router::new()
            .route("/api/v1/health", get(health))
            .route("/api/v1/auth/login", post(login))
            .route("/api/v1/auth/refresh", post(refresh))
            .route("/api/v1/auth/logout", post(logout))
            .route("/api/v1/admin/config", get(config_get).put(config_put))
            .route("/api/v1/admin/members", get(member_list))
            .route("/data/faq/7_h", get(faq_header_image))
            .with_state(state);
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });

        let client = G5Client::for_test(&format!("http://{address}")).unwrap();
        let health = client.health("req-health").await.unwrap();
        assert_eq!(health.status, "ok");
        let image = client
            .faq_master_image_content("req-faq-image", 7, "header")
            .await
            .unwrap();
        assert_eq!(
            image.bytes,
            vec![0x89, b'P', b'N', b'G', 0x0d, 0x0a, 0x1a, 0x0a]
        );
        let credentials = client
            .login(
                "req-login",
                &ConnectorLogin {
                    mb_id: "admin".to_owned(),
                    mb_password: "password".to_owned(),
                },
            )
            .await
            .unwrap();
        let baseline = client
            .basic_config("req-get", &credentials.access_token)
            .await
            .unwrap();
        assert_eq!(baseline.cf_10.as_deref(), Some("baseline"));
        client
            .update_basic_config("req-put", &credentials.access_token, "sentinel")
            .await
            .unwrap();
        assert_eq!(
            client
                .basic_config("req-readback", &credentials.access_token)
                .await
                .unwrap()
                .cf_10
                .as_deref(),
            Some("sentinel")
        );
        client
            .update_basic_config("req-rollback", &credentials.access_token, "baseline")
            .await
            .unwrap();
        assert_eq!(
            client
                .basic_config("req-rollback-readback", &credentials.access_token)
                .await
                .unwrap()
                .cf_10
                .as_deref(),
            Some("baseline")
        );

        assert_eq!(core_operations().len(), 189);
        assert!(
            core_operations()
                .iter()
                .all(|operation| !operation.path.starts_with("/admin/shop/"))
        );
        let core_baseline = client
            .core_execute(
                "req-core-config-get",
                &credentials.access_token,
                "adminGetConfig",
                &CoreExecuteRequest::default(),
            )
            .await
            .unwrap();
        assert_eq!(
            core_baseline.data.as_ref().unwrap()["data"]["cf_10"],
            "baseline"
        );
        client
            .core_execute(
                "req-core-config-put",
                &credentials.access_token,
                "adminUpdateConfig",
                &CoreExecuteRequest {
                    body: Some(json!({"cf_10":"core-sentinel"})),
                    ..Default::default()
                },
            )
            .await
            .unwrap();
        assert_eq!(
            client
                .core_execute(
                    "req-core-config-readback",
                    &credentials.access_token,
                    "adminGetConfig",
                    &CoreExecuteRequest::default(),
                )
                .await
                .unwrap()
                .data
                .unwrap()["data"]["cf_10"],
            "core-sentinel"
        );
        client
            .core_execute(
                "req-core-config-rollback",
                &credentials.access_token,
                "adminUpdateConfig",
                &CoreExecuteRequest {
                    body: Some(json!({"cf_10":"baseline"})),
                    ..Default::default()
                },
            )
            .await
            .unwrap();
        let members = client
            .core_execute(
                "req-core",
                &credentials.access_token,
                "adminListMembers",
                &CoreExecuteRequest {
                    query: BTreeMap::from([("page".to_owned(), json!("1"))]),
                    ..Default::default()
                },
            )
            .await
            .unwrap();
        assert_eq!(members.upstream_status, 200);
        assert_eq!(members.data.unwrap()["data"][0]["mb_id"], "admin");
        assert!(matches!(
            client
                .core_execute(
                    "req-external",
                    &credentials.access_token,
                    "adminSendPush",
                    &CoreExecuteRequest::default(),
                )
                .await,
            Err(ConnectorError::ExternalEffectBlocked)
        ));
        let refreshed = client
            .refresh("req-refresh", &credentials.refresh_token)
            .await
            .unwrap();
        assert_eq!(refreshed.access_token, "access-jwt-refreshed");
        client
            .logout(
                "req-logout",
                &refreshed.access_token,
                &refreshed.refresh_token,
            )
            .await
            .unwrap();
    }

    async fn health() -> Json<Value> {
        Json(json!({
            "status":"ok",
            "version":"test",
            "timestamp":1,
            "meta":{"request_id":"server"}
        }))
    }

    async fn faq_header_image() -> ([(&'static str, &'static str); 1], Vec<u8>) {
        (
            [("content-type", "image/png")],
            vec![0x89, b'P', b'N', b'G', 0x0d, 0x0a, 0x1a, 0x0a],
        )
    }

    async fn login(Json(body): Json<Value>) -> (StatusCode, Json<Value>) {
        assert_eq!(body["mb_id"], "admin");
        assert_eq!(body["mb_password"], "password");
        (
            StatusCode::OK,
            Json(json!({
                "data":{"access_token":"access-jwt","refresh_token":"refresh-jwt","expires_in":3600},
                "meta":{"request_id":"server"}
            })),
        )
    }

    async fn refresh(Json(body): Json<Value>) -> Json<Value> {
        assert_eq!(body["refresh_token"], "refresh-jwt");
        Json(json!({
            "data":{
                "access_token":"access-jwt-refreshed",
                "refresh_token":"refresh-jwt-refreshed",
                "expires_in":3600
            },
            "meta":{}
        }))
    }

    async fn logout(headers: HeaderMap, Json(body): Json<Value>) -> Json<Value> {
        assert_eq!(headers["authorization"], "Bearer access-jwt-refreshed");
        assert_eq!(body["refresh_token"], "refresh-jwt-refreshed");
        Json(json!({"data":{"revoked":true},"meta":{}}))
    }

    async fn config_get(State(state): State<MockState>, headers: HeaderMap) -> Json<Value> {
        assert_eq!(headers["authorization"], "Bearer access-jwt");
        let value = state.cf_10.lock().unwrap().clone();
        Json(json!({"data":{"cf_title":"Test","cf_admin":"admin","cf_10":value},"meta":{}}))
    }

    async fn config_put(
        State(state): State<MockState>,
        headers: HeaderMap,
        Json(body): Json<Value>,
    ) -> Json<Value> {
        assert_eq!(headers["authorization"], "Bearer access-jwt");
        *state.cf_10.lock().unwrap() = body["cf_10"].as_str().unwrap().to_owned();
        config_get(State(state), headers).await
    }

    async fn member_list(
        headers: HeaderMap,
        axum::extract::Query(query): axum::extract::Query<BTreeMap<String, String>>,
    ) -> Json<Value> {
        assert_eq!(headers["authorization"], "Bearer access-jwt");
        assert_eq!(query.get("page").map(String::as_str), Some("1"));
        Json(json!({"data":[{"mb_id":"admin"}],"meta":{}}))
    }
}
