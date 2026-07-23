import { useMutation } from "@tanstack/react-query";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  cancelSftpTransfer,
  enqueueSftpTransfers,
  getSftpTransferQueueSnapshot,
  listenSftpTransferQueue,
  pauseSftpTransfer,
  retrySftpTransfer,
  setSftpTransferConcurrency,
  type CommandError,
} from "../../api/client";
import type { SftpTransferConcurrencyInput } from "../../types/SftpTransferConcurrencyInput";
import type { SftpTransferEnqueueInput } from "../../types/SftpTransferEnqueueInput";
import type { SftpTransferItemControlInput } from "../../types/SftpTransferItemControlInput";
import type { SftpTransferQueueItem } from "../../types/SftpTransferQueueItem";
import type { SftpTransferQueueSnapshot } from "../../types/SftpTransferQueueSnapshot";

function emptySnapshot(siteId: string | null): SftpTransferQueueSnapshot {
  return {
    active_count: 0,
    cancelled_count: 0,
    concurrency_limit: 2,
    failed_count: 0,
    items: [],
    paused_count: 0,
    queued_count: 0,
    site_id: siteId ?? "",
  };
}

export function useSiteSftpTransferQueue(
  siteId: string | null,
  options?: {
    enabled?: boolean;
    onItemSucceeded?: (item: SftpTransferQueueItem) => void;
  },
) {
  const enabled = options?.enabled ?? true;
  const [storedSnapshot, setStoredSnapshot] = useState<SftpTransferQueueSnapshot>(() =>
    emptySnapshot(siteId),
  );
  const [storedSnapshotError, setStoredSnapshotError] = useState<{
    error: CommandError | null;
    siteId: string | null;
  }>({
    error: null,
    siteId,
  });
  const previousStatusesRef = useRef<Map<string, string>>(new Map());
  const liveSnapshotAppliedRef = useRef(false);
  const handleItemSucceeded = useEffectEvent((item: SftpTransferQueueItem) => {
    options?.onItemSucceeded?.(item);
  });
  const snapshot = useMemo(() => {
    if (!siteId || storedSnapshot.site_id !== siteId) {
      return emptySnapshot(siteId);
    }
    return storedSnapshot;
  }, [siteId, storedSnapshot]);
  const snapshotError = useMemo(() => {
    if (storedSnapshotError.siteId !== siteId) {
      return null;
    }
    return storedSnapshotError.error;
  }, [siteId, storedSnapshotError]);

  useEffect(() => {
    let active = true;
    let unlisten: (() => void) | null = null;
    previousStatusesRef.current = new Map();
    liveSnapshotAppliedRef.current = false;

    if (!siteId || !enabled) {
      return () => {
        active = false;
      };
    }

    const applySnapshot = (
      nextSnapshot: SftpTransferQueueSnapshot,
      source: "event" | "initial" | "mutation",
    ) => {
      if (!active || nextSnapshot.site_id !== siteId) {
        return;
      }
      if (source === "initial" && liveSnapshotAppliedRef.current) {
        return;
      }
      const nextStatuses = new Map<string, string>();
      for (const item of nextSnapshot.items) {
        const previousStatus = previousStatusesRef.current.get(item.id);
        if (
          source !== "initial" &&
          previousStatus !== "succeeded" &&
          item.status === "succeeded"
        ) {
          handleItemSucceeded(item);
        }
        nextStatuses.set(item.id, item.status);
      }
      if (source !== "initial") {
        liveSnapshotAppliedRef.current = true;
      }
      previousStatusesRef.current = nextStatuses;
      setStoredSnapshot(nextSnapshot);
      setStoredSnapshotError({
        error: null,
        siteId,
      });
    };

    void getSftpTransferQueueSnapshot({ site_id: siteId })
      .then((nextSnapshot) => {
        applySnapshot(nextSnapshot, "initial");
      })
      .catch((error: CommandError) => {
        if (active) {
          setStoredSnapshotError({
            error,
            siteId,
          });
        }
      });

    void listenSftpTransferQueue((nextSnapshot) => {
      applySnapshot(nextSnapshot, "event");
    })
      .then((nextUnlisten) => {
        if (!active) {
          void nextUnlisten();
          return;
        }
        unlisten = nextUnlisten;
      })
      .catch((error: CommandError) => {
        if (active) {
          setStoredSnapshotError({
            error,
            siteId,
          });
        }
      });

    return () => {
      active = false;
      if (unlisten) {
        void unlisten();
      }
    };
  }, [enabled, siteId]);

  const enqueueMutation = useMutation<SftpTransferQueueSnapshot, CommandError, SftpTransferEnqueueInput>(
    {
      mutationFn: enqueueSftpTransfers,
      onSuccess(nextSnapshot) {
        if (!siteId) {
          return;
        }
        liveSnapshotAppliedRef.current = true;
        previousStatusesRef.current = new Map(
          nextSnapshot.items.map((item) => [item.id, item.status]),
        );
        setStoredSnapshot(nextSnapshot);
        setStoredSnapshotError({ error: null, siteId });
      },
      onError(error) {
        setStoredSnapshotError({
          error,
          siteId,
        });
      },
    },
  );

  const pauseMutation = useMutation<
    SftpTransferQueueSnapshot,
    CommandError,
    SftpTransferItemControlInput
  >({
    mutationFn: pauseSftpTransfer,
    onSuccess(nextSnapshot) {
      liveSnapshotAppliedRef.current = true;
      previousStatusesRef.current = new Map(
        nextSnapshot.items.map((item) => [item.id, item.status]),
      );
      setStoredSnapshot(nextSnapshot);
      setStoredSnapshotError({ error: null, siteId });
    },
    onError(error) {
      setStoredSnapshotError({ error, siteId });
    },
  });

  const retryMutation = useMutation<
    SftpTransferQueueSnapshot,
    CommandError,
    SftpTransferItemControlInput
  >({
    mutationFn: retrySftpTransfer,
    onSuccess(nextSnapshot) {
      liveSnapshotAppliedRef.current = true;
      previousStatusesRef.current = new Map(
        nextSnapshot.items.map((item) => [item.id, item.status]),
      );
      setStoredSnapshot(nextSnapshot);
      setStoredSnapshotError({ error: null, siteId });
    },
    onError(error) {
      setStoredSnapshotError({ error, siteId });
    },
  });

  const cancelMutation = useMutation<
    SftpTransferQueueSnapshot,
    CommandError,
    SftpTransferItemControlInput
  >({
    mutationFn: cancelSftpTransfer,
    onSuccess(nextSnapshot) {
      liveSnapshotAppliedRef.current = true;
      previousStatusesRef.current = new Map(
        nextSnapshot.items.map((item) => [item.id, item.status]),
      );
      setStoredSnapshot(nextSnapshot);
      setStoredSnapshotError({ error: null, siteId });
    },
    onError(error) {
      setStoredSnapshotError({ error, siteId });
    },
  });

  const concurrencyMutation = useMutation<
    SftpTransferQueueSnapshot,
    CommandError,
    SftpTransferConcurrencyInput
  >({
    mutationFn: setSftpTransferConcurrency,
    onSuccess(nextSnapshot) {
      liveSnapshotAppliedRef.current = true;
      previousStatusesRef.current = new Map(
        nextSnapshot.items.map((item) => [item.id, item.status]),
      );
      setStoredSnapshot(nextSnapshot);
      setStoredSnapshotError({ error: null, siteId });
    },
    onError(error) {
      setStoredSnapshotError({ error, siteId });
    },
  });

  const activeDownloadPath =
    snapshot.items.find(
      (item) => item.direction === "download" && item.status === "running",
    )?.source_path ?? null;
  const activeUploadSourcePath =
    snapshot.items.find(
      (item) => item.direction === "upload" && item.status === "running",
    )?.source_path ?? null;
  const pending = useMemo(
    () => enqueueMutation.isPending || snapshot.active_count > 0 || snapshot.queued_count > 0,
    [enqueueMutation.isPending, snapshot.active_count, snapshot.queued_count],
  );

  return {
    activeDownloadPath,
    activeUploadSourcePath,
    cancel: cancelMutation.mutateAsync,
    concurrencyPending: concurrencyMutation.isPending,
    enqueue: enqueueMutation.mutateAsync,
    enqueueError: enqueueMutation.error ?? snapshotError,
    items: snapshot.items,
    mutationPending:
      enqueueMutation.isPending ||
      pauseMutation.isPending ||
      retryMutation.isPending ||
      cancelMutation.isPending ||
      concurrencyMutation.isPending,
    pending,
    pause: pauseMutation.mutateAsync,
    retry: retryMutation.mutateAsync,
    setConcurrency: concurrencyMutation.mutateAsync,
    snapshot,
  };
}
