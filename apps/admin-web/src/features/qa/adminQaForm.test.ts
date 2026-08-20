import { describe, expect, it } from "vitest";

import type { AdminQaConfig } from "../../api/fleet";
import { buildQaConfigUpdate, parseQaIds, toQaConfigDraft } from "./adminQaForm";

const baseline = {
  qa_id: 1,
  qa_title: "1:1 문의",
  qa_category: "회원,결제",
  qa_skin: "basic",
  qa_mobile_skin: "basic",
  qa_use_email: "1",
  qa_req_email: "0",
  qa_use_hp: "1",
  qa_req_hp: "0",
  qa_use_sms: "0",
  qa_send_number: "",
  qa_admin_hp: "",
  qa_admin_email: "admin@example.test",
  qa_use_editor: "1",
  qa_subject_len: "40",
  qa_mobile_subject_len: "30",
  qa_page_rows: "15",
  qa_mobile_page_rows: "10",
  qa_image_width: "800",
  qa_upload_size: "1048576",
  qa_insert_content: "문의 내용을 입력하십시오.",
  qa_include_head: "",
  qa_include_tail: "",
  qa_content_head: "",
  qa_content_tail: "",
  qa_mobile_content_head: "",
  qa_mobile_content_tail: "",
  qa_1_subj: "추가 항목 1",
  qa_2_subj: "",
  qa_3_subj: "",
  qa_4_subj: "",
  qa_5_subj: "",
  qa_1: "",
  qa_2: "",
  qa_3: "",
  qa_4: "",
  qa_5: "",
} satisfies AdminQaConfig;

describe("adminQaForm", () => {
  it("hydrates all canonical fields and creates a diff-only update", () => {
    const draft = toQaConfigDraft(baseline);
    draft.qa_title = "Fleet 문의";
    draft.qa_5_subj = "주문 번호";
    expect(buildQaConfigUpdate(baseline, draft)).toEqual({
      qa_title: "Fleet 문의",
      qa_5_subj: "주문 번호",
    });
  });

  it("rejects invalid numeric values and oversized text", () => {
    const numeric = toQaConfigDraft(baseline);
    numeric.qa_page_rows = "15 rows";
    expect(buildQaConfigUpdate(baseline, numeric)).toBeNull();
    const oversized = toQaConfigDraft(baseline);
    oversized.qa_insert_content = "x".repeat(65_536);
    expect(buildQaConfigUpdate(baseline, oversized)).toBeNull();
  });

  it("parses unique positive QA ids and rejects unsafe input", () => {
    expect(parseQaIds("71, 72\n73")).toEqual([71, 72, 73]);
    expect(parseQaIds("71, 71")).toBeNull();
    expect(parseQaIds("0")).toBeNull();
    expect(parseQaIds("")).toBeNull();
  });
});
