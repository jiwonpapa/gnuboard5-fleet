import { describe, expect, it } from "vitest";

import {
  buildAdminPushRequest,
  emptyAdminPushDraft,
  parsePushMemberIds,
  validateAdminPushDraft,
} from "./adminPushForm";

describe("adminPushForm", () => {
  it("normalizes and deduplicates member targets", () => {
    expect(parsePushMemberIds("member-a, member-b\nmember-a")).toEqual([
      "member-a",
      "member-b",
    ]);
    expect(buildAdminPushRequest({
      ...emptyAdminPushDraft,
      title: " 운영 공지 ",
      body: " 점검 안내 ",
      memberIds: "member-a, member-a",
    })).toEqual({
      title: "운영 공지",
      body: "점검 안내",
      type: "manual",
      member_ids: ["member-a"],
    });
  });

  it("requires content and exactly one selected target mode", () => {
    expect(validateAdminPushDraft(emptyAdminPushDraft)).toBe("제목을 입력해 주세요.");
    expect(validateAdminPushDraft({
      ...emptyAdminPushDraft,
      title: "공지",
      body: "본문",
      targetMode: "all",
    })).toBe("");
    expect(buildAdminPushRequest({
      ...emptyAdminPushDraft,
      title: "공지",
      body: "본문",
      targetMode: "all",
    })).toEqual({ title: "공지", body: "본문", type: "manual", target: "all" });
  });
});
