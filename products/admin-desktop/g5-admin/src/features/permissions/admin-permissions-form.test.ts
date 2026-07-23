import { describe, expect, it } from "vitest";
import {
  buildPermissionSaveInput,
  composePermissionKey,
  emptyPermissionFormValues,
  permissionFormSchema,
  toPermissionFormValues,
} from "./admin-permissions-form";

describe("admin-permissions-form", () => {
  it("returns empty defaults when no row is selected", () => {
    expect(emptyPermissionFormValues()).toEqual({
      au_auth: "",
      au_menu: "",
      mb_id: "",
    });

    expect(toPermissionFormValues(null)).toEqual({
      au_auth: "",
      au_menu: "",
      mb_id: "",
    });
  });

  it("hydrates a permission row into editable form values", () => {
    expect(
      toPermissionFormValues({
        au_auth: "rwd",
        au_menu: "100100",
        mb_id: "admin",
        mb_name: "관리자",
        mb_nick: "최고관리자",
      }),
    ).toEqual({
      au_auth: "rwd",
      au_menu: "100100",
      mb_id: "admin",
    });
  });

  it("normalizes the save payload", () => {
    expect(
      buildPermissionSaveInput({
        au_auth: "r, w d",
        au_menu: " 100100 ",
        mb_id: " admin_01 ",
      }),
    ).toEqual({
      au_auth: "rwd",
      au_menu: "100100",
      mb_id: "admin_01",
    });

    expect(composePermissionKey("admin_01", "100100")).toBe("admin_01::100100");
  });

  it("rejects invalid auth tokens through zod", () => {
    expect(
      permissionFormSchema.safeParse({
        au_auth: "rx",
        au_menu: "100100",
        mb_id: "admin",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid payload shapes at save time", () => {
    expect(
      buildPermissionSaveInput({
        au_auth: "rrx",
        au_menu: "100100",
        mb_id: "admin",
      }),
    ).toBeNull();

    expect(
      buildPermissionSaveInput({
        au_auth: "rw",
        au_menu: "menu with space",
        mb_id: "ab",
      }),
    ).toBeNull();
  });
});
