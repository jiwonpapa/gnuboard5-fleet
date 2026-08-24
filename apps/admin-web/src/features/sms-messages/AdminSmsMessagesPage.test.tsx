import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { AdminSmsMessagesPage } from "./AdminSmsMessagesPage";

const api = vi.hoisted(() => ({
  createAdminSmsMessage: vi.fn(),
  getAdminSmsConfig: vi.fn(),
  listAdminSmsContactGroups: vi.fn(),
  listAdminSmsTemplates: vi.fn(),
}));
vi.mock("../../api/fleet", async (importOriginal) => ({ ...await importOriginal<typeof import("../../api/fleet")>(), ...api }));

function renderPage() {
  return render(<MemoryRouter initialEntries={["/sites/site-a/admin/sms-messages"]}><AuthSessionProvider value={{ idleTimeoutMinutes: 30, logout: async () => {}, session: { principal_id: "principal-1", web_session_id: "session-1", expires_at_unix: 1, step_up_active: true, csrf_token: "csrf-1" }, updateIdleTimeout: () => {}, updateSession: () => {} }}><Routes><Route path="/sites/:siteId/admin/sms-messages" element={<AdminSmsMessagesPage />} /></Routes></AuthSessionProvider></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getAdminSmsConfig.mockResolvedValue({ provider_ready: true, storage_ready: true });
  api.listAdminSmsContactGroups.mockResolvedValue({ groups: [{ bg_no: 3, bg_name: "VIP 고객", bg_count: 12 }], total: 1 });
  api.listAdminSmsTemplates.mockResolvedValue({ templates: [{ fo_no: 7, fg_no: 0, fg_name: "미분류", fg_member: 0, fo_name: "안내", fo_content: "운영 안내", fo_datetime: null }], pagination: {} });
  api.createAdminSmsMessage.mockResolvedValue({ write_no: 99, write_renum: 0, total: 1, success: 0, failure: 1, provider_ready: true });
});

describe("AdminSmsMessagesPage", () => {
  it("hydrates the reused template and group composition workspace", async () => {
    renderPage();
    expect(await screen.findByText("문자 보내기")).toBeVisible();
    expect(await screen.findByText("VIP 고객")).toBeVisible();
    expect(screen.getByRole("option", { name: "안내" })).toBeVisible();
    expect(api.getAdminSmsConfig).toHaveBeenCalledWith("site-a");
  });

  it("requires explicit confirmation before the typed external request", async () => {
    renderPage();
    fireEvent.change(await screen.findByLabelText("SMS 메시지"), { target: { value: "운영 공지" } });
    fireEvent.change(screen.getByLabelText("SMS 수동 수신자"), { target: { value: "홍길동,010-1234-5678" } });
    fireEvent.click(screen.getByRole("button", { name: "문자 발송 확인" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("문자 1건");
    expect(api.createAdminSmsMessage).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "발송 요청" }));
    await waitFor(() => expect(api.createAdminSmsMessage).toHaveBeenCalledWith("site-a", expect.objectContaining({ message: "운영 공지", manual_targets: [{ name: "홍길동", phone: "01012345678" }] }), "csrf-1"));
  });
});
