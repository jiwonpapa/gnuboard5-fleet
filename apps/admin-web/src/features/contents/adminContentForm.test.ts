import { describe, expect, it } from "vitest";

import type { AdminContent } from "../../api/fleet";
import {
  buildAdminContentCreate,
  buildAdminContentUpdate,
  validateAdminContentDraft,
} from "./adminContentForm";

const draft = {
  co_id: " company ",
  co_subject: " 회사 소개 ",
  co_html: "2" as const,
  co_content: " <p>company</p> ",
  co_mobile_content: "mobile",
  co_include_head: " ./head.php ",
  co_include_tail: "",
  co_tag_filter_use: true,
  co_skin: " basic ",
  co_mobile_skin: "mobile",
};

describe("admin content form", () => {
  it("preserves canonical HTML mode and normalizes create payload", () => {
    expect(buildAdminContentCreate(draft)).toEqual({
      co_id: "company",
      co_subject: "회사 소개",
      co_html: 2,
      co_content: "<p>company</p>",
      co_mobile_content: "mobile",
      co_include_head: "./head.php",
      co_include_tail: "",
      co_tag_filter_use: 1,
      co_skin: "basic",
      co_mobile_skin: "mobile",
    });
  });

  it("builds changed fields only and fails closed on invalid required fields", () => {
    const content = buildAdminContentCreate(draft) as AdminContent;
    expect(buildAdminContentUpdate(content, { ...draft, co_subject: "회사 안내" }))
      .toEqual({ co_subject: "회사 안내" });
    expect(validateAdminContentDraft({
      ...draft,
      co_id: "../company",
      co_subject: " ",
      co_content: "",
    })).toHaveLength(3);
  });
});
