use std::collections::{HashMap, HashSet};
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::Mutex;
use tokio::task::AbortHandle;
use uuid::Uuid;

#[cfg(test)]
mod tests;

const DEFAULT_TRANSFER_CONCURRENCY_LIMIT: u32 = 2;
const MAX_TRANSFER_CONCURRENCY_LIMIT: u32 = 4;
const MAX_TERMINAL_TRANSFER_ITEMS: usize = 48;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SftpTransferDirection {
    Upload,
    Download,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SftpTransferItemStatus {
    Queued,
    Running,
    Paused,
    Succeeded,
    Cancelled,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SftpTransferEntryKind {
    Directory,
    File,
    Symlink,
    Other,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpTransferEnqueueItemInput {
    pub direction: SftpTransferDirection,
    pub source_path: String,
    pub destination_path: String,
    pub source_kind: Option<SftpTransferEntryKind>,
    pub recursive: bool,
    pub label: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpTransferItemControlInput {
    pub site_id: String,
    pub item_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpTransferConcurrencyInput {
    pub site_id: String,
    pub concurrency_limit: u32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SftpTransferQueueItem {
    pub id: String,
    pub site_id: String,
    pub direction: SftpTransferDirection,
    pub source_path: String,
    pub destination_path: String,
    pub source_kind: Option<SftpTransferEntryKind>,
    pub recursive: bool,
    pub label: String,
    pub status: SftpTransferItemStatus,
    pub attempt_count: u32,
    pub copied_bytes: Option<u64>,
    pub error_message: Option<String>,
    pub queued_at_epoch_ms: u64,
    pub completed_at_epoch_ms: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
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

pub struct QueueControlEffect {
    pub abort_running: bool,
    pub item_id: Option<String>,
    pub should_spawn: bool,
    pub snapshot: SftpTransferQueueSnapshot,
}

struct SiteTransferQueueState {
    items: Vec<SftpTransferQueueItem>,
    active_workers: u32,
    concurrency_limit: u32,
    running_handles: HashMap<String, AbortHandle>,
}

impl Default for SiteTransferQueueState {
    fn default() -> Self {
        Self {
            items: Vec::new(),
            active_workers: 0,
            concurrency_limit: DEFAULT_TRANSFER_CONCURRENCY_LIMIT,
            running_handles: HashMap::new(),
        }
    }
}

pub struct SftpTransferQueueHost {
    sites: Mutex<HashMap<String, SiteTransferQueueState>>,
}

impl SftpTransferQueueHost {
    pub fn new() -> Self {
        Self {
            sites: Mutex::new(HashMap::new()),
        }
    }

    pub async fn enqueue(
        &self,
        site_id: &str,
        items: Vec<SftpTransferEnqueueItemInput>,
    ) -> SftpTransferQueueSnapshot {
        let mut sites = self.sites.lock().await;
        let state = sites.entry(site_id.to_string()).or_default();
        for item in items {
            state.items.push(build_queue_item(site_id, item));
        }
        trim_terminal_items(state);
        build_snapshot(site_id, state)
    }

    pub async fn snapshot(&self, site_id: &str) -> SftpTransferQueueSnapshot {
        let sites = self.sites.lock().await;
        if let Some(state) = sites.get(site_id) {
            return build_snapshot(site_id, state);
        }

        empty_snapshot(site_id)
    }

    pub async fn claim_next(&self, site_id: &str) -> Option<SftpTransferQueueItem> {
        let mut sites = self.sites.lock().await;
        let state = sites.get_mut(site_id)?;
        if state.active_workers >= state.concurrency_limit {
            return None;
        }

        let next = state
            .items
            .iter_mut()
            .find(|item| item.status == SftpTransferItemStatus::Queued)?;
        next.status = SftpTransferItemStatus::Running;
        next.error_message = None;
        next.completed_at_epoch_ms = None;
        next.copied_bytes = None;
        next.attempt_count = next.attempt_count.saturating_add(1);
        state.active_workers = state.active_workers.saturating_add(1);
        Some(next.clone())
    }

    pub async fn register_abort_handle(&self, site_id: &str, item_id: &str, handle: AbortHandle) {
        let mut sites = self.sites.lock().await;
        let state = sites.entry(site_id.to_string()).or_default();
        state.running_handles.insert(item_id.to_string(), handle);
    }

    pub async fn complete_success(
        &self,
        site_id: &str,
        item_id: &str,
        copied_bytes: u64,
    ) -> SftpTransferQueueSnapshot {
        self.complete_terminal(site_id, item_id, |item| {
            item.status = SftpTransferItemStatus::Succeeded;
            item.copied_bytes = Some(copied_bytes);
            item.error_message = None;
        })
        .await
    }

    pub async fn complete_failure(
        &self,
        site_id: &str,
        item_id: &str,
        message: String,
    ) -> SftpTransferQueueSnapshot {
        self.complete_terminal(site_id, item_id, |item| {
            item.status = SftpTransferItemStatus::Failed;
            item.error_message = Some(message);
        })
        .await
    }

    pub async fn pause(&self, input: SftpTransferItemControlInput) -> QueueControlEffect {
        self.control_item(input, SftpTransferItemStatus::Paused)
            .await
    }

    pub async fn cancel(&self, input: SftpTransferItemControlInput) -> QueueControlEffect {
        self.control_item(input, SftpTransferItemStatus::Cancelled)
            .await
    }

    pub async fn retry(&self, input: SftpTransferItemControlInput) -> QueueControlEffect {
        let mut sites = self.sites.lock().await;
        let state = sites.entry(input.site_id.clone()).or_default();
        let mut changed = false;
        if let Some(item) = state.items.iter_mut().find(|item| item.id == input.item_id) {
            match item.status {
                SftpTransferItemStatus::Failed
                | SftpTransferItemStatus::Cancelled
                | SftpTransferItemStatus::Paused => {
                    item.status = SftpTransferItemStatus::Queued;
                    item.copied_bytes = None;
                    item.error_message = None;
                    item.completed_at_epoch_ms = None;
                    changed = true;
                }
                _ => {}
            }
        }
        let snapshot = build_snapshot(input.site_id.as_str(), state);
        QueueControlEffect {
            abort_running: false,
            item_id: changed.then_some(input.item_id),
            should_spawn: changed && has_spawnable_work(state),
            snapshot,
        }
    }

    pub async fn set_concurrency_limit(
        &self,
        input: SftpTransferConcurrencyInput,
    ) -> QueueControlEffect {
        let mut sites = self.sites.lock().await;
        let state = sites.entry(input.site_id.clone()).or_default();
        let next_limit = input
            .concurrency_limit
            .clamp(1, MAX_TRANSFER_CONCURRENCY_LIMIT);
        state.concurrency_limit = next_limit;
        let snapshot = build_snapshot(input.site_id.as_str(), state);
        QueueControlEffect {
            abort_running: false,
            item_id: None,
            should_spawn: has_spawnable_work(state),
            snapshot,
        }
    }

    pub async fn abort_running(&self, site_id: &str, item_id: &str) {
        let handle = {
            let mut sites = self.sites.lock().await;
            sites
                .get_mut(site_id)
                .and_then(|state| state.running_handles.remove(item_id))
        };

        if let Some(handle) = handle {
            handle.abort();
        }
    }

    pub async fn remove_abort_handle(&self, site_id: &str, item_id: &str) {
        let mut sites = self.sites.lock().await;
        if let Some(state) = sites.get_mut(site_id) {
            state.running_handles.remove(item_id);
        }
    }

    async fn control_item(
        &self,
        input: SftpTransferItemControlInput,
        terminal_status: SftpTransferItemStatus,
    ) -> QueueControlEffect {
        let mut sites = self.sites.lock().await;
        let state = sites.entry(input.site_id.clone()).or_default();
        let mut abort_running = false;
        let mut changed = false;
        let item_id = input.item_id.clone();

        if let Some(item) = state.items.iter_mut().find(|item| item.id == input.item_id) {
            match item.status {
                SftpTransferItemStatus::Queued | SftpTransferItemStatus::Running => {
                    if item.status == SftpTransferItemStatus::Running {
                        abort_running = true;
                        state.active_workers = state.active_workers.saturating_sub(1);
                    }
                    item.status = terminal_status;
                    item.error_message = Some(match terminal_status {
                        SftpTransferItemStatus::Paused => {
                            "사용자가 전송을 일시 중지했습니다.".to_string()
                        }
                        SftpTransferItemStatus::Cancelled => {
                            "사용자가 전송을 취소했습니다.".to_string()
                        }
                        _ => String::new(),
                    });
                    item.completed_at_epoch_ms = Some(now_epoch_ms());
                    item.copied_bytes = None;
                    changed = true;
                }
                _ => {}
            }
        }

        let should_spawn = has_spawnable_work(state);
        if abort_running {
            state.running_handles.remove(&item_id);
        }
        trim_terminal_items(state);
        let snapshot = build_snapshot(input.site_id.as_str(), state);
        QueueControlEffect {
            abort_running,
            item_id: changed.then_some(item_id),
            should_spawn,
            snapshot,
        }
    }

    async fn complete_terminal(
        &self,
        site_id: &str,
        item_id: &str,
        apply: impl FnOnce(&mut SftpTransferQueueItem),
    ) -> SftpTransferQueueSnapshot {
        let mut sites = self.sites.lock().await;
        let state = sites.entry(site_id.to_string()).or_default();
        state.running_handles.remove(item_id);

        if let Some(item) = state.items.iter_mut().find(|item| item.id == item_id) {
            if item.status == SftpTransferItemStatus::Running {
                state.active_workers = state.active_workers.saturating_sub(1);
            }
            apply(item);
            item.completed_at_epoch_ms = Some(now_epoch_ms());
        }

        trim_terminal_items(state);
        build_snapshot(site_id, state)
    }
}

impl Default for SftpTransferQueueHost {
    fn default() -> Self {
        Self::new()
    }
}

fn build_queue_item(site_id: &str, item: SftpTransferEnqueueItemInput) -> SftpTransferQueueItem {
    let label = item
        .label
        .as_ref()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| infer_queue_item_label(&item));
    SftpTransferQueueItem {
        id: Uuid::new_v4().simple().to_string(),
        site_id: site_id.to_string(),
        direction: item.direction,
        source_path: item.source_path,
        destination_path: item.destination_path,
        source_kind: item.source_kind,
        recursive: item.recursive,
        label,
        status: SftpTransferItemStatus::Queued,
        attempt_count: 0,
        copied_bytes: None,
        error_message: None,
        queued_at_epoch_ms: now_epoch_ms(),
        completed_at_epoch_ms: None,
    }
}

fn infer_queue_item_label(item: &SftpTransferEnqueueItemInput) -> String {
    let candidate = item
        .source_path
        .trim()
        .trim_end_matches(['/', '\\'])
        .split(['/', '\\'])
        .rfind(|segment| !segment.is_empty())
        .unwrap_or("transfer");

    if item.recursive {
        return format!("{candidate}/");
    }

    candidate.to_string()
}

fn trim_terminal_items(state: &mut SiteTransferQueueState) {
    let terminal_items = state
        .items
        .iter()
        .filter(|item| {
            matches!(
                item.status,
                SftpTransferItemStatus::Succeeded
                    | SftpTransferItemStatus::Failed
                    | SftpTransferItemStatus::Cancelled
            )
        })
        .collect::<Vec<_>>();
    if terminal_items.len() <= MAX_TERMINAL_TRANSFER_ITEMS {
        return;
    }

    let keep_terminal_ids = terminal_items
        .iter()
        .rev()
        .take(MAX_TERMINAL_TRANSFER_ITEMS)
        .map(|item| item.id.clone())
        .collect::<HashSet<_>>();
    state.items.retain(|item| {
        !matches!(
            item.status,
            SftpTransferItemStatus::Succeeded
                | SftpTransferItemStatus::Failed
                | SftpTransferItemStatus::Cancelled
        ) || keep_terminal_ids.contains(&item.id)
    });
}

fn build_snapshot(site_id: &str, state: &SiteTransferQueueState) -> SftpTransferQueueSnapshot {
    let active_count = count_status(state, SftpTransferItemStatus::Running);
    let queued_count = count_status(state, SftpTransferItemStatus::Queued);
    let paused_count = count_status(state, SftpTransferItemStatus::Paused);
    let cancelled_count = count_status(state, SftpTransferItemStatus::Cancelled);
    let failed_count = count_status(state, SftpTransferItemStatus::Failed);
    SftpTransferQueueSnapshot {
        site_id: site_id.to_string(),
        items: state.items.clone(),
        active_count,
        queued_count,
        paused_count,
        cancelled_count,
        failed_count,
        concurrency_limit: state.concurrency_limit,
    }
}

fn count_status(state: &SiteTransferQueueState, status: SftpTransferItemStatus) -> u32 {
    state
        .items
        .iter()
        .filter(|item| item.status == status)
        .count() as u32
}

fn empty_snapshot(site_id: &str) -> SftpTransferQueueSnapshot {
    SftpTransferQueueSnapshot {
        site_id: site_id.to_string(),
        items: Vec::new(),
        active_count: 0,
        queued_count: 0,
        paused_count: 0,
        cancelled_count: 0,
        failed_count: 0,
        concurrency_limit: DEFAULT_TRANSFER_CONCURRENCY_LIMIT,
    }
}

fn has_spawnable_work(state: &SiteTransferQueueState) -> bool {
    state.active_workers < state.concurrency_limit
        && state
            .items
            .iter()
            .any(|item| item.status == SftpTransferItemStatus::Queued)
}

fn now_epoch_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}
