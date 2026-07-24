import { describe, expect, it, vi } from "vitest";

import { BrowserHttpTransport } from "./browserHttpTransport";
import { TransportError } from "./contracts";

describe("BrowserHttpTransport", () => {
  it("uses same-origin credentials and parses typed JSON", async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    const transport = new BrowserHttpTransport(
      "/api/v1",
      fetcher,
      "https://fleet.example",
    );
    await expect(
      transport.request<{ status: string }>({
        method: "GET",
        path: "/meta",
      }),
    ).resolves.toEqual({ status: "ok" });
    expect(fetcher).toHaveBeenCalledWith(
      new URL("https://fleet.example/api/v1/meta"),
      expect.objectContaining({ credentials: "same-origin", redirect: "error" }),
    );
  });

  it("returns the server error envelope and rejects remote base URLs", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            code: "route_not_found",
            message: "missing",
            request_id: null,
          },
        }),
        { status: 404 },
      )
    );
    const transport = new BrowserHttpTransport(
      "/api/v1",
      fetcher,
      "https://fleet.example",
    );
    await expect(
      transport.request({ method: "GET", path: "/missing" }),
    ).rejects.toMatchObject({
      status: 404,
      code: "route_not_found",
    });

    const remote = new BrowserHttpTransport(
      "https://g5.example",
      fetcher,
      "https://fleet.example",
    );
    await expect(
      remote.request({ method: "GET", path: "/health" }),
    ).rejects.toBeInstanceOf(TransportError);
  });

  it("adds CSRF only when the caller supplies the in-memory token", async () => {
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        void input;
        void init;
        return new Response(null, { status: 204 });
      },
    );
    const transport = new BrowserHttpTransport(
      "/api/v1",
      fetcher,
      "https://fleet.example",
    );
    await transport.request({
      method: "POST",
      path: "/sites",
      csrfToken: "csrf-in-memory",
      body: { site_id: "site-a" },
    });
    const init = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).get("x-csrf-token")).toBe(
      "csrf-in-memory",
    );
  });
});
