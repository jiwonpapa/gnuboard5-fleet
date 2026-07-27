import { describe, expect, it } from "vitest";

import { resolveAccessView } from "../auth/accessFlow";

describe("master access flow", () => {
  it("never opens the application before install and authenticated session gates pass", () => {
    expect(resolveAccessView({ installState: null, sessionReady: false })).toBe("checking");
    expect(
      resolveAccessView({ installState: "setup_required", sessionReady: false }),
    ).toBe("install");
    expect(resolveAccessView({ installState: "complete", sessionReady: false })).toBe("login");
    expect(resolveAccessView({ installState: "complete", sessionReady: true })).toBe("application");
  });
});
