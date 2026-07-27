import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SiteSshSessionPage } from "./SiteSshSessionPage";

class FakeSocket {
  static readonly OPEN = 1;
  static instances: FakeSocket[] = [];
  readyState = 0;
  binaryType = "";
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => this.onclose?.());

  constructor(
    readonly url: string | URL,
    readonly protocols: string[],
  ) {
    FakeSocket.instances.push(this);
    queueMicrotask(() => {
      this.readyState = FakeSocket.OPEN;
      this.onopen?.();
    });
  }
}

describe("SiteSshSessionPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("opens a ticket-bound WebSocket and sends terminal input", async () => {
    FakeSocket.instances = [];
    vi.stubGlobal("WebSocket", FakeSocket);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(
        JSON.stringify({ ticket: "once", expires_at_unix: 100 }),
        { status: 200, headers: { "content-type": "application/json" } },
      )),
    );
    const originalProtocol = globalThis.location.protocol;
    render(
      <SiteSshSessionPage
        csrfToken="csrf"
        profile={{
          username: "deploy",
          host: "192.168.0.127",
          port: 22,
          host_key_verification: "strict_known_hosts",
          server_key_algorithm: "ssh-ed25519",
          server_key_fingerprint: "SHA256:fixture",
        }}
        siteId="site-a"
        onError={vi.fn()}
        onProfileChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "연결" }));
    await screen.findByText("connected");
    fireEvent.change(screen.getByLabelText("터미널 입력"), {
      target: { value: "pwd" },
    });
    fireEvent.click(screen.getByRole("button", { name: "전송" }));

    await waitFor(() => {
      expect(FakeSocket.instances[0]?.send).toHaveBeenCalledWith("pwd\n");
    });
    expect(globalThis.location.protocol).toBe(originalProtocol);
  });
});
