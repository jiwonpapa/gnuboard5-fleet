import { describe, expect, it } from "vitest";

import { buildSitePath } from "./requestScope";

describe("request scope", () => {
  it("builds an explicit site-bound server path", () => {
    expect(
      buildSitePath(
        { siteId: "site-1", requestId: "request-1" },
        "/config/basic",
      ),
    ).toBe("/sites/site-1/config/basic");
  });

  it("rejects a missing or path-escaping site instead of using active global state", () => {
    expect(() =>
      buildSitePath({ siteId: "", requestId: "request-1" }, "/overview")
    ).toThrow();
    expect(() =>
      buildSitePath({ siteId: "../other", requestId: "request-1" }, "/overview")
    ).toThrow();
  });
});
