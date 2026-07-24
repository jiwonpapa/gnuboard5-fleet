import { afterEach, describe, expect, it, vi } from "vitest";

import { registerFleetServiceWorker } from "./pwa";

describe("PWA registration", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("registers only the same-origin static service worker scope", async () => {
    const register = vi.fn(async () => ({ scope: "/" }));
    vi.stubGlobal("navigator", { serviceWorker: { register } });

    await registerFleetServiceWorker(true);

    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" });
  });
});
