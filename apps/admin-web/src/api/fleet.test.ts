import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getAdminConfig,
  getAdminDashboard,
  getAdminFieldSchema,
  listAdminFieldSchemas,
  openTerminalSocket,
  updateAdminConfig,
} from "./fleet";

describe("remote Fleet transport", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps the one-time terminal ticket out of the WebSocket URL", () => {
    const sockets: Array<{ url: string; protocols: string[] }> = [];
    class FakeWebSocket {
      constructor(url: string | URL, protocols: string[]) {
        sockets.push({ url: url.toString(), protocols });
      }
    }
    vi.stubGlobal("WebSocket", FakeWebSocket);

    openTerminalSocket("site-a", "one-time-secret");

    expect(sockets).toHaveLength(1);
    expect(sockets[0]?.url).toBe(
      "ws://localhost:3000/api/v1/sites/site-a/terminal",
    );
    expect(sockets[0]?.url).not.toContain("one-time-secret");
    expect(sockets[0]?.protocols).toEqual([
      "g5-fleet-terminal",
      "ticket.one-time-secret",
    ]);
  });

  it("consumes all five R10 operations through site-scoped same-origin HTTP", async () => {
    const fetcher = vi.fn(async (
      _input: RequestInfo | URL,
      _init?: RequestInit,
    ) => {
      void _input;
      void _init;
      return new Response("{}", {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetcher);

    await getAdminDashboard("site-a", 5);
    await getAdminConfig("site-a");
    await updateAdminConfig("site-a", { cf_title: "Fleet" }, "csrf-1");
    await listAdminFieldSchemas("site-a");
    await getAdminFieldSchema("site-a", "config");

    expect(fetcher.mock.calls.map(([input, init]) => [
      String(input),
      init?.method,
    ])).toEqual([
      ["http://localhost:3000/api/v1/sites/site-a/admin/dashboard?limit=5", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/config", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/config", "PUT"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/schema", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/schema/config", "GET"],
    ]);
    const update = fetcher.mock.calls[2]?.[1];
    expect(update?.body).toBe(JSON.stringify({ cf_title: "Fleet" }));
    expect(new Headers(update?.headers).get("x-csrf-token")).toBe("csrf-1");
  });
});
