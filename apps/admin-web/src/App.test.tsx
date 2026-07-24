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
    expect(screen.getByRole("heading", { name: "연결 상태" })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "주요 메뉴" })).toBeVisible();
    expect(await screen.findByText("서버 정상")).toBeVisible();
    expect(screen.getByText("0.1.0")).toBeVisible();
  });
});
