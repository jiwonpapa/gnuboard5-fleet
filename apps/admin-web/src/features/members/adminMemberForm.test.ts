import { describe, expect, it } from "vitest";

import {
  buildAdminMemberUpdate,
  memberToDraft,
  membersToCsv,
  validateAdminMemberDraft,
} from "./adminMemberForm";

const member = {
  mb_id: "member01",
  mb_name: "회원",
  mb_nick: "닉네임",
  mb_email: "member@example.test",
  mb_level: 2,
  mb_point: 100,
  mb_mailling: 1,
};

describe("admin member form", () => {
  it("builds changed fields only and keeps password write-only", () => {
    const draft = memberToDraft(member);
    expect(buildAdminMemberUpdate(member, draft)).toBeNull();
    draft.mb_nick = "새 닉네임";
    draft.mb_password = "new-password";
    expect(buildAdminMemberUpdate(member, draft)).toEqual({
      mb_nick: "새 닉네임",
      mb_password: "new-password",
    });
  });

  it("validates dates and exports spreadsheet-safe CSV", () => {
    const draft = memberToDraft(member);
    draft.mb_leave_date = "2026-08-12";
    expect(validateAdminMemberDraft(draft)).toContain("탈퇴일은 YYYYMMDD 형식이어야 합니다.");
    expect(membersToCsv([member])).toContain('"member@example.test"');
  });
});
