import { describe, expect, it } from "vitest";
import {
  buildAdminSmsSendInput,
  parseManualTargets,
  parsePositiveIntList,
} from "./admin-sms-messages-form";

describe("admin-sms-messages-form", () => {
  it("parses target lists and manual targets", () => {
    expect(parsePositiveIntList("3, 1, 3\n8")).toEqual([1, 3, 8]);
    expect(parseManualTargets("홍길동,010-1234-5678\n010-9999-0000")).toEqual([
      { name: "홍길동", phone: "01012345678" },
      { name: null, phone: "01099990000" },
    ]);
  });

  it("builds send payload", () => {
    expect(
      buildAdminSmsSendInput({
        template_id: " 7 ",
        message: " ",
        group_ids_csv: "1,3",
        contact_ids_csv: "9",
        member_levels_csv: "2, 4",
        manual_targets_text: "홍길동,010-1234-5678",
        booking_at: " 2026-03-08 16:00 ",
        wr_reply: "02-123-4567",
      }),
    ).toEqual({
      template_id: 7,
      message: null,
      group_ids: [1, 3],
      contact_ids: [9],
      member_levels: [2, 4],
      manual_targets: [{ name: "홍길동", phone: "01012345678" }],
      booking_at: "2026-03-08 16:00",
      wr_reply: "021234567",
    });
  });
});
