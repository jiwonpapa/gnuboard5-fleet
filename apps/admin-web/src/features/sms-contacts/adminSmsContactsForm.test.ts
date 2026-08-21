import { describe, expect, it } from "vitest";

import {
  buildSmsContactBatch,
  buildSmsContactInput,
  parseSmsContactImport,
  validateSmsContactDraft,
} from "./adminSmsContactsForm";

describe("adminSmsContactsForm", () => {
  it("normalizes the reused contact editor contract", () => {
    const draft = { bg_no: "2", bk_name: " 홍길동 ", bk_hp: "010-1234-5678", bk_receipt: true, bk_memo: " 메모 " };
    expect(validateSmsContactDraft(draft)).toBeNull();
    expect(buildSmsContactInput(draft)).toEqual({ bg_no: 2, bk_name: "홍길동", bk_hp: "01012345678", bk_receipt: 1, bk_memo: "메모" });
    expect(validateSmsContactDraft({ ...draft, bk_hp: "123" })).toContain("휴대폰번호");
  });

  it("parses text imports and deduplicates batch targets", () => {
    expect(parseSmsContactImport("홍길동,010-1234-5678\n01099998888")).toEqual([
      { name: "홍길동", phone: "01012345678" },
      { phone: "01099998888" },
    ]);
    expect(buildSmsContactBatch("move", [3, 1, 3, -1], 2)).toEqual({ action: "move", contact_ids: [1, 3], target_bg_no: 2 });
  });
});
