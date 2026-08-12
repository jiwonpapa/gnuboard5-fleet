import { describe, expect, it } from "vitest";

import {
  buildAdminBoardGroupCreate,
  buildAdminBoardGroupUpdate,
  validateAdminBoardGroupDraft,
} from "./adminBoardGroupForm";

describe("admin board group form", () => {
  it("normalizes canonical create and update payloads", () => {
    const draft = {
      gr_id: " staff_1 ",
      gr_subject: " 운영진 ",
      gr_admin: " g5admin ",
      gr_device: "both" as const,
      gr_use_access: true,
    };
    expect(buildAdminBoardGroupCreate(draft)).toEqual({
      gr_id: "staff_1",
      gr_subject: "운영진",
      gr_admin: "g5admin",
      gr_device: "both",
      gr_use_access: 1,
    });
    expect(buildAdminBoardGroupUpdate(draft)).not.toHaveProperty("gr_id");
  });

  it("fails closed on unsafe group ids and empty subjects", () => {
    expect(validateAdminBoardGroupDraft({
      gr_id: "../staff",
      gr_subject: " ",
      gr_admin: "",
      gr_device: "both",
      gr_use_access: false,
    })).toHaveLength(2);
  });
});
