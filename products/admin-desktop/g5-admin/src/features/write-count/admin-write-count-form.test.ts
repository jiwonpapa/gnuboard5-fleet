import { describe, expect, it } from "vitest";
import { buildAdminWriteCountStatsQuery } from "./admin-write-count-form";

describe("admin-write-count-form", () => {
  it("normalizes filter values", () => {
    expect(
      buildAdminWriteCountStatsQuery({
        period: "week",
        date_from: " 2026-03-01 ",
        date_to: " 2026-03-08 ",
        bo_table: " notice ",
      }),
    ).toEqual({
      period: "week",
      date_from: "2026-03-01",
      date_to: "2026-03-08",
      bo_table: "notice",
    });
  });
});
