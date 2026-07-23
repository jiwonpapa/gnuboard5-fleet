import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSshStatus } from "./ssh-session";

const invokeCommandSpy = vi.fn();

vi.mock("./core", () => ({
  invokeCommand: (...args: unknown[]) => invokeCommandSpy(...args),
}));

describe("ssh-session client", () => {
  beforeEach(() => {
    invokeCommandSpy.mockReset();
    invokeCommandSpy.mockResolvedValue({
      connected: false,
      shell_open: false,
      active_profile: null,
      connected_at: null,
      server_key_algorithm: null,
      server_key_fingerprint: null,
      site_id: "site-alpha",
      correlation_id: "corr-ssh",
      request_id: "req-ssh",
      server_request_id: null,
    });
  });

  it("sends siteId when requesting SSH session status", async () => {
    await getSshStatus("site-alpha");

    expect(invokeCommandSpy).toHaveBeenCalledWith("cmd_ssh_status", {
      siteId: "site-alpha",
    });
  });
});
