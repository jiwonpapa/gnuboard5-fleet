import { describe, expect, it } from "vitest";

import {
  buildAdminMailRecipientQuery,
  buildAdminMailSend,
  buildAdminMailTemplate,
  emptyAdminMailRecipient,
  emptyAdminMailSend,
} from "./adminMailsForm";

describe("adminMailsForm", () => {
  it("trims reusable template fields", () => {
    expect(buildAdminMailTemplate({ subject: "  안내 ", content: " 본문 " })).toEqual({ ma_subject: "안내", ma_content: "본문" });
    expect(buildAdminMailTemplate({ subject: " ", content: "본문" })).toBeNull();
  });

  it("validates recipient range and identifiers", () => {
    expect(buildAdminMailRecipientQuery({ ...emptyAdminMailRecipient, levelMin: "8", levelMax: "3" })).toBeNull();
    expect(buildAdminMailRecipientQuery({ ...emptyAdminMailRecipient, groupId: "invalid-id" })).toBeNull();
    expect(buildAdminMailRecipientQuery({ ...emptyAdminMailRecipient, search: " 김 ", levelMin: "2", levelMax: "7", groupId: "shop_1" })).toEqual(expect.objectContaining({ search: "김", level_min: 2, level_max: 7, gr_id: "shop_1", mailling_only: true }));
  });

  it("keeps delivery dry-run by default and deduplicates exact members", () => {
    expect(buildAdminMailSend({ ...emptyAdminMailSend, templateId: "12", memberIds: "alpha, beta alpha" })).toEqual(expect.objectContaining({ ma_id: 12, target_type: "member", mb_ids: ["alpha", "beta"], mailling_only: true, dry_run: true }));
    expect(buildAdminMailSend({ ...emptyAdminMailSend, templateId: "12", memberIds: "bad-id" })).toBeNull();
    expect(buildAdminMailSend({ ...emptyAdminMailSend, targetType: "all", subject: " 제목 ", content: " 본문 " })).toEqual(expect.objectContaining({ subject: "제목", content: "본문", target_type: "all", dry_run: true }));
  });
});
