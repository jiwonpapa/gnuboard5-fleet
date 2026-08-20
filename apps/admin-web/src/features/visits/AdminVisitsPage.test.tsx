import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { AdminVisitsPage } from "./AdminVisitsPage";

const api = vi.hoisted(() => ({ deleteAdminVisits: vi.fn(), getAdminVisitStats: vi.fn(), searchAdminVisits: vi.fn() }));
vi.mock("../../api/fleet", async (importOriginal) => ({ ...await importOriginal<typeof import("../../api/fleet")>(), ...api }));

const pagination = { mode: "page" as const, total: 1, page: 1, per_page: 50, last_page: 1, cursor: null, next_cursor: null, has_next: false, has_prev: false };

function renderPage() {
  return render(<MemoryRouter initialEntries={["/sites/site-a/admin/visits"]}><AuthSessionProvider value={{
    idleTimeoutMinutes: 30, logout: async () => {},
    session: { principal_id: "principal-1", web_session_id: "session-1", expires_at_unix: 1, step_up_active: true, csrf_token: "csrf-1" },
    updateIdleTimeout: () => {}, updateSession: () => {},
  }}><Routes><Route path="/sites/:siteId/admin/visits" element={<AdminVisitsPage />} /></Routes></AuthSessionProvider></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getAdminVisitStats.mockResolvedValue({ type: "date", summary: { total_visits: 2, active_days: 2, first_date: "2026-08-18", last_date: "2026-08-19", visit_rows: 2, unique_ips: 2 }, items: [{ stat_key: "2026-08-18", visit_count: 1 }] });
  api.searchAdminVisits.mockResolvedValue({ items: [{ vi_id: 1, vi_ip: "127.0.0.1", vi_date: "2026-08-18", vi_time: "09:10:00", vi_referer: "", vi_agent: "Mozilla", vi_browser: "Chrome", vi_os: "macOS", vi_device: "desktop" }], pagination });
  api.deleteAdminVisits.mockResolvedValue({ deleted_rows: 1, before: "2026-08-19", date_from: null, date_to: null, ip: null });
});

describe("AdminVisitsPage", () => {
  it("loads site-scoped stats and exposes the reused log search workspace", async () => {
    renderPage();
    expect(await screen.findByText("2026-08-18")).toBeVisible();
    expect(api.getAdminVisitStats).toHaveBeenCalledWith("site-a", { type: "date", limit: 30 });
    fireEvent.click(screen.getByRole("button", { name: "로그 검색" }));
    expect(await screen.findByText("127.0.0.1")).toBeVisible();
    expect(api.searchAdminVisits).toHaveBeenCalledWith("site-a", { page: 1, per_page: 50 });
  });

  it("requires visible conditions and confirmation before destructive readback", async () => {
    renderPage();
    await screen.findByText("2026-08-18");
    fireEvent.click(screen.getByRole("button", { name: "안전 삭제" }));
    fireEvent.click(screen.getByRole("button", { name: "삭제 조건 확인" }));
    expect(screen.getByRole("alert")).toHaveTextContent("삭제 조건을 하나 이상");
    fireEvent.change(screen.getByLabelText("기준일 이전"), { target: { value: "2026-08-19" } });
    fireEvent.click(screen.getByRole("button", { name: "삭제 조건 확인" }));
    expect(screen.getByRole("dialog", { name: "방문 로그 삭제 확인" })).toBeVisible();
    expect(api.deleteAdminVisits).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "조건 범위 삭제·재조회" }));
    await waitFor(() => expect(api.deleteAdminVisits).toHaveBeenCalledWith("site-a", { before: "2026-08-19" }, "csrf-1"));
    expect(await screen.findByText("방문 로그 1건을 삭제하고 통계와 검색 결과를 재조회했습니다.")).toBeVisible();
  });
});
