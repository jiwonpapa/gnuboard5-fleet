import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { SecuritySettingsPage } from "./SecuritySettingsPage";

const { getFleetSessionMock, stepUpMock, updateIdleTimeoutMock } = vi.hoisted(() => ({
  getFleetSessionMock: vi.fn(async () => ({
    principal_id: "principal-1",
    web_session_id: "session-1",
    expires_at_unix: 4_000_000_000,
    step_up_active: true,
    csrf_token: "csrf-current",
  })),
  stepUpMock: vi.fn(async () => null),
  updateIdleTimeoutMock: vi.fn(async () => null),
}));

vi.mock("../../api/fleet", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../api/fleet")>();
  return {
    ...original,
    getSecuritySettings: vi.fn(async () => ({
      totp_enabled: true,
      session_idle_timeout_minutes: 30,
    })),
    getFleetSession: getFleetSessionMock,
    stepUp: stepUpMock,
    updateIdleTimeout: updateIdleTimeoutMock,
  };
});

describe("SecuritySettingsPage", () => {
  it("keeps OTP mandatory and updates the session idle policy", async () => {
    const updateIdleGuard = vi.fn();
    const updateSession = vi.fn();
    render(
      <AuthSessionProvider
        value={{
          idleTimeoutMinutes: 30,
          logout: vi.fn(),
          session: {
            principal_id: "principal-1",
            web_session_id: "session-1",
            expires_at_unix: 4_000_000_000,
            step_up_active: true,
            csrf_token: "csrf-current",
          },
          updateIdleTimeout: updateIdleGuard,
          updateSession,
        }}
      >
        <SecuritySettingsPage />
      </AuthSessionProvider>,
    );

    expect(await screen.findByText("필수 · 활성")).toBeVisible();
    expect(screen.queryByRole("button", { name: /OTP 비활성/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getAllByLabelText("현재 비밀번호")[0], {
      target: { value: "current-secret" },
    });
    fireEvent.change(screen.getAllByLabelText("현재 OTP")[0], {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "본인 확인" }));
    await waitFor(() => {
      expect(stepUpMock).toHaveBeenCalledWith(
        "current-secret",
        "csrf-current",
        { totpCode: "123456" },
      );
      expect(updateSession).toHaveBeenCalledWith(expect.objectContaining({ step_up_active: true }));
    });
    fireEvent.change(screen.getByLabelText("유휴 시간 (5–1440분)"), {
      target: { value: "45" },
    });
    fireEvent.click(screen.getByRole("button", { name: "시간 저장" }));

    await waitFor(() => {
      expect(updateIdleTimeoutMock).toHaveBeenCalledWith(45, "csrf-current");
      expect(updateIdleGuard).toHaveBeenCalledWith(45);
    });
  });
});
