import { describe, expect, it } from "vitest";

import { buildAdminWriteCountQuery } from "./adminWriteCountForm";

describe("adminWriteCountForm", () => {
  it("preserves the legacy period, date and board filters", () => {
    expect(buildAdminWriteCountQuery({
      period: "week",
      dateFrom: " 2026-08-01 ",
      dateTo: " 2026-08-21 ",
      boardTable: " notice ",
    })).toEqual({
      period: "week",
      date_from: "2026-08-01",
      date_to: "2026-08-21",
      bo_table: "notice",
    });
  });

  it("omits blank filters and rejects unsafe ranges and tables", () => {
    expect(buildAdminWriteCountQuery({
      period: "day", dateFrom: "", dateTo: "", boardTable: "",
    })).toEqual({ period: "day" });
    expect(buildAdminWriteCountQuery({
      period: "day", dateFrom: "2026-08-21", dateTo: "2026-08-01", boardTable: "",
    })).toBeNull();
    expect(buildAdminWriteCountQuery({
      period: "day", dateFrom: "", dateTo: "", boardTable: "notice;drop",
    })).toBeNull();
  });
});
