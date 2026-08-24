import { describe, expect, it } from "vitest";

import {
  buildSmsBatchDetailQuery,
  buildSmsBatchListQuery,
  buildSmsDeliveryListQuery,
  buildSmsResendRequest,
} from "./adminSmsHistoryForm";

describe("adminSmsHistoryForm", () => {
  it("reuses the legacy history filters with bounded pages", () => {
    expect(buildSmsBatchListQuery(0, " 공지 ")).toEqual({ page: 1, per_page: 20, search: "공지" });
    expect(buildSmsBatchDetailQuery(2, 3, "hp", " 010 ")).toEqual({
      wr_renum: 2, page: 3, per_page: 20, search_field: "hp", search: "010",
    });
    expect(buildSmsDeliveryListQuery(2, "bk_no", "")).toEqual({
      page: 2, per_page: 20, search_field: "bk_no",
    });
  });

  it("normalizes explicit resend input", () => {
    expect(buildSmsResendRequest(-1, " 2026-08-24T18:00:00+09:00 ")).toEqual({
      wr_renum: 0,
      booking_at: "2026-08-24T18:00:00+09:00",
    });
  });
});
