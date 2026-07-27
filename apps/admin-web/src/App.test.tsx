import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const path = new URL(input.toString()).pathname;
        if (path === "/healthz") {
          return new Response(
            JSON.stringify({
              status: "ok",
              service: "g5-fleet-admin-server",
              version: "0.1.0",
              uptime_seconds: 1,
            }),
            { status: 200 },
          );
        }
        if (path === "/api/v1/install/status") {
          return new Response(JSON.stringify({ state: "complete" }), {
            status: 200,
          });
        }
        if (path === "/api/v1/session") {
          return new Response(
            JSON.stringify({
              principal_id: "user-1",
              web_session_id: "session-1",
              expires_at_unix: 4_000_000_000,
              step_up_active: true,
              csrf_token: "csrf-current",
            }),
            { status: 200 },
          );
        }
        if (path === "/api/v1/security/settings") {
          return new Response(
            JSON.stringify({
              totp_enabled: true,
              session_idle_timeout_minutes: 30,
            }),
            { status: 200 },
          );
        }
        if (path === "/api/v1/dashboard") {
          return new Response(JSON.stringify({
            site_count: 0,
            attention_count: 0,
            active_job_count: 0,
            recent_activity: [],
          }), { status: 200 });
        }
        return new Response(
          JSON.stringify({
            api_version: "v1",
            product_name: "G5 Fleet",
            server_version: "0.1.0",
          }),
          { status: 200 },
        );
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the responsive operations shell and live server state", async () => {
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "통합 운영 현황" }),
    ).toBeVisible();
    expect(screen.getByRole("navigation", { name: "주요 메뉴" })).toBeVisible();
    expect(await screen.findByText("서버 정상")).toBeVisible();
    expect(screen.getByText("0.1.0")).toBeVisible();
  });
});
