import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { AdminPushPage } from "./AdminPushPage";

const api = vi.hoisted(() => ({ createAdminPushMessage: vi.fn() }));
vi.mock("../../api/fleet", async (importOriginal) => ({ ...await importOriginal<typeof import("../../api/fleet")>(), ...api }));

function renderPage(stepUpActive = true) {
  return render(<MemoryRouter initialEntries={["/sites/site-a/admin/push"]}><AuthSessionProvider value={{ idleTimeoutMinutes: 30, logout: async () => {}, session: { principal_id: "principal-1", web_session_id: "session-1", expires_at_unix: 1, step_up_active: stepUpActive, csrf_token: "csrf-1" }, updateIdleTimeout: () => {}, updateSession: () => {} }}><Routes><Route path="/sites/:siteId/admin/push" element={<AdminPushPage />} /></Routes></AuthSessionProvider></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  api.createAdminPushMessage.mockResolvedValue({ requested_by: "admin", target_count: 2, queued: 2, failed: 0 });
});

describe("AdminPushPage", () => {
  it("requires explicit confirmation before the typed external request", async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Push 제목"), { target: { value: "운영 공지" } });
    fireEvent.change(screen.getByLabelText("Push 본문"), { target: { value: "점검 안내" } });
    fireEvent.change(screen.getByLabelText("Push 회원 ID"), { target: { value: "member-a, member-b" } });
    fireEvent.click(screen.getByRole("button", { name: "Push 발송 확인" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("2명");
    expect(api.createAdminPushMessage).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "발송 요청" }));
    await waitFor(() => expect(api.createAdminPushMessage).toHaveBeenCalledWith("site-a", expect.objectContaining({ member_ids: ["member-a", "member-b"] }), "csrf-1"));
  });

  it("keeps external delivery unavailable without recent OTP step-up", () => {
    renderPage(false);
    expect(screen.getByText("OTP 재인증 필요")).toBeVisible();
    expect(screen.getByRole("button", { name: "Push 발송 확인" })).toBeDisabled();
  });
});
