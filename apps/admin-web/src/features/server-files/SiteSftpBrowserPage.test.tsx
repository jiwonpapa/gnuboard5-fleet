import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SiteSftpBrowserPage } from "./SiteSftpBrowserPage";

describe("SiteSftpBrowserPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("consumes typed file operations and persistent transfer snapshot", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(input.toString()).pathname;
      if (path.endsWith("/transfers")) {
        return new Response(
          JSON.stringify({
            site_id: "site-a",
            jobs: [],
            active_count: 0,
            queued_count: 0,
            paused_count: 0,
            failed_count: 0,
            concurrency_limit: 2,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (path.endsWith("/sftp") && init?.method === "POST") {
        const operation = JSON.parse(String(init.body)) as {
          action: string;
          path: string;
        };
        return new Response(
          JSON.stringify({
            output: "drwxr-xr-x deploy www-data 4096 Jul 27 12:00 assets",
            resolved_path: operation.path,
            parent_path: operation.path === "/" ? null : "/",
            entries: operation.path === "/"
              ? [
                  {
                    name: "assets",
                    path: "/assets",
                    kind: "directory",
                    size: 4096,
                    permissions: "drwxr-xr-x",
                    owner: "deploy",
                    group: "www-data",
                    modified: "Jul 27 12:00",
                  },
                  {
                    name: "index.php",
                    path: "/index.php",
                    kind: "file",
                    size: 128,
                    permissions: "-rw-r--r--",
                    owner: "deploy",
                    group: "www-data",
                    modified: "Jul 27 12:00",
                  },
                ]
              : [],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response("{}", {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetcher);

    render(
      <SiteSftpBrowserPage
        csrfToken="csrf"
        profileReady
        siteId="site-a"
        onError={vi.fn()}
      />,
    );
    await screen.findByText("전송 이력이 없습니다.");
    await screen.findByRole("button", { name: "assets" });
    expect(screen.getByRole("button", { name: "index.php" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "assets" }));
    await waitFor(() => {
      const listedPaths = fetcher.mock.calls
        .filter(([, init]) => init?.method === "POST" && init.body)
        .map(([, init]) => JSON.parse(String(init?.body)) as { path?: string })
        .map((operation) => operation.path);
      expect(listedPaths).toContain("/assets");
    });
    await waitFor(() => {
      expect(screen.getByLabelText("현재 remote path")).toHaveValue("/assets");
    });

    fireEvent.change(screen.getByLabelText("현재 remote path"), {
      target: { value: "/var/www" },
    });
    fireEvent.click(screen.getByRole("button", { name: "경로 이동" }));
    await waitFor(() => {
      const listedPaths = fetcher.mock.calls
        .filter(([, init]) => init?.method === "POST" && init.body)
        .map(([, init]) => JSON.parse(String(init?.body)) as { path?: string })
        .map((operation) => operation.path);
      expect(listedPaths).toContain("/var/www");
    });

    expect(fetcher.mock.calls.some(([input, init]) => (
      new URL(input.toString()).pathname === "/api/v1/sites/site-a/sftp"
      && init?.method === "POST"
    ))).toBe(true);
  });

  it("resubmits browser bytes after an authorized failed upload retry", async () => {
    const fetcher = vi.fn(async (
      input: RequestInfo | URL,
      _init?: RequestInit,
    ) => {
      void _init;
      const path = new URL(input.toString()).pathname;
      if (path.endsWith("/sftp")) {
        return new Response(
          JSON.stringify({
            output: "",
            resolved_path: "/",
            parent_path: null,
            entries: [],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (path.endsWith("/transfers")) {
        return new Response(
          JSON.stringify({
            site_id: "site-a",
            jobs: [{
              job_id: "job-failed",
              owner_user_id: "user-a",
              site_id: "site-a",
              kind: "sftp_upload",
              state: "failed",
              input: { remote_path: "/var/www/retry.txt" },
              result: { error_code: "remote_transfer_failed" },
              created_at: "2026-07-27T00:00:00Z",
              updated_at: "2026-07-27T00:00:00Z",
            }],
            active_count: 0,
            queued_count: 0,
            paused_count: 0,
            failed_count: 1,
            concurrency_limit: 2,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (path.endsWith("/job-failed/retry")) {
        return new Response(null, { status: 204 });
      }
      if (path.endsWith("/transfers/upload")) {
        return new Response(
          JSON.stringify({
            job_id: "job-retry",
            owner_user_id: "user-a",
            site_id: "site-a",
            kind: "sftp_upload",
            state: "succeeded",
            input: { remote_path: "/var/www/retry.txt" },
            result: { bytes: 5, progress: 100 },
            created_at: "2026-07-27T00:00:01Z",
            updated_at: "2026-07-27T00:00:02Z",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response("{}", { status: 404 });
    });
    vi.stubGlobal("fetch", fetcher);

    render(
      <SiteSftpBrowserPage
        csrfToken="csrf"
        profileReady
        siteId="site-a"
        onError={vi.fn()}
      />,
    );
    await screen.findByText("/var/www/retry.txt · failed");
    fireEvent.click(screen.getByRole("button", { name: "재시도" }));
    await waitFor(() => {
      expect(fetcher.mock.calls.some(([input]) => (
        new URL(input.toString()).pathname.endsWith("/job-failed/retry")
      ))).toBe(true);
    });
    fireEvent.change(screen.getByLabelText("업로드 파일"), {
      target: { files: [new File(["retry"], "retry.txt")] },
    });

    await waitFor(() => {
      const upload = fetcher.mock.calls.find(([input]) => (
        new URL(input.toString()).pathname.endsWith("/transfers/upload")
      ));
      expect(upload?.[1]).toEqual(expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-g5-remote-path": "/var/www/retry.txt",
        }),
      }));
    });
  });
});
