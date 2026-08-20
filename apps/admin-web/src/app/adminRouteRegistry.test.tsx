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
    expect(resolveRouteMeta("/admin/groups")).toMatchObject({
      label: "그룹",
      delivery: "active",
    });
    expect(resolveRouteMeta("/admin/faqs")).toMatchObject({
      label: "FAQ",
      delivery: "active",
    });
    expect(resolveRouteMeta("/admin/menus")).toMatchObject({
      label: "메뉴",
      delivery: "active",
    });
    expect(resolveRouteMeta("/admin/layouts")).toMatchObject({
      label: "레이아웃",
      delivery: "active",
    });
    expect(resolveRouteMeta("/admin/theme")).toMatchObject({
      label: "테마",
      delivery: "active",
    });
    expect(resolveRouteMeta("/admin/points")).toMatchObject({
      label: "포인트",
      delivery: "active",
    });
    expect(resolveRouteMeta("/admin/polls")).toMatchObject({
      label: "투표",
      delivery: "active",
    });
    expect(resolveRouteMeta("/admin/popups")).toMatchObject({
      label: "팝업",
      delivery: "active",
    });
    expect(resolveRouteMeta("/admin/popular")).toMatchObject({
      label: "인기검색",
      delivery: "active",
    });
    expect(adminRoutes.filter((route) => route.delivery === "active")).toHaveLength(
      16,
    );
    expect(groupedAdminRoutes().get("메시징")?.length).toBeGreaterThanOrEqual(6);
  });
});
