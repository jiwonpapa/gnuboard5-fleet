import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { AdminPointsPage } from "./AdminPointsPage";

const api = vi.hoisted(() => ({
  createAdminPointAction: vi.fn(),
  deleteAdminPoints: vi.fn(),
  expireAdminPoints: vi.fn(),
  getAdminPointSummary: vi.fn(),
  listAdminPoints: vi.fn(),
}));

vi.mock("../../api/fleet", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../api/fleet")>(),
  ...api,
}));

const point = {
  po_id: 11,
  mb_id: "fleetcert",
  po_point: 100,
  po_datetime: "2026-08-18T00:00:00+00:00",
  po_content: "certification",
  po_use_point: 0,
  po_expired: 0,
  po_expire_date: "9999-12-31",
  po_mb_point: 100,
  po_rel_table: "@passive",
  po_rel_id: "fleetcert",
  po_rel_action: "grant",
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/sites/site-a/admin/points"]}>
      <AuthSessionProvider value={{
        idleTimeoutMinutes: 30,
        logout: async () => {},
        session: {
          principal_id: "principal-1",
          web_session_id: "session-1",
          expires_at_unix: 1,
          step_up_active: true,
          csrf_token: "csrf-1",
        },
        updateIdleTimeout: () => {},
        updateSession: () => {},
      }}>
        <Routes>
          <Route path="/sites/:siteId/admin/points" element={<AdminPointsPage />} />
        </Routes>
      </AuthSessionProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listAdminPoints.mockResolvedValue({
    items: [point],
    pagination: {
      mode: "page",
      total: 1,
      page: 1,
      per_page: 20,
      last_page: 1,
      cursor: null,
      next_cursor: null,
      has_next: false,
      has_prev: false,
    },
  });
  api.getAdminPointSummary.mockResolvedValue({
    mb_id: null,
    total_point: 100,
    total_rows: 1,
  });
  api.createAdminPointAction.mockResolvedValue({
    mb_id: "fleetcert",
    before_point: 100,
    changed_point: 20,
    after_point: 120,
    po_content: "browser",
    processed_at: "2026-08-18T00:00:00+00:00",
  });
  api.deleteAdminPoints.mockResolvedValue({ requested_count: 1, deleted_count: 1 });
  api.expireAdminPoints.mockResolvedValue({
    base_date: "2026-08-18",
    expired_count: 0,
    synced_members: 0,
  });
});

describe("AdminPointsPage", () => {
  it("loads point list and summary in explicit site scope", async () => {
    renderPage();
    expect(await screen.findByText("certification")).toBeVisible();
    expect(api.listAdminPoints).toHaveBeenCalledWith("site-a", {
      page: 1,
      per_page: 20,
      search_field: "mb_id",
    });
    expect(api.getAdminPointSummary).toHaveBeenCalledWith("site-a", undefined);
    expect(screen.getAllByText("100").length).toBeGreaterThanOrEqual(1);
  });

  it("grants through the canonical action and verifies list and summary readback", async () => {
    renderPage();
    await screen.findByText("certification");
    fireEvent.change(screen.getByLabelText("포인트 회원 아이디"), { target: { value: "fleetcert" } });
    fireEvent.change(screen.getByLabelText("포인트 금액"), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("포인트 사유"), { target: { value: "browser" } });
    fireEvent.click(screen.getByRole("button", { name: "포인트 지급·재조회" }));
    await waitFor(() => expect(api.createAdminPointAction).toHaveBeenCalledWith(
      "site-a",
      { action: "grant", mb_id: "fleetcert", point: 20, po_content: "browser" },
      "csrf-1",
    ));
    expect(await screen.findByText(/지급하고 목록·합계를 재조회/)).toBeVisible();
    expect(api.listAdminPoints).toHaveBeenCalledTimes(2);
    expect(api.getAdminPointSummary).toHaveBeenCalledTimes(2);
  });

  it("requires confirmation before deleting selected point rows", async () => {
    renderPage();
    await screen.findByText("certification");
    fireEvent.click(screen.getByLabelText("포인트 #11 선택"));
    fireEvent.click(screen.getByRole("button", { name: "선택 내역 삭제" }));
    expect(screen.getByRole("dialog", { name: "포인트 내역 삭제" })).toBeVisible();
    expect(api.deleteAdminPoints).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "삭제·재조회" }));
    await waitFor(() => expect(api.deleteAdminPoints).toHaveBeenCalledWith(
      "site-a", { po_ids: [11] }, "csrf-1",
    ));
  });
});
