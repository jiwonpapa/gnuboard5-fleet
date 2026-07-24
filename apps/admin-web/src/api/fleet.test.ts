import { afterEach, describe, expect, it, vi } from "vitest";

import { openTerminalSocket } from "./fleet";

describe("remote Fleet transport", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps the one-time terminal ticket out of the WebSocket URL", () => {
    const sockets: Array<{ url: string; protocols: string[] }> = [];
    class FakeWebSocket {
      constructor(url: string | URL, protocols: string[]) {
        sockets.push({ url: url.toString(), protocols });
      }
    }
    vi.stubGlobal("WebSocket", FakeWebSocket);

    openTerminalSocket("site-a", "one-time-secret");

    expect(sockets).toHaveLength(1);
    expect(sockets[0]?.url).toBe(
      "ws://localhost:3000/api/v1/sites/site-a/terminal",
    );
    expect(sockets[0]?.url).not.toContain("one-time-secret");
    expect(sockets[0]?.protocols).toEqual([
      "g5-fleet-terminal",
      "ticket.one-time-secret",
    ]);
  });
});
