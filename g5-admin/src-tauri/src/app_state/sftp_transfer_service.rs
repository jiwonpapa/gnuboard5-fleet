use super::sftp_support::{ensure_site_exists, SftpAccessGate};
use super::sftp_transfer_ops;
use super::sftp_transfer_queue::{
    QueueControlEffect, SftpTransferConcurrencyInput as QueueConcurrencyInput,
    SftpTransferDirection as QueueDirection, SftpTransferEnqueueItemInput as QueueEnqueueItemInput,
    SftpTransferEntryKind as QueueEntryKind, SftpTransferItemControlInput as QueueControlInput,
    SftpTransferItemStatus as QueueItemStatus, SftpTransferQueueHost,
    SftpTransferQueueItem as QueueItem, SftpTransferQueueSnapshot as QueueSnapshot,
};
use super::ssh_runtime::{ActiveSshSession, SshSessionRuntime};
use crate::core::ports::SiteCatalogStorePort;
use crate::error::AppError;
use g5_admin_models::models::sftp_transfer::{
    SftpTransferConcurrencyInput, SftpTransferDirection, SftpTransferEnqueueInput,
    SftpTransferEnqueueItemInput, SftpTransferItemControlInput, SftpTransferItemStatus,
    SftpTransferQueueItem, SftpTransferQueueSnapshot, SftpTransferSnapshotInput,
};
use g5_admin_models::models::ssh::{SftpDownloadInput, SftpEntryKind, SftpUploadInput};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::RwLock;

const SFTP_TRANSFER_QUEUE_EVENT_NAME: &str = "g5:sftp-transfer-queue";

pub(crate) struct SftpTransferService {
    access_gate: Arc<dyn SftpAccessGate + Send + Sync>,
    site_catalog_store: Arc<dyn SiteCatalogStorePort + Send + Sync>,
    ssh_sessions: Arc<RwLock<HashMap<String, ActiveSshSession>>>,
    host: Arc<SftpTransferQueueHost>,
    app_handle: Option<AppHandle>,
}

impl SftpTransferService {
    pub(super) fn new(
        access_gate: Arc<dyn SftpAccessGate + Send + Sync>,
        site_catalog_store: Arc<dyn SiteCatalogStorePort + Send + Sync>,
        ssh_sessions: Arc<RwLock<HashMap<String, ActiveSshSession>>>,
        host: Arc<SftpTransferQueueHost>,
        app_handle: Option<AppHandle>,
    ) -> Self {
        Self {
            access_gate,
            site_catalog_store,
            ssh_sessions,
            host,
            app_handle,
        }
    }

    pub(crate) async fn snapshot(
        &self,
        input: SftpTransferSnapshotInput,
    ) -> Result<SftpTransferQueueSnapshot, AppError> {
        self.access_gate.require_unlocked().await?;
        ensure_site_exists(self.site_catalog_store.as_ref(), &input.site_id)?;
        Ok(to_model_snapshot(self.host.snapshot(&input.site_id).await))
    }

    pub(crate) async fn enqueue(
        &self,
        input: SftpTransferEnqueueInput,
    ) -> Result<SftpTransferQueueSnapshot, AppError> {
        self.access_gate.require_unlocked().await?;
        ensure_site_exists(self.site_catalog_store.as_ref(), &input.site_id)?;
        if input.items.is_empty() {
            return Err(AppError::Config {
                message: "전송 큐에 추가할 항목이 없습니다.".to_string(),
            });
        }

        let items = input
            .items
            .into_iter()
            .map(normalize_transfer_item)
            .collect::<Result<Vec<_>, _>>()?;
        let snapshot = to_model_snapshot(self.host.enqueue(&input.site_id, items).await);
        emit_snapshot(self.app_handle.as_ref(), &snapshot);
        self.spawn_workers_if_needed(&input.site_id).await;
        Ok(snapshot)
    }

