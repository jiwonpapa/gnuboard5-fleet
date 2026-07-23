use crate::models::mail::{
    AdminMailDetail, AdminMailDetailResponse, AdminMailLastOption, AdminMailListQuery,
    AdminMailListResponse, AdminMailRecipient, AdminMailRecipientListResponse,
    AdminMailRecipientQuery, AdminMailSendInput, AdminMailSendResponse, AdminMailSendResult,
    AdminMailSendTarget, AdminMailTemplate, AdminMailTemplateCreateInput,
    AdminMailTemplateDeleteInput, AdminMailTemplateUpdateInput, AdminSystemMailListQuery,
    AdminSystemMailRecipient, AdminSystemMailRecipientListResponse, AdminSystemMailRecipientQuery,
    AdminSystemMailSendRecipient, AdminSystemMailSendRequest, AdminSystemMailSendResponse,
    AdminSystemMailSendResult, AdminSystemMailTemplate, AdminSystemMailTemplateListResponse,
};
use crate::models::mail_test::{AdminMailTestInput, AdminMailTestResponse, AdminMailTestResult};
use crate::models::sms::{
    AdminSmsConfig, AdminSmsConfigResponse, AdminSmsConfigUpdateInput, AdminSmsMemberSyncResponse,
    AdminSmsMemberSyncResult, AdminSmsMemberSyncSummary,
};
use crate::models::sms_contact::{
    AdminSmsContactBatchInput, AdminSmsContactBatchResponse, AdminSmsContactBatchResult,
    AdminSmsContactCreateInput, AdminSmsContactDeleteInput, AdminSmsContactDetailResponse,
    AdminSmsContactExportItem, AdminSmsContactExportQuery, AdminSmsContactExportResponse,
    AdminSmsContactGroup, AdminSmsContactGroupClearResponse, AdminSmsContactGroupClearResult,
    AdminSmsContactGroupCreateInput, AdminSmsContactGroupDeleteInput,
    AdminSmsContactGroupDetailResponse, AdminSmsContactGroupListResponse,
    AdminSmsContactGroupMoveInput, AdminSmsContactGroupMoveResponse,
    AdminSmsContactGroupMoveResult, AdminSmsContactGroupUpdateInput, AdminSmsContactImportInput,
    AdminSmsContactImportResponse, AdminSmsContactImportResult, AdminSmsContactItem,
    AdminSmsContactListQuery, AdminSmsContactListResponse, AdminSmsContactSummary,
    AdminSmsContactUpdateInput, AdminSmsImportContactRow,
};
use crate::models::sms_history::{
    AdminSmsBatchResendInput, AdminSmsDeliveryItem, AdminSmsDeliveryListQuery,
    AdminSmsDeliveryListResponse, AdminSmsDuplicateSummary, AdminSmsMessageBatchDetail,
    AdminSmsMessageBatchDetailQuery, AdminSmsMessageBatchDetailResponse, AdminSmsMessageBatchItem,
    AdminSmsMessageBatchListQuery, AdminSmsMessageBatchListResponse, AdminSmsRetryBatchItem,
};
use crate::models::sms_message::{
    AdminSmsManualTarget, AdminSmsSendInput, AdminSmsSendResponse, AdminSmsSendResult,
};
use crate::models::sms_template::{
    AdminSmsTemplateBatchInput, AdminSmsTemplateBatchResponse, AdminSmsTemplateBatchResult,
    AdminSmsTemplateCreateInput, AdminSmsTemplateDeleteInput, AdminSmsTemplateDetailResponse,
    AdminSmsTemplateGroup, AdminSmsTemplateGroupClearResponse, AdminSmsTemplateGroupClearResult,
    AdminSmsTemplateGroupCreateInput, AdminSmsTemplateGroupDeleteInput,
    AdminSmsTemplateGroupDetailResponse, AdminSmsTemplateGroupListResponse,
    AdminSmsTemplateGroupMoveInput, AdminSmsTemplateGroupMoveResponse,
    AdminSmsTemplateGroupMoveResult, AdminSmsTemplateGroupUpdateInput, AdminSmsTemplateItem,
    AdminSmsTemplateListQuery, AdminSmsTemplateListResponse, AdminSmsTemplateUpdateInput,
};
use std::error::Error;
use ts_rs::{Config, TS};

