import { describe, expect, it } from "vitest";
import {
  adminPointActionFormSchema,
  adminPointExpireFormSchema,
  buildAdminPointActionInput,
  buildAdminPointExpireInput,
  emptyAdminPointActionFormValues,
  emptyAdminPointExpireFormValues,
} from "./admin-points-form";

describe("admin-points-form", () => {
  it("keeps stable defaults for fresh point actions", () => {
    expect(emptyAdminPointActionFormValues).toEqual({
      mb_id: "",
      po_content: "",
      point: "100",
    });

    expect(emptyAdminPointExpireFormValues).toEqual({
      base_date: "",
    });
  });

  it("builds point action payload", () => {
    expect(
      buildAdminPointActionInput({
        mb_id: " neo1 ",
        po_content: "  관리자 수동 지급  ",
        point: "300",
      }),
    ).toEqual({
      mb_id: "neo1",
      po_content: "관리자 수동 지급",
      point: 300,
    });
  });

  it("rejects zero point via zod", () => {
    expect(
      adminPointActionFormSchema.safeParse({
        mb_id: "neo1",
        po_content: "",
        point: "0",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid action payloads and invalid expire dates", () => {
    expect(
      buildAdminPointActionInput({
        mb_id: "neo1",
        po_content: "",
        point: "not-a-number",
      }),
    ).toBeNull();

    expect(
      buildAdminPointActionInput({
        mb_id: "   ",
        po_content: "",
        point: "100",
      }),
    ).toBeNull();

    expect(
      adminPointExpireFormSchema.safeParse({
        base_date: "2026/03/11",
      }).success,
    ).toBe(false);
  });

  it("builds optional expire payload", () => {
    expect(
      buildAdminPointExpireInput({
        base_date: "",
      }),
    ).toEqual({
      base_date: null,
    });

    expect(
      buildAdminPointExpireInput({
        base_date: " 2026-03-11 ",
      }),
    ).toEqual({
      base_date: "2026-03-11",
    });
  });
});