    pub(crate) async fn pause(
        &self,
        input: SftpTransferItemControlInput,
    ) -> Result<SftpTransferQueueSnapshot, AppError> {
        self.access_gate.require_unlocked().await?;
        ensure_site_exists(self.site_catalog_store.as_ref(), &input.site_id)?;
        let effect = self.host.pause(to_queue_control_input(input)).await;
        self.apply_control_effect(effect).await
    }

    pub(crate) async fn retry(
        &self,
        input: SftpTransferItemControlInput,
    ) -> Result<SftpTransferQueueSnapshot, AppError> {
        self.access_gate.require_unlocked().await?;
        ensure_site_exists(self.site_catalog_store.as_ref(), &input.site_id)?;
        let effect = self.host.retry(to_queue_control_input(input)).await;
        self.apply_control_effect(effect).await
    }

    pub(crate) async fn cancel(
        &self,
        input: SftpTransferItemControlInput,
    ) -> Result<SftpTransferQueueSnapshot, AppError> {
        self.access_gate.require_unlocked().await?;
        ensure_site_exists(self.site_catalog_store.as_ref(), &input.site_id)?;
        let effect = self.host.cancel(to_queue_control_input(input)).await;
        self.apply_control_effect(effect).await
    }

    pub(crate) async fn set_concurrency_limit(
        &self,
        input: SftpTransferConcurrencyInput,
    ) -> Result<SftpTransferQueueSnapshot, AppError> {
        self.access_gate.require_unlocked().await?;
        ensure_site_exists(self.site_catalog_store.as_ref(), &input.site_id)?;
        let effect = self
            .host
            .set_concurrency_limit(QueueConcurrencyInput {
                site_id: input.site_id,
                concurrency_limit: input.concurrency_limit,
            })
            .await;
        self.apply_control_effect(effect).await
    }

    async fn apply_control_effect(
        &self,
        effect: QueueControlEffect,
    ) -> Result<SftpTransferQueueSnapshot, AppError> {
        let site_id = effect.snapshot.site_id.clone();
        let snapshot = to_model_snapshot(effect.snapshot);
        emit_snapshot(self.app_handle.as_ref(), &snapshot);
        if effect.abort_running {
            if let Some(item_id) = effect.item_id.as_deref() {
                self.host.abort_running(&site_id, item_id).await;
            }
        }
        if effect.should_spawn {
            self.spawn_workers_if_needed(&site_id).await;
        }
        Ok(snapshot)
    }

    async fn spawn_workers_if_needed(&self, site_id: &str) {
        loop {
            let spawned = spawn_next_worker_once(
                site_id.to_string(),
                Arc::clone(&self.access_gate),
                Arc::clone(&self.site_catalog_store),
                Arc::clone(&self.ssh_sessions),
                Arc::clone(&self.host),
                self.app_handle.clone(),
            )
            .await;
            if !spawned {
                break;
            }
        }
    }
}

async fn spawn_next_worker_once(
    site_id: String,
    access_gate: Arc<dyn SftpAccessGate + Send + Sync>,
    site_catalog_store: Arc<dyn SiteCatalogStorePort + Send + Sync>,
    ssh_sessions: Arc<RwLock<HashMap<String, ActiveSshSession>>>,
    host: Arc<SftpTransferQueueHost>,
    app_handle: Option<AppHandle>,
) -> bool {
    let Some(item) = host.claim_next(&site_id).await else {
        return false;
    };
    let running_snapshot = host.snapshot(&site_id).await;
    emit_snapshot(app_handle.as_ref(), &to_model_snapshot(running_snapshot));
    let item_id = item.id.clone();

    let task = spawn_transfer_worker(
        site_id,
        item,
        access_gate,
        site_catalog_store,
        ssh_sessions,
        host,
        app_handle,
    );
    task.host
        .register_abort_handle(
            &task.site_id,
            item_id.as_str(),
            task.join_handle.abort_handle(),
        )
        .await;

    true
}

