import { describe, expect, it } from "vitest";
import {
  boardFormSchema,
  buildBoardCreateInput,
  buildBoardUpdateInput,
  emptyBoardFormValues,
  toBoardFormValues,
} from "./admin-boards-form";
import type { AdminBoard } from "../../types/AdminBoard";

const baseline: AdminBoard = {
  bo_category_list: "공지,자유",
  bo_comment_level: 1,
  bo_count_comment: 12,
  bo_count_write: 34,
  bo_download_level: 2,
  bo_read_level: 1,
  bo_subject: "자유게시판",
  bo_table: "free",
  bo_upload_count: 2,
  bo_upload_size: 2048,
  bo_use_category: 1,
  bo_use_secret: 0,
  bo_write_level: 2,
  extra: {
    bo_admin: "admin1",
    bo_use_good: "1",
  },
  gr_id: "community",
};

describe("admin-boards-form", () => {
  it("builds create payload from form values", () => {
    expect(
      buildBoardCreateInput({
        bo_category_list: "공지,자유",
        bo_comment_level: "1",
        bo_download_level: "2",
        bo_read_level: "1",
        bo_subject: "자유게시판",
        bo_table: "free",
        bo_upload_count: "2",
        bo_upload_size: "2048",
        bo_use_category: true,
        bo_use_secret: false,
        bo_write_level: "2",
        extraFlags: {
          ...emptyBoardFormValues().extraFlags,
          bo_use_captcha: false,
          bo_use_cert: false,
          bo_use_dhtml_editor: false,
          bo_use_email: false,
          bo_use_file_content: false,
          bo_use_good: true,
          bo_use_nogood: false,
          bo_use_ip_view: false,
          bo_use_list_content: false,
          bo_use_list_file: false,
          bo_use_list_view: false,
          bo_use_name: false,
          bo_use_rss_view: false,
          bo_use_search: false,
          bo_use_sideview: false,
          bo_use_signature: false,
          bo_use_sns: false,
        },
        extraTexts: {
          ...emptyBoardFormValues().extraTexts,
          bo_admin: "admin1",
          bo_device: "",
          bo_write_point: "",
          bo_comment_point: "",
          bo_read_point: "",
          bo_download_point: "",
          bo_gallery_cols: "",
          bo_gallery_width: "",
          bo_gallery_height: "",
          bo_mobile_gallery_width: "",
          bo_mobile_gallery_height: "",
          bo_image_width: "",
          bo_page_rows: "",
          bo_mobile_page_rows: "",
          bo_subject_len: "",
          bo_mobile_subject_len: "",
          bo_table_width: "",
          bo_mobile_subject: "",
          bo_write_min: "",
          bo_write_max: "",
          bo_comment_min: "",
          bo_comment_max: "",
          bo_count_delete: "",
          bo_count_modify: "",
          bo_hot: "",
          bo_new: "",
          bo_order: "",
          bo_include_head: "",
          bo_include_tail: "",
          bo_insert_content: "",
          bo_sort_field: "",
          bo_reply_order: "",
          bo_select_editor: "",
        },
        gr_id: "community",
      }),
    ).toEqual({
      bo_category_list: "공지,자유",
      bo_comment_level: 1,
      bo_download_level: 2,
      bo_read_level: 1,
      bo_subject: "자유게시판",
      bo_table: "free",
      bo_upload_count: 2,
      bo_upload_size: 2048,
      bo_use_category: 1,
      bo_use_secret: 0,
      bo_write_level: 2,
      extra: {
        bo_admin: "admin1",
        bo_use_good: "1",
      },
      gr_id: "community",
    });
  });

  it("builds sparse update payload", () => {
    const next = toBoardFormValues(baseline);
    next.bo_subject = "공지게시판";
    next.bo_use_secret = true;

    expect(buildBoardUpdateInput(baseline, next)).toEqual({
      bo_category_list: null,
      bo_comment_level: null,
      bo_download_level: null,
      bo_read_level: null,
      bo_subject: "공지게시판",
      bo_table: "free",
      bo_upload_count: null,
      bo_upload_size: null,
      bo_use_category: null,
      bo_use_secret: 1,
      bo_write_level: null,
      extra: {},
      gr_id: null,
    });
  });

  it("rejects invalid board code with zod", () => {
    expect(
      boardFormSchema.safeParse({
        ...toBoardFormValues(baseline),
        bo_table: "bad-table",
      }).success,
    ).toBe(false);
  });
});
