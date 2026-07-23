import { describe, expect, it } from "vitest";
import {
  buildAdminBoardGroupCreateInput,
  buildAdminBoardGroupMemberAddInput,
  buildAdminBoardGroupUpdateInput,
} from "./admin-board-groups-form";

describe("admin-board-groups-form", () => {
  it("builds create payload with trimmed values", () => {
    expect(
      buildAdminBoardGroupCreateInput({
        gr_id: "  staff ",
        gr_subject: " 운영팀 ",
        gr_admin: " neo ",
        gr_device: "mobile",
        gr_use_access: true,
      }),
    ).toEqual({
      gr_id: "staff",
      gr_subject: "운영팀",
      gr_admin: "neo",
      gr_device: "mobile",
      gr_use_access: 1,
    });
  });

  it("builds update payload with immutable gr_id", () => {
    expect(
      buildAdminBoardGroupUpdateInput({
        gr_id: "group01",
        gr_subject: " 수정 제목 ",
        gr_admin: "",
        gr_device: "both",
        gr_use_access: false,
      }),
    ).toEqual({
      gr_id: "group01",
      gr_subject: "수정 제목",
      gr_admin: null,
      gr_device: "both",
      gr_use_access: 0,
    });
  });

  it("builds member add payload", () => {
    expect(
      buildAdminBoardGroupMemberAddInput(" staff ", {
        mb_id: " neo ",
      }),
    ).toEqual({
      gr_id: "staff",
      mb_id: "neo",
    });
  });
});
