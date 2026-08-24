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
    expect(resolveRouteMeta("/admin/visits")).toMatchObject({
      label: "접속자",
      delivery: "active",
    });
    expect(resolveRouteMeta("/admin/reports")).toMatchObject({
      label: "신고",
      delivery: "active",
    });
    expect(resolveRouteMeta("/admin/qa")).toMatchObject({
      label: "QA",
      delivery: "active",
    });
    expect(resolveRouteMeta("/admin/write-count")).toMatchObject({
      label: "글·댓글 통계",
      delivery: "active",
    });
    expect(resolveRouteMeta("/admin/mails")).toMatchObject({
      label: "메일",
      delivery: "active",
    });
    expect(resolveRouteMeta("/admin/sms")).toMatchObject({
      label: "SMS 설정",
      delivery: "active",
    });
    expect(resolveRouteMeta("/admin/sms-contacts")).toMatchObject({
      label: "SMS 연락처",
      delivery: "active",
    });
    expect(resolveRouteMeta("/admin/sms-templates")).toMatchObject({
      label: "SMS 템플릿",
      delivery: "active",
    });
    expect(resolveRouteMeta("/admin/sms-messages")).toMatchObject({
      label: "SMS 발송",
      delivery: "active",
    });
    expect(resolveRouteMeta("/admin/sms-history")).toMatchObject({
      label: "SMS 내역",
      delivery: "active",
    });
    expect(resolveRouteMeta("/admin/push")).toMatchObject({
      label: "Push",
      delivery: "active",
    });
    expect(adminRoutes.filter((route) => route.delivery === "active")).toHaveLength(
      27,
    );
    expect(groupedAdminRoutes().get("메시징")?.length).toBeGreaterThanOrEqual(6);
  });
});
