import { beforeEach, describe, expect, it, vi } from "vitest";
import { listenSshShellStream, resizeSshShell, writeSshShell } from "./ssh-shell";

const invokeCommandSpy = vi.fn();
const listenSpy = vi.fn();

vi.mock("./core", () => ({
  invokeCommand: (...args: unknown[]) => invokeCommandSpy(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => listenSpy(...args),
}));

describe("ssh-shell client", () => {
  beforeEach(() => {
    invokeCommandSpy.mockReset();
    listenSpy.mockReset();
    invokeCommandSpy.mockResolvedValue({
      connected: true,
      shell_open: true,
      active_profile: null,
      connected_at: null,
      server_key_algorithm: "Ed25519",
      server_key_fingerprint: "SHA256:test",
      site_id: "site-alpha",
      correlation_id: "corr-ssh-shell",
      request_id: "req-ssh-shell",
      server_request_id: null,
    });
  });

  it("sends resize payloads to the dedicated ssh shell resize command", async () => {
    await resizeSshShell({
      site_id: "site-alpha",
      cols: 140,
      rows: 48,
    });

    expect(invokeCommandSpy).toHaveBeenCalledWith("cmd_ssh_shell_resize", {
      input: {
        site_id: "site-alpha",
        cols: 140,
        rows: 48,
      },
    });
  });

  it("sends raw shell input without expecting a status payload back", async () => {
    invokeCommandSpy.mockResolvedValue(undefined);

    await writeSshShell({
      site_id: "site-alpha",
      data: "ls -la\r",
    });

    expect(invokeCommandSpy).toHaveBeenCalledWith("cmd_ssh_shell_write", {
      input: {
        site_id: "site-alpha",
        data: "ls -la\r",
      },
    });
  });

  it("registers a tauri event listener for streamed ssh shell output", async () => {
    const unlisten = vi.fn();
    const onEvent = vi.fn();
    listenSpy.mockResolvedValue(unlisten);

    const result = await listenSshShellStream(onEvent);

    expect(listenSpy).toHaveBeenCalledWith("g5:ssh-shell-output", expect.any(Function));
    expect(result).toBe(unlisten);
  });
});
