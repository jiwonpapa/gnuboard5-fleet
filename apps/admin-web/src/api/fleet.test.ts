import { afterEach, describe, expect, it, vi } from "vitest";

import {
  addAdminBoardGroupMember,
  addAdminLegacyGroupMember,
  connectorLogin,
  connectorLogout,
  connectorRefresh,
  createAdminBoardGroup,
  createAdminLegacyGroup,
  deleteAdminBoardGroup,
  deleteAdminBoardGroupMember,
  deleteAdminLegacyGroup,
  deleteAdminLegacyGroupMember,
  deleteAdminMember,
  deleteAdminMemberMedia,
  deleteAdminAuthByMember,
  deleteAdminSystemPermission,
  exportAdminMembers,
  getAdminConfig,
  getAdminBoardGroup,
  getAdminDashboard,
  getAdminFieldSchema,
  getAdminMember,
  getAdminLegacyGroup,
  getMyProfile,
  listAdminAuth,
  listAdminBoardGroupMembers,
  listAdminBoardGroups,
  listAdminFieldSchemas,
  listAdminMembers,
  listAdminLegacyGroupMembers,
  listAdminLegacyGroups,
  listAdminSystemPermissions,
  openTerminalSocket,
  patchAdminBoardGroup,
  saveAdminSystemPermission,
  upsertAdminAuth,
  updateAdminConfig,
  updateAdminBoardGroup,
  updateAdminLegacyGroup,
  updateAdminMember,
  updateAdminMemberLevel,
  uploadAdminMemberMedia,
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

  it("consumes all ten R12 member operations through explicit site scope", async () => {
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

    await listAdminMembers("site-a", { page: 2, search: "member" });
    await exportAdminMembers("site-a", { search_field: "mb_id" });
    await getAdminMember("site-a", "member01");
    await updateAdminMember("site-a", "member01", { mb_nick: "새 닉네임" }, "csrf-1");
    await deleteAdminMember("site-a", "member01", "csrf-1");
    await updateAdminMemberLevel("site-a", "member01", 3, "csrf-1");
    await uploadAdminMemberMedia("site-a", "member01", "icon", {
      file_name: "icon.png",
      mime_type: "image/png",
      bytes_base64: "aWNvbg==",
    }, "csrf-1");
    await deleteAdminMemberMedia("site-a", "member01", "icon", "csrf-1");
    await uploadAdminMemberMedia("site-a", "member01", "image", {
      file_name: "image.jpg",
      mime_type: "image/jpeg",
      bytes_base64: "aW1hZ2U=",
    }, "csrf-1");
    await deleteAdminMemberMedia("site-a", "member01", "image", "csrf-1");

    expect(fetcher.mock.calls.map(([input, init]) => [
      String(input),
      init?.method,
    ])).toEqual([
      ["http://localhost:3000/api/v1/sites/site-a/admin/members?page=2&search=member", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/members/export?search_field=mb_id", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/members/member01", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/members/member01", "PATCH"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/members/member01", "DELETE"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/members/member01/level", "PATCH"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/members/member01/icon", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/members/member01/icon", "DELETE"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/members/member01/image", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/members/member01/image", "DELETE"],
    ]);
    for (const [, init] of fetcher.mock.calls.filter(([, call]) =>
      call?.method !== "GET"
    )) {
      expect(new Headers(init?.headers).get("x-csrf-token")).toBe("csrf-1");
    }
  });

  it("consumes all seventeen R13 group operations through explicit site scope", async () => {
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

    const create = { gr_id: "staff", gr_subject: "운영진" };
    const update = { gr_subject: "운영팀" };
    await listAdminBoardGroups("site-a");
    await createAdminBoardGroup("site-a", create, "csrf-1");
    await getAdminBoardGroup("site-a", "staff");
    await updateAdminBoardGroup("site-a", "staff", update, "csrf-1");
    await patchAdminBoardGroup("site-a", "staff", update, "csrf-1");
    await deleteAdminBoardGroup("site-a", "staff", "csrf-1");
    await listAdminBoardGroupMembers("site-a", "staff", { page: 2, search: "member" });
    await addAdminBoardGroupMember("site-a", "staff", "member01", "csrf-1");
    await deleteAdminBoardGroupMember("site-a", "staff", "member01", "csrf-1");
    await listAdminLegacyGroups("site-a");
    await createAdminLegacyGroup("site-a", create, "csrf-1");
    await getAdminLegacyGroup("site-a", "staff");
    await updateAdminLegacyGroup("site-a", "staff", update, "csrf-1");
    await deleteAdminLegacyGroup("site-a", "staff", "csrf-1");
    await listAdminLegacyGroupMembers("site-a", "staff", { per_page: 20 });
    await addAdminLegacyGroupMember("site-a", "staff", "member01", "csrf-1");
    await deleteAdminLegacyGroupMember("site-a", "staff", "member01", "csrf-1");

    expect(fetcher.mock.calls.map(([input, init]) => [String(input), init?.method])).toEqual([
      ["http://localhost:3000/api/v1/sites/site-a/admin/board-groups", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/board-groups", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/board-groups/staff", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/board-groups/staff", "PUT"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/board-groups/staff", "PATCH"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/board-groups/staff", "DELETE"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/board-groups/staff/members?page=2&search=member", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/board-groups/staff/members", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/board-groups/staff/members/member01", "DELETE"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/groups", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/groups", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/groups/staff", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/groups/staff", "PUT"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/groups/staff", "DELETE"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/groups/staff/members?per_page=20", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/groups/staff/members", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/groups/staff/members/member01", "DELETE"],
    ]);
    for (const [, init] of fetcher.mock.calls.filter(([, call]) => call?.method !== "GET")) {
      expect(new Headers(init?.headers).get("x-csrf-token")).toBe("csrf-1");
    }
  });
});
