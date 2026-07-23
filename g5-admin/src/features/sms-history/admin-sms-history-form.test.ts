import { describe, expect, it } from "vitest";
import {
  buildAdminSmsBatchResendInput,
  buildAdminSmsDeliveryListQuery,
  buildAdminSmsMessageBatchDetailQuery,
  buildAdminSmsMessageBatchListQuery,
} from "./admin-sms-history-form";

describe("admin-sms-history-form", () => {
  it("builds batch and delivery queries", () => {
    expect(buildAdminSmsMessageBatchListQuery(2, 30, " 가입 ")).toEqual({
      page: 2,
      per_page: 30,
      search: "가입",
    });

    expect(
      buildAdminSmsMessageBatchDetailQuery(11, 2, 3, 15, " hp ", " 010 "),
    ).toEqual({
      wr_no: 11,
      wr_renum: 2,
      page: 3,
      per_page: 15,
      search_field: "hp",
      search: "010",
    });

    expect(buildAdminSmsDeliveryListQuery(1, 20, " bk_no ", " 17 ")).toEqual({
      page: 1,
      per_page: 20,
      search_field: "bk_no",
      search: "17",
    });
  });

  it("builds resend payload", () => {
    expect(buildAdminSmsBatchResendInput(8, 1, " 2026-03-08 13:40 ")).toEqual({
      wr_no: 8,
      wr_renum: 1,
      booking_at: "2026-03-08 13:40",
    });
  });
});
