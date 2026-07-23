import { describe, expect, it } from "vitest";
import {
  buildAdminFaqCreateInput,
  buildAdminFaqListQuery,
  buildAdminFaqMasterCreateInput,
  buildAdminFaqMasterUpdateInput,
  buildAdminFaqUpdateInput,
} from "./admin-faqs-form";

describe("admin-faqs-form", () => {
  it("builds master create payload", () => {
    expect(
      buildAdminFaqMasterCreateInput({
        fm_id: 0,
        fm_subject: " 안내 ",
        fm_order: " 7 ",
        fm_head_html: " <h1>head</h1> ",
        fm_tail_html: " ",
        fm_mobile_head_html: "",
        fm_mobile_tail_html: " mobile ",
      }),
    ).toEqual({
      fm_subject: "안내",
      fm_order: 7,
      fm_head_html: "<h1>head</h1>",
      fm_tail_html: null,
      fm_mobile_head_html: null,
      fm_mobile_tail_html: "mobile",
    });
  });

  it("builds master update payload", () => {
    expect(
      buildAdminFaqMasterUpdateInput({
        fm_id: 3,
        fm_subject: " 수정 ",
        fm_order: "",
        fm_head_html: "",
        fm_tail_html: "",
        fm_mobile_head_html: "",
        fm_mobile_tail_html: "",
      }),
    ).toEqual({
      fm_id: 3,
      fm_subject: "수정",
      fm_order: 0,
      fm_head_html: null,
      fm_tail_html: null,
      fm_mobile_head_html: null,
      fm_mobile_tail_html: null,
    });
  });

  it("builds faq queries and payloads", () => {
    expect(buildAdminFaqListQuery(8, 2, 20)).toEqual({
      fm_id: 8,
      page: 2,
      per_page: 20,
    });
    expect(
      buildAdminFaqCreateInput({
        fa_id: 0,
        fm_id: " 8 ",
        fa_subject: " 질문 ",
        fa_order: " 5 ",
        fa_content: " 답변 ",
      }),
    ).toEqual({
      fm_id: 8,
      fa_subject: "질문",
      fa_order: 5,
      fa_content: "답변",
    });
    expect(
      buildAdminFaqUpdateInput({
        fa_id: 11,
        fm_id: "8",
        fa_subject: " 수정질문 ",
        fa_order: "",
        fa_content: " 수정답변 ",
      }),
    ).toEqual({
      fa_id: 11,
      fm_id: 8,
      fa_subject: "수정질문",
      fa_order: 0,
      fa_content: "수정답변",
    });
  });
});
