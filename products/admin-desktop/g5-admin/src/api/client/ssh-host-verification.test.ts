import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSshHostVerificationStatus,
  trustSshHostVerification,
} from "./ssh-host-verification";

const invokeCommandSpy = vi.fn();

vi.mock("./core", () => ({
  invokeCommand: (...args: unknown[]) => invokeCommandSpy(...args),
}));

describe("ssh-host-verification client", () => {
  beforeEach(() => {
    invokeCommandSpy.mockReset();
    invokeCommandSpy.mockResolvedValue({
      correlation_id: "corr-ssh-trust",
      host: "gnurestapi.cc",
      port: 22,
      request_id: "req-ssh-trust",
      server_key_algorithm: "ssh-ed25519",
      server_key_fingerprint: "SHA256:test",
      server_request_id: null,
      site_id: "site-alpha",
      ssh_profile_id: "ssh-profile-1",
      trust_state: "missing",
      username: "deploy",
    });
  });

  it("inspects host verification with wrapped input payload", async () => {
    await getSshHostVerificationStatus({
      site_id: "site-alpha",
      ssh_profile_id: "ssh-profile-1",
    });

    expect(invokeCommandSpy).toHaveBeenCalledWith(
      "cmd_ssh_host_verification_status",
      {
        input: {
          site_id: "site-alpha",
          ssh_profile_id: "ssh-profile-1",
        },
      },
    );
  });

  it("trusts host verification with expected fingerprint payload", async () => {
    await trustSshHostVerification({
      expected_fingerprint: "SHA256:test",
      site_id: "site-alpha",
      ssh_profile_id: "ssh-profile-1",
    });

    expect(invokeCommandSpy).toHaveBeenCalledWith(
      "cmd_ssh_host_verification_trust",
      {
        input: {
          expected_fingerprint: "SHA256:test",
          site_id: "site-alpha",
          ssh_profile_id: "ssh-profile-1",
        },
      },
    );
  });
});
