import { describe, expect, it } from "vitest";

import { buildVisitDelete, buildVisitSearchQuery, buildVisitStatsQuery } from "./adminVisitForm";

describe("adminVisitForm", () => {
  it("preserves stats and search defaults with explicit limits", () => {
    expect(buildVisitStatsQuery({ dateFrom: "", dateTo: "", type: "date", limit: "30" })).toEqual({ type: "date", limit: 30 });
    expect(buildVisitSearchQuery({ dateFrom: "2026-08-01", dateTo: "2026-08-20", ip: " 127.0.0.1 ", referer: "", agent: "" }, 2)).toEqual({
      page: 2, per_page: 50, date_from: "2026-08-01", date_to: "2026-08-20", ip: "127.0.0.1",
    });
  });

  it("fails closed for empty, reverse or mixed destructive conditions", () => {
    expect(buildVisitDelete({ before: "", dateFrom: "", dateTo: "", ip: "" })).toBeNull();
    expect(buildVisitDelete({ before: "2026-08-01", dateFrom: "", dateTo: "", ip: "" })).toEqual({ before: "2026-08-01" });
    expect(buildVisitDelete({ before: "2026-08-01", dateFrom: "", dateTo: "", ip: "127.0.0.1" })).toBeNull();
    expect(buildVisitDelete({ before: "", dateFrom: "2026-08-20", dateTo: "2026-08-01", ip: "" })).toBeNull();
  });
});