struct SpawnedTransferWorker {
    host: Arc<SftpTransferQueueHost>,
    site_id: String,
    join_handle: tokio::task::JoinHandle<()>,
}

fn spawn_transfer_worker(
    site_id: String,
    item: QueueItem,
    access_gate: Arc<dyn SftpAccessGate + Send + Sync>,
    site_catalog_store: Arc<dyn SiteCatalogStorePort + Send + Sync>,
    ssh_sessions: Arc<RwLock<HashMap<String, ActiveSshSession>>>,
    host: Arc<SftpTransferQueueHost>,
    app_handle: Option<AppHandle>,
) -> SpawnedTransferWorker {
    let item_id = item.id.clone();
    let worker_site_id = site_id.clone();
    let worker_item_id = item_id.clone();
    let worker_access_gate = Arc::clone(&access_gate);
    let worker_site_catalog_store = Arc::clone(&site_catalog_store);
    let worker_ssh_sessions = Arc::clone(&ssh_sessions);
    let worker_host = Arc::clone(&host);
    let worker_app_handle = app_handle.clone();
    let join_handle = tokio::spawn(async move {
        let result = process_transfer_item(
            worker_access_gate.as_ref(),
            worker_site_catalog_store.as_ref(),
            SshSessionRuntime::new(&worker_ssh_sessions),
            &item,
        )
        .await;
        worker_host
            .remove_abort_handle(&worker_site_id, &worker_item_id)
            .await;
        let snapshot = match result {
            Ok(copied_bytes) => {
                worker_host
                    .complete_success(&worker_site_id, &worker_item_id, copied_bytes)
                    .await
            }
            Err(error) => {
                worker_host
                    .complete_failure(
                        &worker_site_id,
                        &worker_item_id,
                        error.into_payload("sftp-transfer").message,
                    )
                    .await
            }
        };
        emit_snapshot(worker_app_handle.as_ref(), &to_model_snapshot(snapshot));

        tokio::spawn(async move {
            let _ = spawn_next_worker_once(
                worker_site_id,
                worker_access_gate,
                worker_site_catalog_store,
                worker_ssh_sessions,
                worker_host,
                worker_app_handle,
            )
            .await;
        });
    });
    SpawnedTransferWorker {
        host,
        site_id,
        join_handle,
    }
}

async fn process_transfer_item(
    access_gate: &(dyn SftpAccessGate + Send + Sync),
    site_catalog_store: &(dyn SiteCatalogStorePort + Send + Sync),
    runtime: SshSessionRuntime<'_>,
    item: &QueueItem,
) -> Result<u64, AppError> {
    match item.direction {
        QueueDirection::Upload => {
            let response = sftp_transfer_ops::upload_file(
                access_gate,
                site_catalog_store,
                runtime,
                item.id.as_str(),
                SftpUploadInput {
                    site_id: item.site_id.clone(),
                    source_path: item.source_path.clone(),
                    destination_path: item.destination_path.clone(),
                },
            )
            .await?;
            Ok(response.copied_bytes)
        }
        QueueDirection::Download => {
            let response = sftp_transfer_ops::download_file(
                access_gate,
                site_catalog_store,
                runtime,
                item.id.as_str(),
                SftpDownloadInput {
                    site_id: item.site_id.clone(),
                    path: item.source_path.clone(),
                    destination_path: item.destination_path.clone(),
                },
            )
            .await?;
            Ok(response.copied_bytes)
        }
    }
}

fn normalize_transfer_item(
    item: SftpTransferEnqueueItemInput,
) -> Result<QueueEnqueueItemInput, AppError> {
    let source_path = item.source_path.trim();
    let destination_path = item.destination_path.trim();
    if source_path.is_empty() {
        return Err(AppError::Config {
            message: "전송 원본 경로가 비어 있습니다.".to_string(),
        });
    }
    if destination_path.is_empty() {
        return Err(AppError::Config {
            message: "전송 대상 경로가 비어 있습니다.".to_string(),
        });
    }
    Ok(QueueEnqueueItemInput {
        direction: to_queue_direction(item.direction),
        source_path: source_path.to_string(),
        destination_path: destination_path.to_string(),
        source_kind: item.source_kind.map(to_queue_entry_kind),
        recursive: item.recursive,
        label: item
            .label
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty()),
    })
}

