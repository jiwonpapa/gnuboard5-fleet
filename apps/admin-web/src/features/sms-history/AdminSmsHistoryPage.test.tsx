import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { AdminSmsHistoryPage } from "./AdminSmsHistoryPage";

const api = vi.hoisted(() => ({
  getAdminSmsConfig: vi.fn(), getAdminSmsMessageBatch: vi.fn(), listAdminSmsDeliveries: vi.fn(),
  listAdminSmsMessageBatches: vi.fn(), resendAdminSmsBatchAll: vi.fn(), resendAdminSmsFailures: vi.fn(),
}));
vi.mock("../../api/fleet", async (importOriginal) => ({ ...await importOriginal<typeof import("../../api/fleet")>(), ...api }));

const pagination = { mode: "page", total: 1, page: 1, per_page: 20, last_page: 1, cursor: null, next_cursor: null, has_next: false, has_prev: false };
const batch = { wr_no: 11, wr_renum: 0, wr_reply: "021234567", wr_message: "테스트 발송", wr_booking: null, wr_total: 4, wr_re_total: 0, wr_success: 3, wr_failure: 1, wr_datetime: "2026-08-24 09:00:00", wr_memo: null, duplicate_summary: null };

function renderPage() {
  return render(<MemoryRouter initialEntries={["/sites/site-a/admin/sms-history"]}><AuthSessionProvider value={{ idleTimeoutMinutes: 30, logout: async () => {}, session: { principal_id: "principal-1", web_session_id: "session-1", expires_at_unix: 1, step_up_active: true, csrf_token: "csrf-1" }, updateIdleTimeout: () => {}, updateSession: () => {} }}><Routes><Route path="/sites/:siteId/admin/sms-history" element={<AdminSmsHistoryPage />} /></Routes></AuthSessionProvider></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getAdminSmsConfig.mockResolvedValue({ storage_ready: true });
  api.listAdminSmsMessageBatches.mockResolvedValue({ batches: [batch], pagination });
  api.getAdminSmsMessageBatch.mockResolvedValue({ ...batch, retry_batches: [], deliveries: [], deliveries_pagination: pagination });
  api.listAdminSmsDeliveries.mockResolvedValue({ deliveries: [{ hs_no: 8, wr_no: 11, wr_renum: 0, hs_name: "홍길동", hs_hp: "01012345678", hs_code: "0000", hs_memo: "성공", hs_datetime: "2026-08-24 09:00:01" }], pagination });
  api.resendAdminSmsFailures.mockResolvedValue({ success: 1, failure: 0 });
});

describe("AdminSmsHistoryPage", () => {
  it("renders batch detail and number-level delivery views", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "11/0" }));
    expect(await screen.findByText("배치 상세 / 재전송")).toBeVisible();
    expect((await screen.findAllByText("테스트 발송")).length).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole("tab", { name: "전송내역-번호별" }));
    expect(await screen.findByText("홍길동")).toBeVisible();
    expect(api.listAdminSmsDeliveries).toHaveBeenCalledWith("site-a", expect.objectContaining({ search_field: "hp" }));
  });

  it("requires explicit confirmation before a failure resend", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "11/0" }));
    fireEvent.click(await screen.findByRole("button", { name: "실패건 재전송 확인" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("실패건 재전송");
    expect(api.resendAdminSmsFailures).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "재전송 요청" }));
    await waitFor(() => expect(api.resendAdminSmsFailures).toHaveBeenCalledWith("site-a", 11, { wr_renum: 0 }, "csrf-1"));
  });
});
