import { describe, expect, it } from "vitest";
import {
  adminBrowscapConvertFormSchema,
  buildAdminBrowscapConvertInput,
} from "./admin-browscap-form";

describe("admin-browscap-form", () => {
  it("builds browscap convert payload", () => {
    expect(
      buildAdminBrowscapConvertInput({
        rows: "250",
      }),
    ).toEqual({
      rows: 250,
    });
  });

  it("rejects zero rows through zod", () => {
    expect(
      adminBrowscapConvertFormSchema.safeParse({
        rows: "0",
      }).success,
    ).toBe(false);
  });
});
