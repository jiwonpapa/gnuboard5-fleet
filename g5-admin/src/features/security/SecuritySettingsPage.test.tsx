import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../layout/theme";
import { SecuritySettingsPage } from "./SecuritySettingsPage";

const hookMocks = vi.hoisted(() => ({
  useFastUnlock: vi.fn(),
  useSecuritySettings: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("./use-security-settings", () => ({
  useSecuritySettings: hookMocks.useSecuritySettings,
}));

vi.mock("./use-fast-unlock", () => ({
  useFastUnlock: hookMocks.useFastUnlock,
}));

vi.mock("sonner", () => ({
  toast: {
    success: hookMocks.toastSuccess,
  },
}));

describe("SecuritySettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookMocks.useSecuritySettings.mockReturnValue({
      changePassword: vi.fn(),
      changePasswordError: null,
      changePasswordPending: false,
      disableTotp: vi.fn(),
      disableTotpError: null,
      disableTotpPending: false,
      enableTotp: vi.fn(),
      enableTotpError: null,
      enableTotpPending: false,
      isLoading: false,
      refetchSettings: vi.fn(),
      settings: {
        idle_timeout_minutes: 15,
        totp_enabled: true,
        request_id: "req-security",
        correlation_id: "corr-security",
        server_request_id: null,
      },
      settingsError: null,
      startTotpEnrollment: vi.fn(),
      startTotpEnrollmentError: null,
      startTotpEnrollmentPending: false,
      totpChallenge: undefined,
      clearTotpChallenge: vi.fn(),
      updateIdleTimeout: vi.fn(),
      updateIdleTimeoutError: null,
      updateIdleTimeoutPending: false,
    });
    hookMocks.useFastUnlock.mockReturnValue({
      disable: vi.fn(),
      disableError: null,
      disablePending: false,
      enable: vi.fn(),
      enableError: null,
      enablePending: false,
      isLoading: false,
      refetchStatus: vi.fn(),
      status: {
        available: true,
        enabled: false,
        label: "Touch ID",
        error: null,
        request_id: "req-fast-unlock",
        correlation_id: "corr-fast-unlock",
        server_request_id: null,
      },
      statusError: null,
    });
  });

  it("renders split security sections and opens the idle-timeout step-up dialog", () => {
    renderWithTheme(<SecuritySettingsPage />);

    expect(screen.getByText("로컬 앱 보안 설정")).toBeInTheDocument();
    expect(screen.getByText("빠른 잠금 해제")).toBeInTheDocument();
    expect(screen.getByText("마스터 비밀번호 변경")).toBeInTheDocument();
    expect(screen.getByText("Google OTP")).toBeInTheDocument();
    expect(screen.getByText("보안 저장소 요약")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Touch ID 등록" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "5분" }));

    expect(screen.getByText("자동 잠금 시간을 변경하시겠습니까?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "변경 적용" })).toBeDisabled();
  });

  it("shows the retry state when security settings fail to load", () => {
    const refetchSettings = vi.fn();
    hookMocks.useSecuritySettings.mockReturnValue({
      changePassword: vi.fn(),
      changePasswordError: null,
      changePasswordPending: false,
      disableTotp: vi.fn(),
      disableTotpError: null,
      disableTotpPending: false,
      enableTotp: vi.fn(),
      enableTotpError: null,
      enableTotpPending: false,
      isLoading: false,
      refetchSettings,
      settings: undefined,
      settingsError: {
        message: "failed",
        request_id: "req-error",
        correlation_id: "corr-error",
        server_request_id: null,
      },
      startTotpEnrollment: vi.fn(),
      startTotpEnrollmentError: null,
      startTotpEnrollmentPending: false,
      totpChallenge: undefined,
      clearTotpChallenge: vi.fn(),
      updateIdleTimeout: vi.fn(),
      updateIdleTimeoutError: null,
      updateIdleTimeoutPending: false,
    });

    renderWithTheme(<SecuritySettingsPage />);

    expect(screen.getByText("보안 설정을 불러오지 못했습니다.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(refetchSettings).toHaveBeenCalledTimes(1);
  });

  it("hides fast unlock controls when the device does not support them", () => {
    window.localStorage.setItem("g5-admin-dev-mode", "disabled");
    hookMocks.useFastUnlock.mockReturnValue({
      disable: vi.fn(),
      disableError: null,
      disablePending: false,
      enable: vi.fn(),
      enableError: null,
      enablePending: false,
      isLoading: false,
      refetchStatus: vi.fn(),
      status: {
        available: false,
        enabled: false,
        label: "빠른 잠금 해제",
        error: null,
        request_id: "req-fast-unlock",
        correlation_id: "corr-fast-unlock",
        server_request_id: null,
      },
      statusError: null,
    });

    renderWithTheme(<SecuritySettingsPage />);

    expect(screen.queryByText("빠른 잠금 해제")).not.toBeInTheDocument();
  });

  it("requires current password and calls updateIdleTimeout when applying idle-timeout change", async () => {
    const updateIdleTimeout = vi.fn().mockResolvedValue(undefined);
    hookMocks.useSecuritySettings.mockReturnValue({
      changePassword: vi.fn(),
      changePasswordError: null,
      changePasswordPending: false,
      disableTotp: vi.fn(),
      disableTotpError: null,
      disableTotpPending: false,
      enableTotp: vi.fn(),
      enableTotpError: null,
      enableTotpPending: false,
      isLoading: false,
      refetchSettings: vi.fn(),
      settings: {
        idle_timeout_minutes: 15,
        totp_enabled: false,
        request_id: "req-security",
        correlation_id: "corr-security",
        server_request_id: null,
      },
      settingsError: null,
      startTotpEnrollment: vi.fn(),
      startTotpEnrollmentError: null,
      startTotpEnrollmentPending: false,
      totpChallenge: undefined,
      clearTotpChallenge: vi.fn(),
      updateIdleTimeout,
      updateIdleTimeoutError: null,
      updateIdleTimeoutPending: false,
    });

    renderWithTheme(<SecuritySettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "5분" }));
    const dialog = screen.getByRole("dialog");
    const confirmButton = within(dialog).getByRole("button", { name: "변경 적용" });

    expect(confirmButton).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText("현재 마스터 비밀번호"), {
      target: { value: "master-secret" },
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(updateIdleTimeout).toHaveBeenCalledWith({
        idle_timeout_minutes: 5,
        auth: {
          current_password: "master-secret",
          current_totp_code: null,
        },
      });
    });
  });
});

function renderWithTheme(element: ReactNode) {
  return render(<ThemeProvider>{element}</ThemeProvider>);
}
