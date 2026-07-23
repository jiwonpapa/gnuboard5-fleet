use crate::models::dashboard::{
    AdminDashboardData, AdminDashboardMemberSummary, AdminDashboardPointSummary,
    AdminDashboardPostSummary, AdminDashboardRecentMember, AdminDashboardRecentPoint,
    AdminDashboardRecentPost, AdminDashboardResponse, AdminDashboardSummary,
};
use crate::models::poll::{
    AdminPoll, AdminPollCreateInput, AdminPollDeleteInput, AdminPollDetailResponse,
    AdminPollListQuery, AdminPollListResponse, AdminPollUpdateInput,
};
use crate::models::popular::{
    AdminPopularItem, AdminPopularListQuery, AdminPopularListResponse, AdminPopularRankItem,
    AdminPopularRankQuery, AdminPopularRankResponse, AdminPopularResetInput,
    AdminPopularResetResponse, AdminPopularResetResult,
};
use crate::models::popup::{
    AdminPopup, AdminPopupCreateInput, AdminPopupDeleteInput, AdminPopupDetailResponse,
    AdminPopupListQuery, AdminPopupListResponse, AdminPopupUpdateInput,
};
use crate::models::push::{
    AdminPushMessageInput, AdminPushMessageResponse, AdminPushMessageResult,
};
use crate::models::qa::{
    AdminQaBulkDeleteInput, AdminQaBulkDeleteResponse, AdminQaBulkDeleteResult,
};
use crate::models::qa_config::{AdminQaConfig, AdminQaConfigResponse, AdminQaConfigUpdateInput};
use crate::models::report::{
    AdminReportDetailResponse, AdminReportItem, AdminReportListQuery, AdminReportListResponse,
    AdminReportStats, AdminReportStatsResponse, AdminReportUpdateInput,
};
use crate::models::schema::{
    AdminFieldDefaultValue, AdminFieldOption, AdminFieldOptionSource, AdminFieldSchema,
    AdminSchemaCatalog, AdminSchemaCatalogResponse, AdminSchemaDetail, AdminSchemaDetailResponse,
    AdminSchemaDomainSummary, AdminSchemaLayout, AdminSchemaSection,
};
use crate::models::sftp_transfer::{
    SftpTransferConcurrencyInput, SftpTransferDirection, SftpTransferEnqueueInput,
    SftpTransferEnqueueItemInput, SftpTransferItemControlInput, SftpTransferItemStatus,
    SftpTransferQueueItem, SftpTransferQueueSnapshot, SftpTransferSnapshotInput,
};
use crate::models::trace::ApiTraceMeta;
use crate::models::visit::{
    AdminVisitDeleteInput, AdminVisitDeleteResponse, AdminVisitDeleteResult, AdminVisitLogItem,
    AdminVisitSearchQuery, AdminVisitSearchResponse, AdminVisitStatItem, AdminVisitStatsQuery,
    AdminVisitStatsResponse, AdminVisitStatsSummary,
};
use crate::models::write_count::{
    AdminWriteCountItem, AdminWriteCountStatsQuery, AdminWriteCountStatsResponse,
    AdminWriteCountSummary,
};
use std::error::Error;
use ts_rs::{Config, TS};

pub(super) fn export(config: &Config) -> Result<(), Box<dyn Error>> {
    AdminPopularListQuery::export(config)?;
    AdminPopularItem::export(config)?;
    AdminPopularListResponse::export(config)?;
    AdminPopularResetInput::export(config)?;
    AdminPopularResetResult::export(config)?;
    AdminPopularResetResponse::export(config)?;
    AdminPopularRankQuery::export(config)?;
    AdminPopularRankItem::export(config)?;
    AdminPopularRankResponse::export(config)?;
    AdminPollListQuery::export(config)?;
    AdminPoll::export(config)?;
    AdminPollListResponse::export(config)?;
    AdminPollDetailResponse::export(config)?;
    AdminPollCreateInput::export(config)?;
    AdminPollUpdateInput::export(config)?;
    AdminPollDeleteInput::export(config)?;
    AdminPopupListQuery::export(config)?;
    AdminPopup::export(config)?;
    AdminPopupListResponse::export(config)?;
    AdminPopupDetailResponse::export(config)?;
    AdminPopupCreateInput::export(config)?;
    AdminPopupUpdateInput::export(config)?;
    AdminPopupDeleteInput::export(config)?;
    AdminPushMessageInput::export(config)?;
    AdminPushMessageResult::export(config)?;
    AdminPushMessageResponse::export(config)?;
    AdminQaBulkDeleteInput::export(config)?;
    AdminQaBulkDeleteResult::export(config)?;
    AdminQaBulkDeleteResponse::export(config)?;
    AdminQaConfig::export(config)?;
    AdminQaConfigResponse::export(config)?;
    AdminQaConfigUpdateInput::export(config)?;
    ApiTraceMeta::export(config)?;
    AdminDashboardMemberSummary::export(config)?;
    AdminDashboardPostSummary::export(config)?;
    AdminDashboardPointSummary::export(config)?;
    AdminDashboardSummary::export(config)?;
    AdminDashboardRecentMember::export(config)?;
    AdminDashboardRecentPost::export(config)?;
    AdminDashboardRecentPoint::export(config)?;
    AdminDashboardData::export(config)?;
    AdminDashboardResponse::export(config)?;
    AdminReportListQuery::export(config)?;
    AdminReportItem::export(config)?;
    AdminReportListResponse::export(config)?;
    AdminReportDetailResponse::export(config)?;
    AdminReportStats::export(config)?;
    AdminReportStatsResponse::export(config)?;
    AdminReportUpdateInput::export(config)?;
    AdminFieldDefaultValue::export(config)?;
    AdminFieldOption::export(config)?;
    AdminFieldOptionSource::export(config)?;
    AdminFieldSchema::export(config)?;
    AdminSchemaLayout::export(config)?;
    AdminSchemaSection::export(config)?;
    AdminSchemaDomainSummary::export(config)?;
    AdminSchemaCatalog::export(config)?;
    AdminSchemaDetail::export(config)?;
    AdminSchemaCatalogResponse::export(config)?;
    AdminSchemaDetailResponse::export(config)?;
    SftpTransferDirection::export(config)?;
    SftpTransferItemStatus::export(config)?;
    SftpTransferEnqueueItemInput::export(config)?;
    SftpTransferEnqueueInput::export(config)?;
    SftpTransferSnapshotInput::export(config)?;
    SftpTransferItemControlInput::export(config)?;
    SftpTransferConcurrencyInput::export(config)?;
    SftpTransferQueueItem::export(config)?;
    SftpTransferQueueSnapshot::export(config)?;
    AdminVisitStatsQuery::export(config)?;
    AdminVisitStatsSummary::export(config)?;
    AdminVisitStatItem::export(config)?;
    AdminVisitStatsResponse::export(config)?;
    AdminVisitSearchQuery::export(config)?;
    AdminVisitLogItem::export(config)?;
    AdminVisitSearchResponse::export(config)?;
    AdminVisitDeleteInput::export(config)?;
    AdminVisitDeleteResult::export(config)?;
    AdminVisitDeleteResponse::export(config)?;
    AdminWriteCountStatsQuery::export(config)?;
    AdminWriteCountItem::export(config)?;
    AdminWriteCountSummary::export(config)?;
    AdminWriteCountStatsResponse::export(config)?;
    Ok(())
}
