import { describe, expect, it } from "vitest";

import {
  adminRoutes,
  groupedAdminRoutes,
  resolveRouteMeta,
} from "./adminRouteRegistry";

describe("adminRouteRegistry", () => {
  it("preserves the legacy domain navigation without claiming planned pages active", () => {
    expect(resolveRouteMeta("/admin/members")).toMatchObject({
      label: "회원",
      delivery: "planned",
    });
    expect(adminRoutes.filter((route) => route.delivery === "active")).toHaveLength(
      6,
    );
    expect(groupedAdminRoutes().get("메시징")?.length).toBeGreaterThanOrEqual(6);
  });
});
