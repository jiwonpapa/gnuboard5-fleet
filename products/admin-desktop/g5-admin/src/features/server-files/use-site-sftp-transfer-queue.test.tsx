import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SftpTransferQueueSnapshot } from "../../types/SftpTransferQueueSnapshot";
import { useSiteSftpTransferQueue } from "./use-site-sftp-transfer-queue";

const getSnapshotMock = vi.fn();
const listenQueueMock = vi.fn();
const enqueueMock = vi.fn();
const pauseMock = vi.fn();
const retryMock = vi.fn();
const cancelMock = vi.fn();
const setConcurrencyMock = vi.fn();

vi.mock("../../api/client", () => ({
  cancelSftpTransfer: (...args: unknown[]) => cancelMock(...args),
  enqueueSftpTransfers: (...args: unknown[]) => enqueueMock(...args),
  getSftpTransferQueueSnapshot: (...args: unknown[]) => getSnapshotMock(...args),
  listenSftpTransferQueue: (...args: unknown[]) => listenQueueMock(...args),
  pauseSftpTransfer: (...args: unknown[]) => pauseMock(...args),
  retrySftpTransfer: (...args: unknown[]) => retryMock(...args),
  setSftpTransferConcurrency: (...args: unknown[]) => setConcurrencyMock(...args),
}));

function createSnapshot(
  overrides: Partial<SftpTransferQueueSnapshot> = {},
): SftpTransferQueueSnapshot {
  return {
    active_count: 0,
    cancelled_count: 0,
    concurrency_limit: 2,
    failed_count: 0,
    items: [],
    paused_count: 0,
    queued_count: 0,
    site_id: "site-alpha",
    ...overrides,
  };
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, reject, resolve };
}

describe("useSiteSftpTransferQueue", () => {
  beforeEach(() => {
    getSnapshotMock.mockReset();
    listenQueueMock.mockReset();
    enqueueMock.mockReset();
    pauseMock.mockReset();
    retryMock.mockReset();
    cancelMock.mockReset();
    setConcurrencyMock.mockReset();
    listenQueueMock.mockResolvedValue(() => {});
  });

  it("ignores a stale initial snapshot after a live event arrives first", async () => {
    const initialSnapshot = deferred<SftpTransferQueueSnapshot>();
    let onSnapshot: ((snapshot: SftpTransferQueueSnapshot) => void) | undefined;
    getSnapshotMock.mockReturnValue(initialSnapshot.promise);
    listenQueueMock.mockImplementation(async (callback) => {
      onSnapshot = callback;
      return () => {};
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    const { result } = renderHook(() => useSiteSftpTransferQueue("site-alpha"), {
      wrapper: createWrapper(queryClient),
    });

    const liveSnapshot = createSnapshot({
      items: [
        {
          attempt_count: 1,
          completed_at_epoch_ms: null,
          copied_bytes: null,
          destination_path: "/tmp/report.csv",
          direction: "download",
          error_message: null,
          id: "job-1",
          label: "report.csv",
          queued_at_epoch_ms: 10n,
          recursive: false,
          site_id: "site-alpha",
          source_kind: "file",
          source_path: "/srv/report.csv",
          status: "queued",
        },
      ],
      queued_count: 1,
    });

    expect(onSnapshot).toBeTypeOf("function");
    onSnapshot!(liveSnapshot);
    initialSnapshot.resolve(createSnapshot());

    await waitFor(() => {
      expect(result.current.snapshot.items).toHaveLength(1);
    });
    expect(result.current.snapshot.items[0]?.id).toBe("job-1");
  });

  it("does not treat historical succeeded items from the first hydration as new completions", async () => {
    const onItemSucceeded = vi.fn();
    getSnapshotMock.mockResolvedValue(
      createSnapshot({
        items: [
          {
            attempt_count: 1,
            completed_at_epoch_ms: 20n,
            copied_bytes: 1024n,
            destination_path: "/tmp/report.csv",
            direction: "download",
            error_message: null,
            id: "job-1",
            label: "report.csv",
            queued_at_epoch_ms: 10n,
            recursive: false,
            site_id: "site-alpha",
            source_kind: "file",
            source_path: "/srv/report.csv",
            status: "succeeded",
          },
        ],
        active_count: 0,
      }),
    );

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    renderHook(
      () =>
        useSiteSftpTransferQueue("site-alpha", {
          onItemSucceeded,
        }),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    await waitFor(() => {
      expect(getSnapshotMock).toHaveBeenCalled();
    });
    expect(onItemSucceeded).not.toHaveBeenCalled();
  });
});
