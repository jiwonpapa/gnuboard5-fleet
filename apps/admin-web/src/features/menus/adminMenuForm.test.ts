import { describe, expect, it } from "vitest";

import type { AdminMenu } from "../../api/fleet";
import {
  buildAdminMenuCreate,
  buildAdminMenuReorder,
  buildAdminMenuUpdate,
  countChangedMenuOrders,
  validateAdminMenuDraft,
} from "./adminMenuForm";

const menu: AdminMenu = {
  me_id: 7,
  me_code: "100100",
  me_name: "회사 소개",
  me_link: "/company",
  me_target: "_self",
  me_order: 10,
  me_use: 1,
  me_mobile_use: 1,
};

const draft = {
  me_code: " 100100 ",
  me_name: " 회사 소개 ",
  me_link: " /company ",
  me_target: " _self ",
  me_order: "10",
  me_use: true,
  me_mobile_use: true,
};

describe("admin menu form", () => {
  it("reuses normalized create and changed-field-only update rules", () => {
    expect(buildAdminMenuCreate(draft)).toEqual({
      me_code: "100100",
      me_name: "회사 소개",
      me_link: "/company",
      me_target: "_self",
      me_order: 10,
      me_use: 1,
      me_mobile_use: 1,
    });
    expect(buildAdminMenuUpdate(menu, { ...draft, me_name: "회사 안내", me_mobile_use: false }))
      .toEqual({ me_name: "회사 안내", me_mobile_use: 0 });
  });

  it("builds canonical reorder payload only for valid changed rows", () => {
    expect(buildAdminMenuReorder([menu], { 7: "20" })).toEqual({
      orders: [{ me_id: 7, me_order: 20 }],
    });
    expect(countChangedMenuOrders([menu], { 7: "20" })).toBe(1);
    expect(buildAdminMenuReorder([menu], { 7: "10" })).toBeNull();
    expect(buildAdminMenuReorder([menu], { 7: "-1" })).toBeNull();
  });

  it("fails closed on missing identity fields and negative order", () => {
    expect(validateAdminMenuDraft({
      ...draft,
      me_code: " ",
      me_name: "",
      me_link: "",
      me_target: "",
      me_order: "-1",
    })).toHaveLength(5);
  });
});