pub(super) fn export(config: &Config) -> Result<(), Box<dyn Error>> {
    AdminMailListQuery::export(config)?;
    AdminMailTemplate::export(config)?;
    AdminMailLastOption::export(config)?;
    AdminMailDetail::export(config)?;
    AdminMailListResponse::export(config)?;
    AdminMailDetailResponse::export(config)?;
    AdminMailTemplateCreateInput::export(config)?;
    AdminMailTemplateUpdateInput::export(config)?;
    AdminMailTemplateDeleteInput::export(config)?;
    AdminMailRecipientQuery::export(config)?;
    AdminMailRecipient::export(config)?;
    AdminMailRecipientListResponse::export(config)?;
    AdminMailSendTarget::export(config)?;
    AdminMailSendInput::export(config)?;
    AdminMailSendResult::export(config)?;
    AdminMailSendResponse::export(config)?;
    AdminSystemMailListQuery::export(config)?;
    AdminSystemMailTemplate::export(config)?;
    AdminSystemMailTemplateListResponse::export(config)?;
    AdminSystemMailRecipientQuery::export(config)?;
    AdminSystemMailRecipient::export(config)?;
    AdminSystemMailRecipientListResponse::export(config)?;
    AdminSystemMailSendRequest::export(config)?;
    AdminSystemMailSendRecipient::export(config)?;
    AdminSystemMailSendResult::export(config)?;
    AdminSystemMailSendResponse::export(config)?;
    AdminMailTestInput::export(config)?;
    AdminMailTestResult::export(config)?;
    AdminMailTestResponse::export(config)?;
    AdminSmsConfig::export(config)?;
    AdminSmsConfigResponse::export(config)?;
    AdminSmsConfigUpdateInput::export(config)?;
    AdminSmsMemberSyncSummary::export(config)?;
    AdminSmsMemberSyncResult::export(config)?;
    AdminSmsMemberSyncResponse::export(config)?;
    AdminSmsTemplateGroup::export(config)?;
    AdminSmsTemplateGroupListResponse::export(config)?;
    AdminSmsTemplateGroupDetailResponse::export(config)?;
    AdminSmsTemplateGroupCreateInput::export(config)?;
    AdminSmsTemplateGroupUpdateInput::export(config)?;
    AdminSmsTemplateGroupDeleteInput::export(config)?;
    AdminSmsTemplateGroupMoveInput::export(config)?;
    AdminSmsTemplateGroupMoveResult::export(config)?;
    AdminSmsTemplateGroupMoveResponse::export(config)?;
    AdminSmsTemplateGroupClearResult::export(config)?;
    AdminSmsTemplateGroupClearResponse::export(config)?;
    AdminSmsTemplateListQuery::export(config)?;
    AdminSmsTemplateItem::export(config)?;
    AdminSmsTemplateListResponse::export(config)?;
    AdminSmsTemplateDetailResponse::export(config)?;
    AdminSmsTemplateCreateInput::export(config)?;
    AdminSmsTemplateUpdateInput::export(config)?;
    AdminSmsTemplateDeleteInput::export(config)?;
    AdminSmsTemplateBatchInput::export(config)?;
    AdminSmsTemplateBatchResult::export(config)?;
    AdminSmsTemplateBatchResponse::export(config)?;
    AdminSmsContactGroup::export(config)?;
    AdminSmsContactGroupListResponse::export(config)?;
    AdminSmsContactGroupDetailResponse::export(config)?;
    AdminSmsContactGroupCreateInput::export(config)?;
    AdminSmsContactGroupUpdateInput::export(config)?;
    AdminSmsContactGroupDeleteInput::export(config)?;
    AdminSmsContactGroupMoveInput::export(config)?;
    AdminSmsContactGroupMoveResult::export(config)?;
    AdminSmsContactGroupMoveResponse::export(config)?;
    AdminSmsContactGroupClearResult::export(config)?;
    AdminSmsContactGroupClearResponse::export(config)?;
    AdminSmsContactSummary::export(config)?;
    AdminSmsContactListQuery::export(config)?;
    AdminSmsContactItem::export(config)?;
    AdminSmsContactListResponse::export(config)?;
    AdminSmsContactDetailResponse::export(config)?;
    AdminSmsContactCreateInput::export(config)?;
    AdminSmsContactUpdateInput::export(config)?;
    AdminSmsContactDeleteInput::export(config)?;
    AdminSmsContactBatchInput::export(config)?;
    AdminSmsContactBatchResult::export(config)?;
    AdminSmsContactBatchResponse::export(config)?;
    AdminSmsImportContactRow::export(config)?;
    AdminSmsContactImportInput::export(config)?;
    AdminSmsContactImportResult::export(config)?;
    AdminSmsContactImportResponse::export(config)?;
    AdminSmsContactExportQuery::export(config)?;
    AdminSmsContactExportItem::export(config)?;
    AdminSmsContactExportResponse::export(config)?;
    AdminSmsDuplicateSummary::export(config)?;
    AdminSmsMessageBatchListQuery::export(config)?;
    AdminSmsMessageBatchItem::export(config)?;
    AdminSmsMessageBatchListResponse::export(config)?;
    AdminSmsRetryBatchItem::export(config)?;
    AdminSmsDeliveryItem::export(config)?;
    AdminSmsMessageBatchDetailQuery::export(config)?;
    AdminSmsMessageBatchDetail::export(config)?;
    AdminSmsMessageBatchDetailResponse::export(config)?;
    AdminSmsDeliveryListQuery::export(config)?;
    AdminSmsDeliveryListResponse::export(config)?;
    AdminSmsBatchResendInput::export(config)?;
    AdminSmsManualTarget::export(config)?;
    AdminSmsSendInput::export(config)?;
    AdminSmsSendResult::export(config)?;
    AdminSmsSendResponse::export(config)?;
    Ok(())
}
