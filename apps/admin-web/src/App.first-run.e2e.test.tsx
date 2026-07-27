import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FleetAccessGate } from "./features/auth/FleetAccessGate";

vi.mock("./api/fleet", () => ({
  completeInstall: vi.fn(async () => ({
    principal_id: "principal-1",
    recovery_codes: ["recover-one", "recover-two"],
  })),
  getFleetSession: vi.fn(),
  getInstallStatus: vi.fn(async () => ({ state: "setup_required" })),
  getSecuritySettings: vi.fn(),
  loginFleet: vi.fn(),
  logoutFleet: vi.fn(),
  startInstallChallenge: vi.fn(async () => ({
    setup_token: "setup-token",
    manual_entry_key: "MANUALKEY",
    otpauth_uri: "otpauth://totp/G5Fleet:admin",
    expires_at_unix: 4_000_000_000,
  })),
}));

describe("first-run installation", () => {
  it("requires administrator, OTP verification, and recovery acknowledgement", async () => {
    render(<FleetAccessGate><p>protected</p></FleetAccessGate>);

    expect(await screen.findByRole("heading", { name: "G5 Fleet 설치" })).toBeVisible();
    fireEvent.change(screen.getByLabelText("마스터 아이디"), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByLabelText("마스터 비밀번호"), {
      target: { value: "very-secure-password" },
    });
    fireEvent.change(screen.getByLabelText("비밀번호 확인"), {
      target: { value: "very-secure-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "OTP 설정 시작" }));

    expect(await screen.findByText("MANUALKEY")).toBeVisible();
    fireEvent.change(screen.getByLabelText("6자리 OTP"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "관리자·OTP 원자 저장" }));

    expect(
      await screen.findByRole("heading", {
        name: "복구 코드는 지금 한 번만 표시됩니다.",
      }),
    ).toBeVisible();
    const finish = screen.getByRole("button", { name: "로그인으로 이동" });
    expect(finish).toBeDisabled();
    fireEvent.click(screen.getByLabelText("복구 코드를 안전한 곳에 저장했습니다."));
    fireEvent.click(finish);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Fleet 관리자 로그인" })).toBeVisible()
    );
  });
});
