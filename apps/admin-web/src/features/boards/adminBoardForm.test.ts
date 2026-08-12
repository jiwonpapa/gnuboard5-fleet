import { describe, expect, it } from "vitest";

import {
  buildAdminBoardCopy,
  buildAdminBoardCreate,
  buildAdminBoardUpdate,
  parseNewPostIds,
  validateAdminBoardDraft,
} from "./adminBoardForm";

const draft = {
  bo_table: " notice_1 ",
  bo_subject: " 공지 ",
  gr_id: " staff ",
  bo_use_category: true,
  bo_category_list: " 공지|일반 ",
  bo_read_level: "1",
  bo_write_level: "10",
  bo_comment_level: "2",
  bo_download_level: "2",
  bo_use_secret: "0",
  bo_upload_count: "2",
  bo_upload_size: "1048576",
};

describe("admin board form", () => {
  it("normalizes create and changed-field update payloads", () => {
    expect(buildAdminBoardCreate(draft)).toEqual({
      bo_table: "notice_1",
      bo_subject: "공지",
      gr_id: "staff",
      bo_use_category: true,
      bo_category_list: "공지|일반",
      bo_read_level: 1,
      bo_write_level: 10,
      bo_comment_level: 2,
      bo_download_level: 2,
      bo_use_secret: 0,
      bo_upload_count: 2,
      bo_upload_size: 1048576,
    });
    expect(buildAdminBoardUpdate({
      bo_table: "notice_1",
      bo_subject: "공지",
      gr_id: "staff",
      bo_use_category: true,
      bo_category_list: "공지|일반",
      bo_read_level: 1,
      bo_write_level: 10,
      bo_comment_level: 2,
      bo_download_level: 2,
      bo_use_secret: 0,
      bo_upload_count: 2,
      bo_upload_size: 1048576,
      bo_device: null,
      bo_admin: null,
      bo_count_write: 0,
      bo_count_comment: 0,
    }, { ...draft, bo_subject: "변경 공지" })).toEqual({ bo_subject: "변경 공지" });
  });

  it("fails closed on unsafe ids, duplicates and invalid copy targets", () => {
    expect(validateAdminBoardDraft({ ...draft, bo_table: "../notice", bo_write_level: "11" })).toHaveLength(2);
    expect(buildAdminBoardCopy("../copy", "", false)).toBeNull();
    expect(parseNewPostIds("1, 2 3")).toEqual([1, 2, 3]);
    expect(parseNewPostIds("1, 1")).toBeNull();
  });
});
