import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelSftpTransfer,
  enqueueSftpTransfers,
  getSftpTransferQueueSnapshot,
  listenSftpTransferQueue,
  pauseSftpTransfer,
  retrySftpTransfer,
  setSftpTransferConcurrency,
} from "./sftp-transfer";

const invokeCommandSpy = vi.fn();
const listenSpy = vi.fn();

vi.mock("./core", () => ({
  invokeCommand: (...args: unknown[]) => invokeCommandSpy(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => listenSpy(...args),
}));

describe("sftp-transfer client", () => {
  beforeEach(() => {
    invokeCommandSpy.mockReset();
    listenSpy.mockReset();
    invokeCommandSpy.mockResolvedValue({
      active_count: 0,
      cancelled_count: 0,
      concurrency_limit: 2,
      failed_count: 0,
      items: [],
      paused_count: 0,
      queued_count: 0,
      site_id: "site-alpha",
    });
  });

  it("requests the current SFTP transfer queue snapshot", async () => {
    await getSftpTransferQueueSnapshot({
      site_id: "site-alpha",
    });

    expect(invokeCommandSpy).toHaveBeenCalledWith("cmd_sftp_transfer_snapshot", {
      input: {
        site_id: "site-alpha",
      },
    });
  });

  it("enqueues SFTP transfer work items through the dedicated queue command", async () => {
    await enqueueSftpTransfers({
      site_id: "site-alpha",
      items: [
        {
          destination_path: "/var/www/html/logo.png",
          direction: "upload",
          label: "logo.png",
          recursive: false,
          source_kind: null,
          source_path: "/Users/test/Desktop/logo.png",
        },
      ],
    });

    expect(invokeCommandSpy).toHaveBeenCalledWith("cmd_sftp_transfer_enqueue", {
      input: {
        site_id: "site-alpha",
        items: [
          {
            destination_path: "/var/www/html/logo.png",
            direction: "upload",
            label: "logo.png",
            recursive: false,
            source_kind: null,
            source_path: "/Users/test/Desktop/logo.png",
          },
        ],
      },
    });
  });

  it("pauses a queued transfer item", async () => {
    await pauseSftpTransfer({
      item_id: "item-1",
      site_id: "site-alpha",
    });

    expect(invokeCommandSpy).toHaveBeenCalledWith("cmd_sftp_transfer_pause", {
      input: {
        item_id: "item-1",
        site_id: "site-alpha",
      },
    });
  });

  it("retries a terminal transfer item", async () => {
    await retrySftpTransfer({
      item_id: "item-1",
      site_id: "site-alpha",
    });

    expect(invokeCommandSpy).toHaveBeenCalledWith("cmd_sftp_transfer_retry", {
      input: {
        item_id: "item-1",
        site_id: "site-alpha",
      },
    });
  });

  it("cancels a transfer item", async () => {
    await cancelSftpTransfer({
      item_id: "item-1",
      site_id: "site-alpha",
    });

    expect(invokeCommandSpy).toHaveBeenCalledWith("cmd_sftp_transfer_cancel", {
      input: {
        item_id: "item-1",
        site_id: "site-alpha",
      },
    });
  });

  it("updates the SFTP transfer concurrency limit", async () => {
    await setSftpTransferConcurrency({
      concurrency_limit: 3,
      site_id: "site-alpha",
    });

    expect(invokeCommandSpy).toHaveBeenCalledWith(
      "cmd_sftp_transfer_set_concurrency",
      {
        input: {
          concurrency_limit: 3,
          site_id: "site-alpha",
        },
      },
    );
  });

  it("registers a tauri event listener for transfer queue snapshots", async () => {
    const unlisten = vi.fn();
    const onSnapshot = vi.fn();
    listenSpy.mockResolvedValue(unlisten);

    const result = await listenSftpTransferQueue(onSnapshot);

    expect(listenSpy).toHaveBeenCalledWith(
      "g5:sftp-transfer-queue",
      expect.any(Function),
    );
    expect(result).toBe(unlisten);
  });
});
