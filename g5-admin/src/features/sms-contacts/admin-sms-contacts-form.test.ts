import { describe, expect, it } from "vitest";
import {
  buildAdminSmsContactBatchInput,
  buildAdminSmsContactCreateInput,
  buildAdminSmsContactExportQuery,
  buildAdminSmsContactGroupCreateInput,
  buildAdminSmsContactGroupMoveInput,
  buildAdminSmsContactGroupUpdateInput,
  buildAdminSmsContactImportInputFromText,
  buildAdminSmsContactListQuery,
  buildAdminSmsContactUpdateInput,
  normalizePhoneDigits,
  parseImportContactsText,
} from "./admin-sms-contacts-form";

describe("admin-sms-contacts-form", () => {
  it("builds contact group payloads", () => {
    expect(
      buildAdminSmsContactGroupCreateInput({
        bg_no: null,
        bg_name: " VIP ",
      }),
    ).toEqual({
      bg_name: "VIP",
    });

    expect(
      buildAdminSmsContactGroupUpdateInput({
        bg_no: 4,
        bg_name: " 운영 ",
      }),
    ).toEqual({
      bg_no: 4,
      bg_name: "운영",
    });

    expect(buildAdminSmsContactGroupMoveInput(3, 7)).toEqual({
      bg_no: 3,
      target_bg_no: 7,
    });
  });

  it("normalizes contact payloads and queries", () => {
    expect(
      buildAdminSmsContactListQuery(2, 30, 8, " hp ", " 010 ", true),
    ).toEqual({
      page: 2,
      per_page: 30,
      bg_no: 8,
      search_field: "hp",
      search: "010",
      with_phone_only: true,
    });

    expect(
      buildAdminSmsContactCreateInput({
        bk_no: null,
        bg_no: " 8 ",
        mb_id: " user1 ",
        bk_name: " 홍길동 ",
        bk_hp: "010-1234-5678",
        bk_receipt: true,
        bk_memo: " 테스트 ",
      }),
    ).toEqual({
      bg_no: 8,
      mb_id: "user1",
      bk_name: "홍길동",
      bk_hp: "01012345678",
      bk_receipt: 1,
      bk_memo: "테스트",
    });

    expect(
      buildAdminSmsContactUpdateInput({
        bk_no: 18,
        bg_no: "2",
        mb_id: "",
        bk_name: " 수정 ",
        bk_hp: "010 9999 0000",
        bk_receipt: false,
        bk_memo: "",
      }),
    ).toEqual({
      bk_no: 18,
      bg_no: 2,
      bk_name: "수정",
      bk_hp: "01099990000",
      bk_receipt: 0,
      bk_memo: null,
    });
  });

  it("builds batch, import, export helpers", () => {
    expect(buildAdminSmsContactBatchInput("move", [9, 9, 3], 7)).toEqual({
      action: "move",
      contact_ids: [3, 9],
      target_bg_no: 7,
    });

    expect(parseImportContactsText("홍길동,010-1234-5678\n010-9999-0000")).toEqual([
      { name: "홍길동", phone: "01012345678" },
      { name: "", phone: "01099990000" },
    ]);

    expect(
      buildAdminSmsContactImportInputFromText(
        2,
        true,
        "김철수\t010-1111-2222",
      ),
    ).toEqual({
      bg_no: 2,
      dry_run: true,
      bytes: null,
      file_name: null,
      mime_type: null,
      contacts: [{ name: "김철수", phone: "01011112222" }],
    });

    expect(buildAdminSmsContactExportQuery(" 5 ", true, false)).toEqual({
      bg_no: 5,
      include_no_phone: true,
      with_hyphen: false,
    });
    expect(normalizePhoneDigits("010-2222-3333")).toBe("01022223333");
  });
});
