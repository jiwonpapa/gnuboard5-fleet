import { describe, expect, it } from "vitest";

import {
  buildSmsTemplateBatch,
  buildSmsTemplateGroupInput,
  buildSmsTemplateInput,
  validateSmsTemplateDraft,
  validateSmsTemplateGroupDraft,
} from "./adminSmsTemplatesForm";

describe("adminSmsTemplatesForm", () => {
  it("reuses and normalizes the legacy group and template forms", () => {
    expect(buildSmsTemplateGroupInput({ fg_name: " 공지 ", fg_member: true })).toEqual({
      fg_name: "공지",
      fg_member: 1,
    });
    expect(buildSmsTemplateInput({ fg_no: "0", fo_name: " 가입 ", fo_content: " 환영합니다. " })).toEqual({
      fg_no: 0,
      fo_name: "가입",
      fo_content: "환영합니다.",
    });
    expect(validateSmsTemplateGroupDraft({ fg_name: "", fg_member: false })).toContain("그룹명");
    expect(validateSmsTemplateDraft({ fg_no: "0", fo_name: "", fo_content: "내용" })).toContain("이름");
  });

  it("deduplicates batch targets and preserves the virtual group zero", () => {
    expect(buildSmsTemplateBatch("move", [9, 3, 9, -1], 0)).toEqual({
      action: "move",
      template_ids: [3, 9],
      target_fg_no: 0,
    });
  });
});
