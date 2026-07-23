import { describe, expect, it } from "vitest";
import {
  buildAdminSmsTemplateBatchInput,
  buildAdminSmsTemplateCreateInput,
  buildAdminSmsTemplateGroupCreateInput,
  buildAdminSmsTemplateGroupMoveInput,
  buildAdminSmsTemplateGroupUpdateInput,
  buildAdminSmsTemplateListQuery,
  buildAdminSmsTemplateUpdateInput,
} from "./admin-sms-templates-form";

describe("admin-sms-templates-form", () => {
  it("builds template group payloads", () => {
    expect(
      buildAdminSmsTemplateGroupCreateInput({
        fg_no: null,
        fg_name: " 공지 템플릿 ",
        fg_member: true,
      }),
    ).toEqual({
      fg_name: "공지 템플릿",
      fg_member: 1,
    });

    expect(
      buildAdminSmsTemplateGroupUpdateInput({
        fg_no: 8,
        fg_name: " 운영 ",
        fg_member: false,
      }),
    ).toEqual({
      fg_no: 8,
      fg_name: "운영",
      fg_member: 0,
    });

    expect(buildAdminSmsTemplateGroupMoveInput(3, 9)).toEqual({
      fg_no: 3,
      target_fg_no: 9,
    });
  });

  it("builds template filters and payloads", () => {
    expect(buildAdminSmsTemplateListQuery(2, 20, 5, " name ", " 공지 ")).toEqual({
      page: 2,
      per_page: 20,
      fg_no: 5,
      search_field: "name",
      search: "공지",
    });

    expect(
      buildAdminSmsTemplateCreateInput({
        fo_no: null,
        fg_no: " 7 ",
        fo_name: " 가입안내 ",
        fo_content: " 내용 ",
      }),
    ).toEqual({
      fg_no: 7,
      fo_name: "가입안내",
      fo_content: "내용",
    });

    expect(
      buildAdminSmsTemplateUpdateInput({
        fo_no: 4,
        fg_no: "0",
        fo_name: " 수정 ",
        fo_content: " 수정내용 ",
      }),
    ).toEqual({
      fo_no: 4,
      fg_no: 0,
      fo_name: "수정",
      fo_content: "수정내용",
    });
  });

  it("dedupes batch ids", () => {
    expect(buildAdminSmsTemplateBatchInput("move", [9, 3, 9, 2], 11)).toEqual({
      action: "move",
      template_ids: [2, 3, 9],
      target_fg_no: 11,
    });
  });
});
