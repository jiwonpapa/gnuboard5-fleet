import { describe, expect, it } from "vitest";
import {
  buildAdminMailRecipientQuery,
  buildAdminMailSendInput,
  buildAdminMailTemplateCreateInput,
  buildAdminMailTemplateUpdateInput,
  adminMailComposeFormSchema,
  emptyAdminMailComposeFormValues,
} from "./admin-mails-form";

describe("admin-mails-form", () => {
  it("builds template payload with trimmed values", () => {
    expect(
      buildAdminMailTemplateCreateInput({
        ma_subject: "  운영 공지  ",
        ma_content: "  본문  ",
      }),
    ).toEqual({
      ma_subject: "운영 공지",
      ma_content: "본문",
    });
  });

  it("builds template update payload and rejects blank template fields", () => {
    expect(
      buildAdminMailTemplateUpdateInput(7, {
        ma_subject: "  주간 공지  ",
        ma_content: "  본문  ",
      }),
    ).toEqual({
      ma_id: 7,
      ma_subject: "주간 공지",
      ma_content: "본문",
    });

    expect(
      buildAdminMailTemplateCreateInput({
        ma_subject: "   ",
        ma_content: "본문",
      }),
    ).toBeNull();
  });

  it("builds member-target send payload from selected recipients only", () => {
    expect(
      buildAdminMailSendInput(
        {
          ...emptyAdminMailComposeFormValues,
          content: "",
          subject: "",
          target_type: "member",
          use_selected_template: true,
        },
        {
          selectedMemberIds: ["neo", "neo", "admin"],
          selectedTemplateId: 12,
        },
      ),
    ).toEqual({
      ma_id: 12,
      subject: null,
      content: null,
      target_type: "member",
      level_min: null,
      level_max: null,
      gr_id: null,
      member_id_from: null,
      member_id_to: null,
      email_contains: null,
      mb_ids: ["neo", "admin"],
      mailling_only: true,
      dry_run: true,
    });
  });

  it("requires selected recipients for member-target send", () => {
    expect(
      buildAdminMailSendInput(emptyAdminMailComposeFormValues, {
        selectedMemberIds: [],
        selectedTemplateId: 1,
      }),
    ).toBeNull();
  });

  it("requires direct-send fields and group identifiers through validation", () => {
    expect(
      adminMailComposeFormSchema.safeParse({
        ...emptyAdminMailComposeFormValues,
        target_type: "group",
        use_selected_template: false,
        subject: "",
        content: "",
        gr_id: "",
      }).success,
    ).toBe(false);

    expect(
      adminMailComposeFormSchema.safeParse({
        ...emptyAdminMailComposeFormValues,
        target_type: "group",
        use_selected_template: false,
        subject: "공지",
        content: "본문",
        gr_id: "staff",
      }).success,
    ).toBe(true);
  });

  it("keeps only level filters for level preview", () => {
    expect(
      buildAdminMailRecipientQuery(
        {
          ...emptyAdminMailComposeFormValues,
          target_type: "level",
          level_min: "2",
          level_max: "7",
          gr_id: "staff",
          search: "neo",
          email_contains: "@example.com",
        },
        3,
        25,
      ),
    ).toEqual({
      email_contains: "@example.com",
      gr_id: null,
      level_max: 7,
      level_min: 2,
      mailling_only: true,
      member_id_from: null,
      member_id_to: null,
      page: 3,
      per_page: 25,
      search: null,
    });
  });

  it("limits preview filters by target type and supports direct sends", () => {
    expect(
      buildAdminMailRecipientQuery(
        {
          ...emptyAdminMailComposeFormValues,
          target_type: "group",
          gr_id: " staff ",
          email_contains: " notice@example.com ",
          search: "ignored",
        },
        1,
        10,
      ),
    ).toEqual({
      email_contains: "notice@example.com",
      gr_id: "staff",
      level_max: null,
      level_min: null,
      mailling_only: true,
      member_id_from: null,
      member_id_to: null,
      page: 1,
      per_page: 10,
      search: null,
    });

    expect(
      buildAdminMailSendInput(
        {
          ...emptyAdminMailComposeFormValues,
          target_type: "group",
          use_selected_template: false,
          subject: "  직접 제목  ",
          content: "  직접 본문  ",
          gr_id: " staff ",
          member_id_from: " legacy-start ",
          member_id_to: " legacy-end ",
          email_contains: " user@example.com ",
          dry_run: false,
        },
        {
          selectedMemberIds: ["neo"],
          selectedTemplateId: null,
        },
      ),
    ).toEqual({
      ma_id: null,
      subject: "직접 제목",
      content: "직접 본문",
      target_type: "group",
      level_min: null,
      level_max: null,
      gr_id: "staff",
      member_id_from: "legacy-start",
      member_id_to: "legacy-end",
      email_contains: "user@example.com",
      mb_ids: [],
      mailling_only: true,
      dry_run: false,
    });

    expect(
      buildAdminMailSendInput(
        {
          ...emptyAdminMailComposeFormValues,
          target_type: "group",
          use_selected_template: true,
          gr_id: "   ",
        },
        {
          selectedMemberIds: [],
          selectedTemplateId: 1,
        },
      ),
    ).toBeNull();
  });
});
