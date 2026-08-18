import { describe, expect, it } from "vitest";

import type { AdminPopup } from "../../api/fleet";
import { buildAdminPopupCreate, buildAdminPopupUpdate, emptyAdminPopupForm } from "./adminPopupForm";

const popup: AdminPopup = {
  nw_id: 7, nw_division: "both", nw_device: "both",
  nw_begin_time: null, nw_end_time: null, nw_disable_hours: 24,
  nw_left: 100, nw_top: 100, nw_height: 400, nw_width: 600,
  nw_subject: "공지", nw_content: "본문", nw_content_html: 0,
};

describe("adminPopupForm", () => {
  it("preserves the legacy defaults and rejects invalid required fields", () => {
    expect(buildAdminPopupCreate({ ...emptyAdminPopupForm, nw_subject: "공지", nw_content: "본문" })).toMatchObject({
      nw_division: "both", nw_device: "both", nw_disable_hours: 24,
      nw_left: 100, nw_top: 100, nw_height: 400, nw_width: 600,
    });
    expect(buildAdminPopupCreate({ ...emptyAdminPopupForm, nw_subject: "공지", nw_content: "" })).toBeNull();
    expect(buildAdminPopupCreate({ ...emptyAdminPopupForm, nw_subject: "공지", nw_content: "본문", nw_width: "-1" })).toBeNull();
  });

  it("builds only changed fields for an update", () => {
    expect(buildAdminPopupUpdate(popup, {
      ...emptyAdminPopupForm, nw_subject: "공지", nw_content: "본문", nw_device: "mobile",
    })).toEqual({ nw_device: "mobile" });
  });
});
