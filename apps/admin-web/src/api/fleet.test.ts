import { afterEach, describe, expect, it, vi } from "vitest";

import {
  connectorLogin,
  connectorLogout,
  connectorRefresh,
  deleteAdminAuthByMember,
  deleteAdminSystemPermission,
  getAdminConfig,
  getAdminDashboard,
  getAdminFieldSchema,
  getMyProfile,
  listAdminAuth,
  listAdminFieldSchemas,
  listAdminSystemPermissions,
  openTerminalSocket,
  saveAdminSystemPermission,
  upsertAdminAuth,
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

  it("consumes all ten R11 auth operations without exposing connector credentials", async () => {
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

    await connectorLogin("site-a", {
      mb_id: "g5admin",
      mb_password: "secret",
    }, "csrf-1");
    await connectorRefresh("site-a", "csrf-1");
    await connectorLogout("site-a", "csrf-1");
    await getMyProfile("site-a");
    await listAdminAuth("site-a", { page: 1, per_page: 100 });
    await upsertAdminAuth("site-a", "auditor", [{
      au_menu: "100100",
      au_auth: "r,w",
    }], "csrf-1");
    await deleteAdminAuthByMember("site-a", "auditor", "csrf-1");
    await listAdminSystemPermissions("site-a", { page: 1, per_page: 100 });
    await saveAdminSystemPermission("site-a", {
      mb_id: "auditor",
      au_menu: "config_100",
      au_auth: "rw",
    }, "csrf-1");
    await deleteAdminSystemPermission(
      "site-a",
      "auditor",
      "config_100",
      "csrf-1",
    );

    expect(fetcher.mock.calls.map(([input, init]) => [
      String(input),
      init?.method,
    ])).toEqual([
      ["http://localhost:3000/api/v1/sites/site-a/connector/login", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/connector/refresh", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/connector/logout", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/member/me", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/auth?page=1&per_page=100", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/auth/auditor", "PUT"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/auth/auditor", "DELETE"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/permissions?page=1&per_page=100", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/permissions", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/permissions/auditor/config_100", "DELETE"],
    ]);
    expect(JSON.stringify(fetcher.mock.calls.slice(3))).not.toContain("secret");
    for (const [, init] of fetcher.mock.calls.filter(([, call]) =>
      call?.method !== "GET"
    )) {
      expect(new Headers(init?.headers).get("x-csrf-token")).toBe("csrf-1");
    }
  });
});
