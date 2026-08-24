import { afterEach, describe, expect, it, vi } from "vitest";

import {
  addAdminBoardGroupMember,
  addAdminLegacyGroupMember,
  batchAdminSmsContacts,
  batchAdminSmsTemplates,
  clearAdminSmsContactGroup,
  clearAdminSmsTemplateGroup,
  connectorLogin,
  connectorLogout,
  connectorRefresh,
  copyAdminBoard,
  createAdminMailTemplate,
  createAdminMailTest,
  createAdminPointAction,
  createAdminLegacyPoll,
  createAdminSystemPoll,
  createAdminBoard,
  createAdminBoardGroup,
  createAdminLegacyGroup,
  createAdminSmsContact,
  createAdminSmsContactGroup,
  createAdminSmsTemplate,
  createAdminSmsTemplateGroup,
  deleteAdminBoardGroup,
  deleteAdminBoardGroupMember,
  deleteAdminBoard,
  deleteAdminNewPosts,
  deleteAdminQaBulk,
  deleteAdminLegacyGroup,
  deleteAdminLegacyGroupMember,
  deleteAdminPoints,
  deleteAdminLegacyPoll,
  deleteAdminSystemPoll,
  deleteAdminMember,
  deleteAdminMemberMedia,
  deleteAdminMail,
  deleteAdminVisits,
  deleteAdminAuthByMember,
  deleteAdminSmsContact,
  deleteAdminSmsContactGroup,
  deleteAdminSmsTemplate,
  deleteAdminSmsTemplateGroup,
  deleteAdminSystemPermission,
  exportAdminMembers,
  exportAdminSmsContacts,
  expireAdminPoints,
  getAdminConfig,
  getAdminBoardGroup,
  getAdminBoard,
  getAdminDashboard,
  getAdminFieldSchema,
  getAdminMember,
  getAdminPointSummary,
  getAdminPopularRank,
  getAdminQaConfig,
  getAdminReportStats,
  getAdminVisitStats,
  getAdminWriteCountStats,
  getAdminMail,
  getAdminSmsConfig,
  getAdminSmsContact,
  getAdminSmsContactGroup,
  getAdminSmsTemplate,
  getAdminSmsTemplateGroup,
  getAdminLegacyPoll,
  getAdminSystemPoll,
  getAdminLegacyGroup,
  getMyProfile,
  listAdminAuth,
  listAdminBoardGroupMembers,
  listAdminBoardGroups,
  listAdminBoards,
  listAdminFieldSchemas,
  listAdminMembers,
  listAdminMails,
  listAdminMailRecipients,
  listAdminPoints,
  listAdminPopular,
  listAdminReports,
  listAdminLegacyPolls,
  listAdminSystemPolls,
  listAdminLegacyGroupMembers,
  listAdminLegacyGroups,
  listAdminSystemPermissions,
  listAdminSystemMails,
  listAdminSystemMailRecipients,
  listAdminSmsContactGroups,
  listAdminSmsContacts,
  listAdminSmsTemplateGroups,
  listAdminSmsTemplates,
  openTerminalSocket,
  patchAdminBoardGroup,
  saveAdminSystemPermission,
  resetAdminPopular,
  searchAdminVisits,
  sendAdminMail,
  sendAdminMailTestLegacy,
  sendAdminSystemMailTest,
  sendAdminSystemMemberMail,
  importAdminSmsContacts,
  moveAdminSmsContactGroup,
  moveAdminSmsTemplateGroup,
  syncAdminSmsMembers,
  grantAdminPoint,
  deductAdminPoint,
  upsertAdminAuth,
  updateAdminConfig,
  updateAdminBoardGroup,
  updateAdminBoard,
  updateAdminLegacyGroup,
  updateAdminMember,
  updateAdminMemberLevel,
  updateAdminMailTemplate,
  updateAdminSmsConfig,
  updateAdminSmsContact,
  updateAdminSmsContactGroup,
  updateAdminSmsTemplate,
  updateAdminSmsTemplateGroup,
  updateAdminQaConfig,
  updateAdminReport,
  updateAdminLegacyPoll,
  updateAdminSystemPoll,
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

  it("consumes all seven R14 board operations through explicit site scope", async () => {
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
    const create = { bo_table: "notice", bo_subject: "공지", gr_id: "staff" };
    await listAdminBoards("site-a", { page: 2, search: "notice" });
    await createAdminBoard("site-a", create, "csrf-1");
    await getAdminBoard("site-a", "notice");
    await updateAdminBoard("site-a", "notice", { bo_subject: "새 공지" }, "csrf-1");
    await copyAdminBoard("site-a", "notice", { target_bo_table: "notice_copy", copy_posts: false }, "csrf-1");
    await deleteAdminNewPosts("site-a", [101, 102], "csrf-1");
    await deleteAdminBoard("site-a", "notice_copy", "csrf-1");

    expect(fetcher.mock.calls.map(([input, init]) => [String(input), init?.method])).toEqual([
      ["http://localhost:3000/api/v1/sites/site-a/admin/boards?page=2&search=notice", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/boards", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/boards/notice", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/boards/notice", "PUT"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/boards/notice/copy", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/boards/new-posts", "DELETE"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/boards/notice_copy", "DELETE"],
    ]);
    for (const [, init] of fetcher.mock.calls.filter(([, call]) => call?.method !== "GET")) {
      expect(new Headers(init?.headers).get("x-csrf-token")).toBe("csrf-1");
    }
  });

  it("consumes all seven R20 point operations through explicit site scope", async () => {
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
    const change = { mb_id: "fleetcert", point: 100, po_content: "certification" };
    await listAdminPoints("site-a", { page: 2, per_page: 20, mb_id: "fleetcert" });
    await createAdminPointAction("site-a", { action: "grant", ...change }, "csrf-1");
    await deleteAdminPoints("site-a", { po_ids: [11, 12] }, "csrf-1");
    await grantAdminPoint("site-a", change, "csrf-1");
    await deductAdminPoint("site-a", change, "csrf-1");
    await getAdminPointSummary("site-a", "fleetcert");
    await expireAdminPoints("site-a", { base_date: "2026-08-18" }, "csrf-1");

    expect(fetcher.mock.calls.map(([input, init]) => [String(input), init?.method])).toEqual([
      ["http://localhost:3000/api/v1/sites/site-a/admin/points?page=2&per_page=20&mb_id=fleetcert", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/points", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/points", "DELETE"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/points/grant", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/points/deduct", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/points/summary?mb_id=fleetcert", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/points/expire", "POST"],
    ]);
    for (const [, init] of fetcher.mock.calls.filter(([, call]) => call?.method !== "GET")) {
      expect(new Headers(init?.headers).get("x-csrf-token")).toBe("csrf-1");
    }
  });

  it("consumes all ten R21 poll operations through explicit site scope", async () => {
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
    const create = { po_subject: "R21", po_poll1: "찬성", po_poll2: "반대" };
    await listAdminSystemPolls("site-a", { page: 2, per_page: 20 });
    await createAdminSystemPoll("site-a", create, "csrf-1");
    await getAdminSystemPoll("site-a", 11);
    await updateAdminSystemPoll("site-a", 11, { po_subject: "R21 수정" }, "csrf-1");
    await deleteAdminSystemPoll("site-a", 11, "csrf-1");
    await listAdminLegacyPolls("site-a", { page: 3 });
    await createAdminLegacyPoll("site-a", { ...create, po_date: "2026-08-18" }, "csrf-1");
    await getAdminLegacyPoll("site-a", 12);
    await updateAdminLegacyPoll("site-a", 12, { po_use: 0 }, "csrf-1");
    await deleteAdminLegacyPoll("site-a", 12, "csrf-1");

    expect(fetcher.mock.calls.map(([input, init]) => [String(input), init?.method])).toEqual([
      ["http://localhost:3000/api/v1/sites/site-a/admin/system/polls?page=2&per_page=20", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/system/polls", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/system/polls/11", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/system/polls/11", "PUT"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/system/polls/11", "DELETE"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/polls?page=3", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/polls", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/polls/12", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/polls/12", "PATCH"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/polls/12", "DELETE"],
    ]);
    for (const [, init] of fetcher.mock.calls.filter(([, call]) => call?.method !== "GET")) {
      expect(new Headers(init?.headers).get("x-csrf-token")).toBe("csrf-1");
    }
  });

  it("consumes all three R23 popular operations through explicit site scope", async () => {
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

    await listAdminPopular("site-a", {
      page: 2, per_page: 20, date_from: "2026-08-01", date_to: "2026-08-20",
    });
    await getAdminPopularRank("site-a", { limit: 10, date_from: "2026-08-01" });
    await resetAdminPopular("site-a", { date_to: "2026-08-20" }, "csrf-1");

    expect(fetcher.mock.calls.map(([input, init]) => [String(input), init?.method])).toEqual([
      ["http://localhost:3000/api/v1/sites/site-a/admin/popular?page=2&per_page=20&date_from=2026-08-01&date_to=2026-08-20", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/popular/rank?limit=10&date_from=2026-08-01", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/popular", "DELETE"],
    ]);
    const reset = fetcher.mock.calls[2]?.[1];
    expect(reset?.body).toBe(JSON.stringify({ date_to: "2026-08-20" }));
    expect(new Headers(reset?.headers).get("x-csrf-token")).toBe("csrf-1");
  });

  it("consumes all three R24 visit operations without exposing G5 credentials", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      void _input;
      void _init;
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetcher);
    await getAdminVisitStats("site-a", { type: "device", limit: 30, date_from: "2026-08-01" });
    await searchAdminVisits("site-a", { page: 2, per_page: 50, ip: "127.0.0.1" });
    await deleteAdminVisits("site-a", { before: "2026-08-01" }, "csrf-1");
    expect(fetcher.mock.calls.map(([input, init]) => [String(input), init?.method])).toEqual([
      ["http://localhost:3000/api/v1/sites/site-a/admin/visits/stats?date_from=2026-08-01&type=device&limit=30", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/visits/search?page=2&per_page=50&ip=127.0.0.1", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/visits", "DELETE"],
    ]);
    expect(fetcher.mock.calls[2]?.[1]?.body).toBe(JSON.stringify({ before: "2026-08-01" }));
    expect(new Headers(fetcher.mock.calls[2]?.[1]?.headers).get("x-csrf-token")).toBe("csrf-1");
  });

  it("consumes all three R25 report operations through explicit site scope", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      void _input; void _init;
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetcher);
    await listAdminReports("site-a", { status: "pending", target_type: "post", page: 2, per_page: 20 });
    await getAdminReportStats("site-a");
    await updateAdminReport("site-a", 41, { status: "approved", admin_memo: "검토 완료" }, "csrf-1");
    expect(fetcher.mock.calls.map(([input, init]) => [String(input), init?.method])).toEqual([
      ["http://localhost:3000/api/v1/sites/site-a/admin/reports?status=pending&target_type=post&page=2&per_page=20", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/reports/stats", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/reports/41", "PATCH"],
    ]);
    expect(fetcher.mock.calls[2]?.[1]?.body).toBe(JSON.stringify({ status: "approved", admin_memo: "검토 완료" }));
    expect(new Headers(fetcher.mock.calls[2]?.[1]?.headers).get("x-csrf-token")).toBe("csrf-1");
  });

  it("consumes all three R26 QA operations through explicit site scope", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      void _input; void _init;
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetcher);
    await getAdminQaConfig("site-a");
    await updateAdminQaConfig("site-a", { qa_title: "Fleet 문의" }, "csrf-1");
    await deleteAdminQaBulk("site-a", { qa_ids: [71, 72] }, "csrf-1");
    expect(fetcher.mock.calls.map(([input, init]) => [String(input), init?.method])).toEqual([
      ["http://localhost:3000/api/v1/sites/site-a/admin/system/qa-config", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/system/qa-config", "PUT"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/qa", "DELETE"],
    ]);
    expect(fetcher.mock.calls[1]?.[1]?.body).toBe(JSON.stringify({ qa_title: "Fleet 문의" }));
    expect(fetcher.mock.calls[2]?.[1]?.body).toBe(JSON.stringify({ qa_ids: [71, 72] }));
    expect(new Headers(fetcher.mock.calls[1]?.[1]?.headers).get("x-csrf-token")).toBe("csrf-1");
    expect(new Headers(fetcher.mock.calls[2]?.[1]?.headers).get("x-csrf-token")).toBe("csrf-1");
  });

  it("consumes the R27 write-count operation through explicit site scope", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      void _input; void _init;
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetcher);
    await getAdminWriteCountStats("site-a", {
      period: "week", date_from: "2026-08-01", date_to: "2026-08-21", bo_table: "notice",
    });
    expect(fetcher.mock.calls.map(([input, init]) => [String(input), init?.method])).toEqual([
      ["http://localhost:3000/api/v1/sites/site-a/admin/write-count/stats?period=week&date_from=2026-08-01&date_to=2026-08-21&bo_table=notice", "GET"],
    ]);
  });

  it("consumes all thirteen R28 mail operations with confirmation on external effects", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      void _input; void _init;
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetcher);
    const template = { ma_subject: "안내", ma_content: "본문" };
    const send = { ma_id: 11, target_type: "member" as const, mb_ids: ["fleetcert"], mailling_only: true, dry_run: true };
    const test = { ma_id: 11, to: "admin@example.test" };
    await listAdminMails("site-a", { page: 1, per_page: 20 });
    await sendAdminMail("site-a", send, "csrf-1");
    await createAdminMailTemplate("site-a", template, "csrf-1");
    await listAdminMailRecipients("site-a", { search: "fleet", level_min: 2, mailling_only: true });
    await createAdminMailTest("site-a", test, "csrf-1");
    await sendAdminMailTestLegacy("site-a", test, "csrf-1");
    await getAdminMail("site-a", 11);
    await updateAdminMailTemplate("site-a", 11, template, "csrf-1");
    await deleteAdminMail("site-a", 11, "csrf-1");
    await listAdminSystemMails("site-a", { page: 1, per_page: 20 });
    await listAdminSystemMailRecipients("site-a", { page: 1, per_page: 20, search: "fleet" });
    await sendAdminSystemMailTest("site-a", { to: "admin@example.test", subject: "점검", content: "본문" }, "csrf-1");
    await sendAdminSystemMemberMail("site-a", { ma_id: 11, mb_ids: ["fleetcert"], mailling_only: true, dry_run: true }, "csrf-1");
    expect(fetcher.mock.calls.map(([input, init]) => [String(input), init?.method])).toEqual([
      ["http://localhost:3000/api/v1/sites/site-a/admin/mails?page=1&per_page=20", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/mails", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/mails/templates", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/mails/recipients?search=fleet&level_min=2&mailling_only=true", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/mails/test", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/mails/test/legacy", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/mails/11", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/mails/11", "PUT"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/mails/11", "DELETE"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/system/mails?page=1&per_page=20", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/system/mail-recipients?page=1&per_page=20&search=fleet", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/system/mails/test", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/system/mails/send", "POST"],
    ]);
    for (const index of [1, 4, 5, 11, 12]) {
      expect(JSON.parse(String(fetcher.mock.calls[index]?.[1]?.body))).toMatchObject({ confirm_send: true });
      expect(new Headers(fetcher.mock.calls[index]?.[1]?.headers).get("x-csrf-token")).toBe("csrf-1");
    }
  });

  it("consumes all three R29 SMS config operations with confirmed local mutation", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      void _input; void _init;
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetcher);
    await getAdminSmsConfig("site-a");
    await updateAdminSmsConfig("site-a", { cf_phone: "02-1234-5678" }, "csrf-1");
    await syncAdminSmsMembers("site-a", "csrf-1");
    expect(fetcher.mock.calls.map(([input, init]) => [String(input), init?.method])).toEqual([
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/config", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/config", "PUT"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/member-sync", "POST"],
    ]);
    expect(fetcher.mock.calls[1]?.[1]?.body).toBe(JSON.stringify({ cf_phone: "02-1234-5678" }));
    expect(fetcher.mock.calls[2]?.[1]?.body).toBe(JSON.stringify({ confirm_sync: true }));
    for (const index of [1, 2]) {
      expect(new Headers(fetcher.mock.calls[index]?.[1]?.headers).get("x-csrf-token")).toBe("csrf-1");
    }
  });

  it("consumes all fifteen R30 SMS contact operations with destructive confirmations", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      void _input; void _init;
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetcher);
    await listAdminSmsContactGroups("site-a");
    await createAdminSmsContactGroup("site-a", "Fleet", "csrf-1");
    await getAdminSmsContactGroup("site-a", 2);
    await updateAdminSmsContactGroup("site-a", 2, "Fleet 2", "csrf-1");
    await deleteAdminSmsContactGroup("site-a", 2, "csrf-1");
    await moveAdminSmsContactGroup("site-a", 2, 1, "csrf-1");
    await clearAdminSmsContactGroup("site-a", 2, "csrf-1");
    await listAdminSmsContacts("site-a", { page: 1, per_page: 20, bg_no: 1, search_field: "name", search: "Fleet", with_phone_only: true });
    await createAdminSmsContact("site-a", { bg_no: 1, bk_name: "Fleet", bk_hp: "01012345678" }, "csrf-1");
    await getAdminSmsContact("site-a", 7);
    await updateAdminSmsContact("site-a", 7, { bk_name: "Fleet 2" }, "csrf-1");
    await deleteAdminSmsContact("site-a", 7, "csrf-1");
    await batchAdminSmsContacts("site-a", { action: "reject", contact_ids: [7] }, "csrf-1");
    await importAdminSmsContacts("site-a", { bg_no: 1, dry_run: false, contacts: [{ name: "Fleet", phone: "01012345678" }] }, "csrf-1");
    await exportAdminSmsContacts("site-a", { bg_no: 1, include_no_phone: false, with_hyphen: true });
    expect(fetcher.mock.calls.map(([input, init]) => [String(input), init?.method])).toEqual([
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/contact-groups", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/contact-groups", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/contact-groups/2", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/contact-groups/2", "PUT"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/contact-groups/2?confirm=true", "DELETE"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/contact-groups/2/move", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/contact-groups/2/contacts?confirm=true", "DELETE"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/contacts?page=1&per_page=20&bg_no=1&search_field=name&search=Fleet&with_phone_only=true", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/contacts", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/contacts/7", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/contacts/7", "PUT"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/contacts/7?confirm=true", "DELETE"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/contacts/batch", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/contacts/import", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/contacts/export?bg_no=1&include_no_phone=false&with_hyphen=true", "GET"],
    ]);
    expect(JSON.parse(String(fetcher.mock.calls[12]?.[1]?.body))).toMatchObject({ confirm_action: true });
    expect(JSON.parse(String(fetcher.mock.calls[13]?.[1]?.body))).toMatchObject({ confirm_import: true, dry_run: false });
  });

  it("consumes all thirteen R31 SMS template operations with destructive confirmations", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      void _input; void _init;
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetcher);
    await listAdminSmsTemplateGroups("site-a");
    await createAdminSmsTemplateGroup("site-a", { fg_name: "Fleet", fg_member: 1 }, "csrf-1");
    await getAdminSmsTemplateGroup("site-a", 2);
    await updateAdminSmsTemplateGroup("site-a", 2, { fg_name: "Fleet 2" }, "csrf-1");
    await deleteAdminSmsTemplateGroup("site-a", 2, "csrf-1");
    await moveAdminSmsTemplateGroup("site-a", 2, 0, "csrf-1");
    await clearAdminSmsTemplateGroup("site-a", 2, "csrf-1");
    await listAdminSmsTemplates("site-a", { page: 1, per_page: 20, fg_no: 0, search_field: "name", search: "Fleet" });
    await createAdminSmsTemplate("site-a", { fg_no: 0, fo_name: "Fleet", fo_content: "Body" }, "csrf-1");
    await batchAdminSmsTemplates("site-a", { action: "move", template_ids: [7], target_fg_no: 0 }, "csrf-1");
    await getAdminSmsTemplate("site-a", 7);
    await updateAdminSmsTemplate("site-a", 7, { fo_name: "Fleet 2" }, "csrf-1");
    await deleteAdminSmsTemplate("site-a", 7, "csrf-1");
    expect(fetcher.mock.calls.map(([input, init]) => [String(input), init?.method])).toEqual([
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/template-groups", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/template-groups", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/template-groups/2", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/template-groups/2", "PUT"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/template-groups/2?confirm=true", "DELETE"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/template-groups/2/move", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/template-groups/2/templates?confirm=true", "DELETE"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/templates?page=1&per_page=20&fg_no=0&search_field=name&search=Fleet", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/templates", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/templates/batch", "POST"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/templates/7", "GET"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/templates/7", "PUT"],
      ["http://localhost:3000/api/v1/sites/site-a/admin/sms/templates/7?confirm=true", "DELETE"],
    ]);
    expect(JSON.parse(String(fetcher.mock.calls[9]?.[1]?.body))).toMatchObject({ confirm_action: true, target_fg_no: 0 });
    for (const index of [1, 3, 4, 5, 6, 8, 9, 11, 12]) {
      expect(new Headers(fetcher.mock.calls[index]?.[1]?.headers).get("x-csrf-token")).toBe("csrf-1");
    }
  });
});
