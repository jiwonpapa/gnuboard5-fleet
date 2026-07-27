import { describe, expect, it } from "vitest";

import {
  normalizePermissionAuth,
  upsertAuthAssignment,
  validatePermissionDraft,
} from "./adminPermissionsForm";

describe("admin permission form", () => {
  it("reuses the legacy rwd semantics with canonical ordering", () => {
    expect(normalizePermissionAuth("D, r, r")).toBe("rd");
    expect(normalizePermissionAuth("W,R", true)).toBe("r,w");
    expect(normalizePermissionAuth("rx")).toBeNull();
  });

  it("fails closed for invalid IDs and menu codes", () => {
    expect(validatePermissionDraft({
      mb_id: "../admin",
      au_menu: "config/path",
      au_auth: "r",
    })).toEqual({
      mb_id: expect.any(String),
      au_menu: expect.any(String),
    });
    expect(upsertAuthAssignment([], {
      au_menu: "100100",
      au_auth: "R,W",
    })).toEqual([{ au_menu: "100100", au_auth: "r,w" }]);
  });
});
