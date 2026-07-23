import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SshProfile } from "../../types/SshProfile";
import { ThemeProvider } from "../layout/theme";
import { SiteSshProfileDialog } from "./SiteSshProfileDialog";

const { selectSshPrivateKeyPathSpy } = vi.hoisted(() => ({
  selectSshPrivateKeyPathSpy: vi.fn(),
}));

vi.mock("./site-ssh-profile-helpers", () => ({
  selectSshPrivateKeyPath: selectSshPrivateKeyPathSpy,
}));

function renderDialog(overrides?: Partial<ComponentProps<typeof SiteSshProfileDialog>>) {
  return render(
    <ThemeProvider>
      <SiteSshProfileDialog
        error={null}
        isPending={false}
        mode="create"
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
        open
        siteName="알파몰"
        {...overrides}
      />
    </ThemeProvider>,
  );
}

describe("SiteSshProfileDialog", () => {
  it("fills the key path from the native file picker", async () => {
    const user = userEvent.setup();
    selectSshPrivateKeyPathSpy.mockResolvedValue("/Users/neojins/.ssh/id_ed25519");

    renderDialog();

    await user.click(screen.getByRole("button", { name: "파일 선택" }));

    expect(selectSshPrivateKeyPathSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByPlaceholderText("~/.ssh/id_ed25519")).toHaveValue(
      "/Users/neojins/.ssh/id_ed25519",
    );
  });

  it("keeps typed text input values without reading a cleared event object", async () => {
    const user = userEvent.setup();

    renderDialog();

    const nameInput = screen.getByPlaceholderText("예: 운영서버");
    const hostInput = screen.getByPlaceholderText("ssh.example.com");

    await user.type(nameInput, "운영 서버");
    await user.type(hostInput, "ssh.alpha.example.com");

    expect(nameInput).toHaveValue("운영 서버");
    expect(hostInput).toHaveValue("ssh.alpha.example.com");
  });

  it("keeps password mode inputs editable while toggling stored secret cleanup", async () => {
    const user = userEvent.setup();
    const profile: SshProfile = {
      auth_type: "password",
      created_at: "2026-03-26T00:00:00Z",
      has_key_passphrase: false,
      has_password: true,
      host: "ssh.alpha.example.com",
      id: "ssh-profile-1",
      key_path: null,
      name: "운영 SSH",
      port: 22,
      site_id: "site-alpha",
      updated_at: "2026-03-26T00:00:00Z",
      username: "deploy",
    };

    renderDialog({
      mode: "edit",
      profile,
    });

    const passwordInput = screen.getByPlaceholderText("비워 두면 기존 비밀번호 유지");
    const clearCheckbox = screen.getByRole("checkbox", { name: "저장된 비밀번호를 삭제합니다." });

    await user.type(passwordInput, "new-secret");
    expect(passwordInput).toHaveValue("new-secret");

    await user.click(clearCheckbox);

    expect(clearCheckbox).toBeChecked();
    expect(passwordInput).toHaveValue("");
  });

  it("keeps unsupported SSH agent profiles read-only until the runtime exists", () => {
    const profile: SshProfile = {
      auth_type: "agent",
      created_at: "2026-03-26T00:00:00Z",
      has_key_passphrase: false,
      has_password: false,
      host: "ssh.alpha.example.com",
      id: "ssh-profile-agent",
      key_path: null,
      name: "Agent SSH",
      port: 22,
      site_id: "site-alpha",
      updated_at: "2026-03-26T00:00:00Z",
      username: "deploy",
    };

    renderDialog({
      mode: "edit",
      profile,
    });

    expect(screen.getByText(/SSH Agent 인증은 아직 구현 전입니다/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "프로필 저장" }),
    ).toBeDisabled();
  });
});
