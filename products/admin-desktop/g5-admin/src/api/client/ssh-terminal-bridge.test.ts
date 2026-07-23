import { beforeEach, describe, expect, it, vi } from "vitest";
import { connectSshTerminalBridge } from "./ssh-terminal-bridge";

const invokeCommandSpy = vi.fn();

vi.mock("./core", () => ({
  invokeCommand: (...args: unknown[]) => invokeCommandSpy(...args),
}));

describe("ssh-terminal-bridge client", () => {
  beforeEach(() => {
    invokeCommandSpy.mockReset();
    invokeCommandSpy.mockResolvedValue({
      correlation_id: "corr-bridge",
      request_id: "req-bridge",
      server_request_id: null,
      site_id: "site-alpha",
      token: "bridge-token",
      websocket_url: "ws://127.0.0.1:4545",
    });
  });

  it("requests a websocket bridge ticket for the active ssh shell", async () => {
    await connectSshTerminalBridge({
      site_id: "site-alpha",
    });

    expect(invokeCommandSpy).toHaveBeenCalledWith(
      "cmd_ssh_terminal_bridge_connect",
      {
        input: {
          site_id: "site-alpha",
        },
      },
    );
  });
});
