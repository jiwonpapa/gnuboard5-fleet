import { describe, expect, it } from "vitest";

import {
  buildSmsMessageRequest,
  emptySmsMessageDraft,
  parseManualTargets,
  parsePositiveIds,
  validateSmsMessageDraft,
} from "./adminSmsMessagesForm";

describe("adminSmsMessagesForm", () => {
  it("reuses the legacy target parsing and phone normalization", () => {
    expect(parsePositiveIds("3, 1\n3, x")).toEqual([1, 3]);
    expect(parseManualTargets("홍길동,010-1234-5678\n02-123-4567")).toEqual([
      { name: "홍길동", phone: "01012345678" },
      { phone: "021234567" },
    ]);
  });

  it("builds a canonical request and requires content plus targets", () => {
    expect(validateSmsMessageDraft(emptySmsMessageDraft)).toContain("메시지");
    const draft = {
      ...emptySmsMessageDraft,
      message: " 운영 공지 ",
      manual_targets: "홍길동,010-1234-5678",
      reply: "02-123-4567",
    };
    expect(validateSmsMessageDraft(draft)).toBeNull();
    expect(buildSmsMessageRequest(draft)).toEqual({
      message: "운영 공지",
      reply: "021234567",
      group_ids: [],
      contact_ids: [],
      member_levels: [],
      manual_targets: [{ name: "홍길동", phone: "01012345678" }],
    });
  });
});