fn emit_snapshot(app_handle: Option<&AppHandle>, snapshot: &SftpTransferQueueSnapshot) {
    if let Some(handle) = app_handle {
        let _ = handle.emit(SFTP_TRANSFER_QUEUE_EVENT_NAME, snapshot.clone());
    }
}

fn to_queue_control_input(input: SftpTransferItemControlInput) -> QueueControlInput {
    QueueControlInput {
        site_id: input.site_id,
        item_id: input.item_id,
    }
}

fn to_queue_direction(direction: SftpTransferDirection) -> QueueDirection {
    match direction {
        SftpTransferDirection::Upload => QueueDirection::Upload,
        SftpTransferDirection::Download => QueueDirection::Download,
    }
}

fn to_model_direction(direction: QueueDirection) -> SftpTransferDirection {
    match direction {
        QueueDirection::Upload => SftpTransferDirection::Upload,
        QueueDirection::Download => SftpTransferDirection::Download,
    }
}

fn to_queue_entry_kind(kind: SftpEntryKind) -> QueueEntryKind {
    match kind {
        SftpEntryKind::Directory => QueueEntryKind::Directory,
        SftpEntryKind::File => QueueEntryKind::File,
        SftpEntryKind::Symlink => QueueEntryKind::Symlink,
        SftpEntryKind::Other => QueueEntryKind::Other,
    }
}

fn to_model_entry_kind(kind: QueueEntryKind) -> SftpEntryKind {
    match kind {
        QueueEntryKind::Directory => SftpEntryKind::Directory,
        QueueEntryKind::File => SftpEntryKind::File,
        QueueEntryKind::Symlink => SftpEntryKind::Symlink,
        QueueEntryKind::Other => SftpEntryKind::Other,
    }
}

fn to_model_status(status: QueueItemStatus) -> SftpTransferItemStatus {
    match status {
        QueueItemStatus::Queued => SftpTransferItemStatus::Queued,
        QueueItemStatus::Running => SftpTransferItemStatus::Running,
        QueueItemStatus::Paused => SftpTransferItemStatus::Paused,
        QueueItemStatus::Succeeded => SftpTransferItemStatus::Succeeded,
        QueueItemStatus::Cancelled => SftpTransferItemStatus::Cancelled,
        QueueItemStatus::Failed => SftpTransferItemStatus::Failed,
    }
}

fn to_model_item(item: QueueItem) -> SftpTransferQueueItem {
    SftpTransferQueueItem {
        id: item.id,
        site_id: item.site_id,
        direction: to_model_direction(item.direction),
        source_path: item.source_path,
        destination_path: item.destination_path,
        source_kind: item.source_kind.map(to_model_entry_kind),
        recursive: item.recursive,
        label: item.label,
        status: to_model_status(item.status),
        attempt_count: item.attempt_count,
        copied_bytes: item.copied_bytes,
        error_message: item.error_message,
        queued_at_epoch_ms: item.queued_at_epoch_ms,
        completed_at_epoch_ms: item.completed_at_epoch_ms,
    }
}

fn to_model_snapshot(snapshot: QueueSnapshot) -> SftpTransferQueueSnapshot {
    SftpTransferQueueSnapshot {
        site_id: snapshot.site_id,
        items: snapshot.items.into_iter().map(to_model_item).collect(),
        active_count: snapshot.active_count,
        queued_count: snapshot.queued_count,
        paused_count: snapshot.paused_count,
        cancelled_count: snapshot.cancelled_count,
        failed_count: snapshot.failed_count,
        concurrency_limit: snapshot.concurrency_limit,
    }
}
