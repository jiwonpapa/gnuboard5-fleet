import { describe, expect, it } from "vitest";
import {
  buildMenuCreateInput,
  buildMenuReorderInput,
  buildMenuUpdateInput,
  countChangedMenuOrders,
  menuFormSchema,
  toMenuFormValues,
} from "./admin-menus-form";
import type { AdminMenu } from "../../types/AdminMenu";

const baseline: AdminMenu = {
  me_code: "200100",
  me_id: 12,
  me_link: "/bbs/member_list.php",
  me_mobile_use: 1,
  me_name: "회원관리",
  me_order: 4,
  me_target: "_self",
  me_use: 1,
};

describe("admin-menus-form", () => {
  it("builds create payload", () => {
    expect(
      buildMenuCreateInput({
        me_code: "300100",
        me_link: "/bbs/board_list.php",
        me_mobile_use: false,
        me_name: "게시판관리",
        me_order: "7",
        me_target: "_blank",
        me_use: true,
      }),
    ).toEqual({
      me_code: "300100",
      me_link: "/bbs/board_list.php",
      me_mobile_use: 0,
      me_name: "게시판관리",
      me_order: 7,
      me_target: "_blank",
      me_use: 1,
    });
  });

  it("builds sparse update payload", () => {
    const next = toMenuFormValues(baseline);
    next.me_name = "회원관리(수정)";
    next.me_mobile_use = false;

    expect(buildMenuUpdateInput(baseline, next)).toEqual({
      me_code: null,
      me_id: 12,
      me_link: null,
      me_mobile_use: 0,
      me_name: "회원관리(수정)",
      me_order: null,
      me_target: null,
      me_use: null,
    });
  });

  it("builds reorder payload only when order changed", () => {
    const menus = [
      baseline,
      {
        ...baseline,
        me_code: "300100",
        me_id: 14,
        me_name: "게시판관리",
        me_order: 5,
      },
    ];

    expect(
      buildMenuReorderInput(menus, {
        12: "5",
        14: "4",
      }),
    ).toEqual({
      orders: [
        { me_id: 12, me_order: 5 },
        { me_id: 14, me_order: 4 },
      ],
    });

    expect(
      countChangedMenuOrders(menus, {
        12: "5",
        14: "4",
      }),
    ).toBe(2);
  });

  it("rejects invalid order through zod", () => {
    expect(
      menuFormSchema.safeParse({
        ...toMenuFormValues(baseline),
        me_order: "-1",
      }).success,
    ).toBe(false);
  });
});
