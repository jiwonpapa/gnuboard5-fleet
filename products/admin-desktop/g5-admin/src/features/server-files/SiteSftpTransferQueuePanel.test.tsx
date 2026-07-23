import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SiteSftpTransferQueuePanel } from "./SiteSftpTransferQueuePanel";

describe("SiteSftpTransferQueuePanel", () => {
  it("shows a recent completion summary for succeeded transfers", () => {
    render(
      <SiteSftpTransferQueuePanel
        concurrencyPending={false}
        mutationPending={false}
        pending={false}
        snapshot={{
          active_count: 0,
          cancelled_count: 0,
          concurrency_limit: 2,
          failed_count: 0,
          items: [
            {
              attempt_count: 1,
              completed_at_epoch_ms: 1_742_600_000n,
              copied_bytes: 4096n,
              destination_path: "/var/www/html/index.php",
              direction: "download",
              error_message: null,
              id: "transfer-1",
              label: "index.php",
              queued_at_epoch_ms: 1_742_599_000n,
              recursive: false,
              site_id: "site-alpha",
              source_kind: "file",
              source_path: "/remote/index.php",
              status: "succeeded",
            },
          ],
          paused_count: 0,
          queued_count: 0,
          site_id: "site-alpha",
        }}
        onCancel={vi.fn()}
        onPause={vi.fn()}
        onRetry={vi.fn()}
        onSetConcurrency={vi.fn()}
      />,
    );

    expect(screen.getByText("최근 완료 1건 · 4.0 KB")).toBeInTheDocument();
  });

  it("toggles failed transfer details", async () => {
    const user = userEvent.setup();

    render(
      <SiteSftpTransferQueuePanel
        concurrencyPending={false}
        mutationPending={false}
        pending={false}
        snapshot={{
          active_count: 0,
          cancelled_count: 0,
          concurrency_limit: 2,
          failed_count: 1,
          items: [
            {
              attempt_count: 2,
              completed_at_epoch_ms: 1_742_600_100n,
              copied_bytes: null,
              destination_path: "/var/www/html/error.log",
              direction: "upload",
              error_message: "Permission denied",
              id: "transfer-2",
              label: "error.log",
              queued_at_epoch_ms: 1_742_599_500n,
              recursive: false,
              site_id: "site-alpha",
              source_kind: "file",
              source_path: "/Users/test/error.log",
              status: "failed",
            },
          ],
          paused_count: 0,
          queued_count: 0,
          site_id: "site-alpha",
        }}
        onCancel={vi.fn()}
        onPause={vi.fn()}
        onRetry={vi.fn()}
        onSetConcurrency={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /실패 1건/i }));

    const details = screen.getByText("Failure Details").closest("div");
    expect(details).not.toBeNull();
    expect(within(details as HTMLElement).getByText("Permission denied")).toBeInTheDocument();
    expect(within(details as HTMLElement).getByText("/Users/test/error.log")).toBeInTheDocument();
  });
});
