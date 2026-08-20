import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { AdminReportsPage } from "./AdminReportsPage";

const api = vi.hoisted(() => ({ getAdminReportStats: vi.fn(), listAdminReports: vi.fn(), updateAdminReport: vi.fn() }));
vi.mock("../../api/fleet", async (importOriginal) => ({ ...await importOriginal<typeof import("../../api/fleet")>(), ...api }));

const item = { rp_id: 41, mb_id: "member01", rp_target_type: "post", rp_target_id: "notice:10", rp_reason: "spam", rp_detail: "중복 홍보 게시물", rp_status: "pending", rp_admin_memo: null, rp_datetime: "2026-08-18 09:00:00", rp_processed_at: null };
const pagination = { mode: "page" as const, total: 1, page: 1, per_page: 20, last_page: 1, cursor: null, next_cursor: null, has_next: false, has_prev: false };

function renderPage() {
  return render(<MemoryRouter initialEntries={["/sites/site-a/admin/reports"]}><AuthSessionProvider value={{
    idleTimeoutMinutes: 30, logout: async () => {},
    session: { principal_id: "principal-1", web_session_id: "session-1", expires_at_unix: 1, step_up_active: true, csrf_token: "csrf-1" },
    updateIdleTimeout: () => {}, updateSession: () => {},
  }}><Routes><Route path="/sites/:siteId/admin/reports" element={<AdminReportsPage />} /></Routes></AuthSessionProvider></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listAdminReports.mockResolvedValue({ items: [item], pagination });
  api.getAdminReportStats.mockResolvedValue({ total: 1, pending: 1, approved: 0, rejected: 0, hold: 0 });
  api.updateAdminReport.mockResolvedValue({ ...item, rp_status: "approved", rp_admin_memo: "검토 완료", rp_processed_at: "2026-08-20 12:00:00" });
});

describe("AdminReportsPage", () => {
  it("loads site-scoped report list and summary", async () => {
    renderPage();
    expect((await screen.findAllByText("#41"))[0]).toBeVisible();
    expect(screen.getByText("중복 홍보 게시물")).toBeVisible();
    expect(api.listAdminReports).toHaveBeenCalledWith("site-a", { page: 1, per_page: 20 });
    expect(api.getAdminReportStats).toHaveBeenCalledWith("site-a");
  });

  it("confirms a state transition and reads list and stats back", async () => {
    renderPage();
    await screen.findAllByText("#41");
    fireEvent.change(screen.getByLabelText("처리 상태"), { target: { value: "approved" } });
    fireEvent.change(screen.getByLabelText("운영 메모"), { target: { value: " 검토 완료 " } });
    fireEvent.click(screen.getByRole("button", { name: "처리 내용 확인" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("승인 상태로 저장");
    expect(api.updateAdminReport).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "확인" }));
    await waitFor(() => expect(api.updateAdminReport).toHaveBeenCalledWith("site-a", 41, { status: "approved", admin_memo: "검토 완료" }, "csrf-1"));
    expect(await screen.findByText("신고 #41 상태를 저장하고 목록·통계를 재조회했습니다.")).toBeVisible();
    expect(api.listAdminReports).toHaveBeenCalledTimes(2);
    expect(api.getAdminReportStats).toHaveBeenCalledTimes(2);
  });
});
