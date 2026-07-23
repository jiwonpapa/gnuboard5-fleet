import { describe, expect, it } from "vitest";
import {
  buildAdminContentCreateInput,
  buildAdminContentListQuery,
  buildAdminContentUpdateInput,
} from "./admin-contents-form";

describe("admin-contents-form", () => {
  it("trims list search", () => {
    expect(buildAdminContentListQuery("  안내  ", 2, 20)).toEqual({
      page: 2,
      per_page: 20,
      search: "안내",
    });
  });

  it("builds create payload", () => {
    expect(
      buildAdminContentCreateInput({
        co_id: " about_us ",
        co_subject: " 회사 소개 ",
        co_html: true,
        co_content: " <p>hello</p> ",
        co_mobile_content: " mobile ",
        co_include_head: " ./head.php ",
        co_include_tail: " ./tail.php ",
        co_tag_filter_use: true,
        co_skin: " basic ",
        co_mobile_skin: " mobile ",
      }),
    ).toEqual({
      co_id: "about_us",
      co_subject: "회사 소개",
      co_html: 1,
      co_content: "<p>hello</p>",
      co_mobile_content: "mobile",
      co_include_head: "./head.php",
      co_include_tail: "./tail.php",
      co_tag_filter_use: 1,
      co_skin: "basic",
      co_mobile_skin: "mobile",
    });
  });

  it("builds update payload with nullable mobile content", () => {
    expect(
      buildAdminContentUpdateInput({
        co_id: "policy",
        co_subject: " 이용약관 ",
        co_html: false,
        co_content: " text ",
        co_mobile_content: "   ",
        co_include_head: " ",
        co_include_tail: "./tail.php",
        co_tag_filter_use: false,
        co_skin: "basic",
        co_mobile_skin: "mobile",
      }),
    ).toEqual({
      co_id: "policy",
      co_subject: "이용약관",
      co_html: 0,
      co_content: "text",
      co_mobile_content: null,
      co_include_head: null,
      co_include_tail: "./tail.php",
      co_tag_filter_use: 0,
      co_skin: "basic",
      co_mobile_skin: "mobile",
    });
  });
});
