use super::*;

#[tokio::test]
async fn enqueue_and_claim_updates_counts() {
    let host = SftpTransferQueueHost::new();

    let snapshot = host
        .enqueue("site-a", vec![sample_item("/tmp/a.txt")])
        .await;
    assert_eq!(snapshot.site_id, "site-a");
    assert_eq!(snapshot.queued_count, 1);
    assert_eq!(snapshot.active_count, 0);
    assert_eq!(snapshot.items[0].label, "a.txt");

    let claimed = host
        .claim_next("site-a")
        .await
        .expect("queued item should be claimed");
    assert_eq!(claimed.status, SftpTransferItemStatus::Running);
    assert_eq!(claimed.attempt_count, 1);

    let snapshot = host.snapshot("site-a").await;
    assert_eq!(snapshot.queued_count, 0);
    assert_eq!(snapshot.active_count, 1);
}

#[tokio::test]
async fn pause_running_item_releases_worker_and_can_retry() {
    let host = SftpTransferQueueHost::new();
    host.enqueue("site-a", vec![sample_item("/tmp/a.txt")])
        .await;
    let claimed = host
        .claim_next("site-a")
        .await
        .expect("queued item should be claimed");

    let paused = host
        .pause(SftpTransferItemControlInput {
            site_id: "site-a".to_string(),
            item_id: claimed.id.clone(),
        })
        .await;
    assert!(paused.abort_running);
    assert_eq!(paused.snapshot.active_count, 0);
    assert_eq!(paused.snapshot.paused_count, 1);

    let retried = host
        .retry(SftpTransferItemControlInput {
            site_id: "site-a".to_string(),
            item_id: claimed.id,
        })
        .await;
    assert!(retried.should_spawn);
    assert_eq!(retried.snapshot.queued_count, 1);
}

fn sample_item(source_path: &str) -> SftpTransferEnqueueItemInput {
    SftpTransferEnqueueItemInput {
        direction: SftpTransferDirection::Upload,
        source_path: source_path.to_string(),
        destination_path: "/remote/a.txt".to_string(),
        source_kind: None,
        recursive: false,
        label: None,
    }
}
