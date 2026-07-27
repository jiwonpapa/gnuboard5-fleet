import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  it("submits password and OTP without exposing a password-only path", async () => {
    const login = vi.fn(async () => undefined);
    render(<LoginPage onLogin={login} />);

    fireEvent.change(screen.getByLabelText("아이디"), {
      target: { value: "fleet-admin" },
    });
    fireEvent.change(screen.getByLabelText("비밀번호"), {
      target: { value: "very-secure-password" },
    });
    fireEvent.change(screen.getByLabelText("6자리 OTP"), {
      target: { value: "654321" },
    });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith({
        loginName: "fleet-admin",
        password: "very-secure-password",
        recoveryCode: "",
        totpCode: "654321",
      })
    );
  });

  it("can explicitly replace OTP with a one-time recovery code", () => {
    render(<LoginPage onLogin={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "복구 코드 사용" }));
    expect(screen.getByLabelText("복구 코드")).toBeRequired();
    expect(screen.queryByLabelText("6자리 OTP")).not.toBeInTheDocument();
  });
});
