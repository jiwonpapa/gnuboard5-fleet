import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RemoteWorkspace } from "./RemoteWorkspace";

describe("RemoteWorkspace", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const path = new URL(input.toString()).pathname;
        if (path.endsWith("/ssh/host-key") && init?.method === "POST") {
          return new Response(
            JSON.stringify({
              host: "192.168.0.127",
              port: 22,
              server_key_algorithm: "ssh-ed25519",
              server_key_fingerprint: "SHA256:server-fingerprint",
              known_hosts_line:
                "192.168.0.127 ssh-ed25519 AAAAC3NzaFixture",
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (path.endsWith("/ssh/profile") && init?.method === "PUT") {
          return new Response(
            JSON.stringify({
              username: "deploy",
              host: "192.168.0.127",
              port: 22,
              host_key_verification: "strict_known_hosts",
              server_key_algorithm: "ssh-ed25519",
              server_key_fingerprint: "SHA256:server-fingerprint",
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({
            error: {
              code: "secret_not_found",
              message: "missing",
              request_id: null,
            },
          }),
          { status: 404, headers: { "content-type": "application/json" } },
        );
      }),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it("clears SSH secrets after the server returns only a profile summary", async () => {
    render(<RemoteWorkspace siteId="site-a" csrfToken="csrf-memory" />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText("사용자"), {
      target: { value: "deploy" },
    });
    fireEvent.change(screen.getByLabelText("호스트"), {
      target: { value: "192.168.0.127" },
    });
    const privateKey = [
      "-----BEGIN OPENSSH ",
      "PRIVATE KEY-----\nfixture\n-----END OPENSSH ",
      "PRIVATE KEY-----",
    ].join("");
    fireEvent.change(screen.getByLabelText("OpenSSH 개인키"), {
      target: { value: privateKey },
    });
    fireEvent.click(screen.getByRole("button", { name: "서버 키 지문 검사" }));
    await screen.findByText("SHA256:server-fingerprint");
    fireEvent.click(screen.getByLabelText("이 서버 키 지문을 신뢰"));
    fireEvent.click(screen.getByRole("button", { name: "암호화 저장" }));

    await screen.findAllByText("deploy@192.168.0.127:22");
    await waitFor(() => {
      expect(screen.getByLabelText("OpenSSH 개인키")).toHaveValue("");
    });
    expect(document.body.textContent).not.toContain(privateKey);
    expect(document.body.textContent).not.toContain("AAAAC3NzaFixture");
  });
});
