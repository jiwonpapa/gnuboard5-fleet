import { describe, expect, it } from "vitest";

import {
  adminRoutes,
  groupedAdminRoutes,
  resolveRouteMeta,
} from "./adminRouteRegistry";

describe("adminRouteRegistry", () => {
  it("preserves legacy navigation and exposes only migrated domains as active", () => {
    expect(resolveRouteMeta("/admin/members")).toMatchObject({
      label: "회원",
      delivery: "active",
    });
    expect(adminRoutes.filter((route) => route.delivery === "active")).toHaveLength(
      7,
    );
    expect(groupedAdminRoutes().get("메시징")?.length).toBeGreaterThanOrEqual(6);
  });
});
