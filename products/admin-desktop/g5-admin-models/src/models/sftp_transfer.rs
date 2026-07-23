use serde::{Deserialize, Serialize};

use crate::models::ssh::SftpEntryKind;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[serde(rename_all = "snake_case")]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub enum SftpTransferDirection {
    Upload,
    Download,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[serde(rename_all = "snake_case")]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub enum SftpTransferItemStatus {
    Queued,
    Running,
    Paused,
    Succeeded,
    Cancelled,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct SftpTransferEnqueueItemInput {
    pub direction: SftpTransferDirection,
    pub source_path: String,
    pub destination_path: String,
    pub source_kind: Option<SftpEntryKind>,
    pub recursive: bool,
    pub label: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct SftpTransferEnqueueInput {
    pub site_id: String,
    pub items: Vec<SftpTransferEnqueueItemInput>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct SftpTransferSnapshotInput {
    pub site_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct SftpTransferItemControlInput {
    pub site_id: String,
    pub item_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct SftpTransferConcurrencyInput {
    pub site_id: String,
    pub concurrency_limit: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct SftpTransferQueueItem {
    pub id: String,
    pub site_id: String,
    pub direction: SftpTransferDirection,
    pub source_path: String,
    pub destination_path: String,
    pub source_kind: Option<SftpEntryKind>,
    pub recursive: bool,
    pub label: String,
    pub status: SftpTransferItemStatus,
    pub attempt_count: u32,
    pub copied_bytes: Option<u64>,
    pub error_message: Option<String>,
    pub queued_at_epoch_ms: u64,
    pub completed_at_epoch_ms: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]
#[cfg_attr(
    feature = "ts-bindings",
    ts(export, export_to = "../../g5-admin/src/types/")
)]
pub struct SftpTransferQueueSnapshot {
    pub site_id: String,
    pub items: Vec<SftpTransferQueueItem>,
    pub active_count: u32,
    pub queued_count: u32,
    pub paused_count: u32,
    pub cancelled_count: u32,
    pub failed_count: u32,
    pub concurrency_limit: u32,
}
