import { describe, expect, it } from "vitest";
import {
  buildQaConfigUpdateInput,
  qaConfigFormSchema,
  toQaConfigFormValues,
} from "./admin-qa-config-form";
import type { AdminQaConfig } from "../../types/AdminQaConfig";

const baseline: AdminQaConfig = {
  qa_id: 1,
  qa_title: "문의",
  qa_category: "회원,결제",
  qa_skin: "basic",
  qa_mobile_skin: "basic",
  qa_use_email: "1",
  qa_req_email: "0",
  qa_use_hp: "1",
  qa_req_hp: "0",
  qa_use_sms: "1",
  qa_send_number: "0212345678",
  qa_admin_hp: "01012345678",
  qa_admin_email: "qa@example.com",
  qa_use_editor: "1",
  qa_subject_len: "40",
  qa_mobile_subject_len: "30",
  qa_page_rows: "15",
  qa_mobile_page_rows: "10",
  qa_image_width: "800",
  qa_upload_size: "2048",
  qa_insert_content: "기본 본문",
  qa_include_head: "./head.php",
  qa_include_tail: "./tail.php",
  qa_content_head: "<p>head</p>",
  qa_content_tail: "<p>tail</p>",
  qa_mobile_content_head: "<p>m-head</p>",
  qa_mobile_content_tail: "<p>m-tail</p>",
};

describe("admin-qa-config-form", () => {
  it("hydrates API config into form values", () => {
    expect(toQaConfigFormValues(baseline).qa_title).toBe("문의");
  });

  it("builds diff-only update payload", () => {
    const next = toQaConfigFormValues(baseline);
    next.qa_title = "새 문의";
    next.qa_page_rows = "20";

    expect(buildQaConfigUpdateInput(baseline, next)).toEqual({
      qa_admin_email: null,
      qa_admin_hp: null,
      qa_category: null,
      qa_content_head: null,
      qa_content_tail: null,
      qa_image_width: null,
      qa_include_head: null,
      qa_include_tail: null,
      qa_insert_content: null,
      qa_mobile_content_head: null,
      qa_mobile_content_tail: null,
      qa_mobile_page_rows: null,
      qa_mobile_skin: null,
      qa_mobile_subject_len: null,
      qa_page_rows: "20",
      qa_req_email: null,
      qa_req_hp: null,
      qa_send_number: null,
      qa_skin: null,
      qa_subject_len: null,
      qa_title: "새 문의",
      qa_upload_size: null,
      qa_use_editor: null,
      qa_use_email: null,
      qa_use_hp: null,
      qa_use_sms: null,
    });
  });

  it("guards numeric fields with zod", () => {
    const next = toQaConfigFormValues(baseline);
    next.qa_page_rows = "abc";

    expect(qaConfigFormSchema.safeParse(next).success).toBe(false);
  });
});
