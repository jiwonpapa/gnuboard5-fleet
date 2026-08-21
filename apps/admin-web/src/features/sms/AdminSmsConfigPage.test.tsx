import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminSmsConfig } from "../../api/fleet";
import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { AdminSmsConfigPage } from "./AdminSmsConfigPage";

const api = vi.hoisted(() => ({
  getAdminSmsConfig: vi.fn(),
  syncAdminSmsMembers: vi.fn(),
  updateAdminSmsConfig: vi.fn(),
}));
vi.mock("../../api/fleet", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../api/fleet")>(),
  ...api,
}));

const config: AdminSmsConfig = {
  cf_title: "그누보드",
  cf_sms_use: "icode",
  cf_sms_type: "LMS",
  cf_icode_id: "icode-user",
  cf_icode_pw: null,
  cf_icode_server_ip: "121.78.96.124",
  cf_icode_server_port: "7295",
  cf_icode_token_key: null,
  cf_phone: "02-1234-5678",
  cf_datetime: "2026-08-21 12:00:00",
  provider_ready: true,
  uses_token_key: true,
  uses_legacy_credentials: false,
  storage_ready: true,
  missing_tables: [],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/sites/site-a/admin/sms"]}>
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
        <Routes><Route path="/sites/:siteId/admin/sms" element={<AdminSmsConfigPage />} /></Routes>
      </AuthSessionProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getAdminSmsConfig.mockResolvedValue(config);
  api.updateAdminSmsConfig.mockResolvedValue(config);
  api.syncAdminSmsMembers.mockResolvedValue({
    datetime: "2026-08-21 12:30:00",
    summary: {
      total_members: 12,
      leave_members: 1,
      phone_empty: 2,
      phone_valid: 8,
      phone_invalid: 1,
      receipt_enabled: 7,
      receipt_disabled: 5,
    },
  });
});

describe("AdminSmsConfigPage", () => {
  it("hydrates site-scoped provider status without exposing secrets", async () => {
    renderPage();
    expect(await screen.findByDisplayValue("icode-user")).toBeVisible();
    expect(screen.getByPlaceholderText("설정됨 · 교체할 때만 입력")).toHaveValue("");
    expect(screen.getByText("Token")).toBeVisible();
    expect(api.getAdminSmsConfig).toHaveBeenCalledWith("site-a");
  });

  it("sends a diff-only update and reads configuration back", async () => {
    renderPage();
    fireEvent.change(await screen.findByLabelText("전송 타입"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "변경 1개 저장·재조회" }));
    await waitFor(() => expect(api.updateAdminSmsConfig).toHaveBeenCalledWith(
      "site-a",
      { cf_sms_type: "" },
      "csrf-1",
    ));
    expect(await screen.findByText("1개 SMS 설정을 저장하고 서버 값을 재조회했습니다.")).toBeVisible();
    expect(api.getAdminSmsConfig).toHaveBeenCalledTimes(2);
  });

  it("requires explicit confirmation before the member sync mutation", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "회원 동기화 확인" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("외부 문자는 발송되지 않습니다.");
    expect(api.syncAdminSmsMembers).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "동기화·재조회" }));
    await waitFor(() => expect(api.syncAdminSmsMembers).toHaveBeenCalledWith("site-a", "csrf-1"));
    expect(await screen.findByText("회원 12건을 동기화하고 설정을 재조회했습니다.")).toBeVisible();
    expect(screen.getByText("8")).toBeVisible();
  });
});
