import { describe, expect, it } from "vitest";
import {
  buildPopupCreateInput,
  buildPopupUpdateInput,
  popupFormSchema,
  toPopupFormValues,
} from "./admin-popups-form";
import type { AdminPopup } from "../../types/AdminPopup";

const baseline: AdminPopup = {
  nw_begin_time: "2026-03-07 09:00:00",
  nw_content: "<p>본문</p>",
  nw_content_html: 1,
  nw_device: "both",
  nw_disable_hours: 24,
  nw_division: "both",
  nw_end_time: "2026-03-31 23:59:59",
  nw_height: 480,
  nw_id: 9,
  nw_left: 120,
  nw_subject: "봄맞이 공지",
  nw_top: 160,
  nw_width: 640,
};

describe("admin-popups-form", () => {
  it("builds create payload", () => {
    expect(
      buildPopupCreateInput({
        nw_begin_time: "2026-03-07 09:00:00",
        nw_content: "<p>본문</p>",
        nw_content_html: true,
        nw_device: "both",
        nw_disable_hours: "24",
        nw_division: "both",
        nw_end_time: "2026-03-31 23:59:59",
        nw_height: "480",
        nw_left: "120",
        nw_subject: "봄맞이 공지",
        nw_top: "160",
        nw_width: "640",
      }),
    ).toEqual({
      nw_begin_time: "2026-03-07 09:00:00",
      nw_content: "<p>본문</p>",
      nw_content_html: 1,
      nw_device: "both",
      nw_disable_hours: 24,
      nw_division: "both",
      nw_end_time: "2026-03-31 23:59:59",
      nw_height: 480,
      nw_left: 120,
      nw_subject: "봄맞이 공지",
      nw_top: 160,
      nw_width: 640,
    });
  });

  it("builds sparse update payload", () => {
    const next = toPopupFormValues(baseline);
    next.nw_device = "mobile";
    next.nw_width = "720";

    expect(buildPopupUpdateInput(baseline, next)).toEqual({
      nw_begin_time: null,
      nw_content: null,
      nw_content_html: null,
      nw_device: "mobile",
      nw_disable_hours: null,
      nw_division: null,
      nw_end_time: null,
      nw_height: null,
      nw_id: 9,
      nw_left: null,
      nw_subject: null,
      nw_top: null,
      nw_width: 720,
    });
  });

  it("rejects an unsupported device through zod", () => {
    expect(
      popupFormSchema.safeParse({
        ...toPopupFormValues(baseline),
        nw_device: "tablet",
      }).success,
    ).toBe(false);
  });
});
