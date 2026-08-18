import { describe, expect, it } from "vitest";

import type { AdminFaqItem, AdminFaqMasterDetail } from "../../api/fleet";
import {
  buildAdminFaqCreate,
  buildAdminFaqMasterCreate,
  buildAdminFaqMasterUpdate,
  buildAdminFaqUpdate,
  validateAdminFaqDraft,
  validateAdminFaqMasterDraft,
} from "./adminFaqForm";

const image = {
  exists: false,
  relative_path: "",
  url: "",
  width: null,
  height: null,
  mime: null,
  size: null,
};

describe("admin FAQ form", () => {
  it("preserves empty PC and mobile HTML while normalizing the master", () => {
    const draft = {
      fm_subject: "  자주 묻는 질문  ",
      fm_order: "10",
      fm_head_html: "",
      fm_tail_html: "<footer>PC</footer>",
      fm_mobile_head_html: "",
      fm_mobile_tail_html: "",
    };
    expect(buildAdminFaqMasterCreate(draft)).toEqual({
      fm_subject: "자주 묻는 질문",
      fm_order: 10,
      fm_head_html: "",
      fm_tail_html: "<footer>PC</footer>",
      fm_mobile_head_html: "",
      fm_mobile_tail_html: "",
    });
    const original: AdminFaqMasterDetail = {
      fm_id: 7,
      faq_count: 1,
      header_image: image,
      footer_image: image,
      fm_subject: "자주 묻는 질문",
      fm_order: 10,
      fm_head_html: "",
      fm_tail_html: "<footer>PC</footer>",
      fm_mobile_head_html: "",
      fm_mobile_tail_html: "",
    };
    expect(buildAdminFaqMasterUpdate(original, { ...draft, fm_subject: "이용 안내" }))
      .toEqual({ fm_subject: "이용 안내" });
  });

  it("builds FAQ changed fields and rejects invalid identifiers", () => {
    const draft = { fm_id: "7", fa_subject: "  배송은?  ", fa_content: "답변", fa_order: "2" };
    expect(buildAdminFaqCreate(draft)).toEqual({
      fm_id: 7,
      fa_subject: "배송은?",
      fa_content: "답변",
      fa_order: 2,
    });
    const original: AdminFaqItem = {
      fa_id: 3,
      fm_subject: "이용 안내",
      fm_id: 7,
      fa_subject: "배송은?",
      fa_content: "답변",
      fa_order: 2,
    };
    expect(buildAdminFaqUpdate(original, { ...draft, fa_content: "변경 답변" }))
      .toEqual({ fa_content: "변경 답변" });
    expect(validateAdminFaqMasterDraft({
      fm_subject: " ", fm_order: "x", fm_head_html: "", fm_tail_html: "",
      fm_mobile_head_html: "", fm_mobile_tail_html: "",
    })).toHaveLength(2);
    expect(validateAdminFaqDraft({ fm_id: "0", fa_subject: " ", fa_content: "", fa_order: "x" }))
      .toHaveLength(4);
  });
});
